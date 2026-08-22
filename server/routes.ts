import fs from "node:fs/promises";
import multer from "multer";
import type { Express, NextFunction, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ensureProductionAdminUser, requireAuth, setupAuth } from "./auth";
import { insertLandlordSchema, insertStoreSchema, insertTenantSchema, insertPaymentSchema, insertDocumentSchema, insertSettingSchema, insertExpenseSchema } from "@shared/schema";
import { getRuntimeConfig } from "./config";
import { documentPathFromStorageKey, getDocumentUploadRoot, safeDocumentSize, uploadTenantDocument, validateDocumentSignature } from "./document-files";

const inactivePaymentStatuses = new Set(["corrected", "reversal"]);

function commercialScopeNotAvailable(res: Response) {
  return res.status(410).json({ error: "This legacy tax workflow is outside the LeaseDesk commercial scope." });
}

function activePayments<T extends { status?: string }>(payments: T[]) {
  return payments.filter((payment) => !inactivePaymentStatuses.has(payment.status ?? "posted"));
}

function parseNonNegativeFinite(value: unknown, fieldName: string) {
  const parsed = Number.parseFloat(String(value ?? "0"));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a finite non-negative amount.`);
  }
  return parsed;
}

function buildPaymentData(body: Record<string, unknown>, current?: Record<string, unknown>) {
  const rentAmount = parseNonNegativeFinite(body.rentAmount ?? current?.rentAmount, "Rent amount");
  const utilitiesAmount = parseNonNegativeFinite(body.utilitiesAmount ?? current?.utilitiesAmount, "Utilities amount");
  const paymentAmount = parseNonNegativeFinite(body.paymentAmount ?? current?.paymentAmount, "Payment amount");
  const totalAmountDue = rentAmount + utilitiesAmount;
  const balance = totalAmountDue - paymentAmount;

  return {
    ...current,
    ...body,
    rentAmount: rentAmount.toString(),
    utilitiesAmount: utilitiesAmount.toString(),
    paymentAmount: paymentAmount.toString(),
    totalAmountDue: totalAmountDue.toString(),
    tdsAmount: "0",
    landlordAmount: paymentAmount.toString(),
    balance: balance.toString(),
    tdsPaidToMRA: false,
    status: "posted",
    correctionOfPaymentId: null,
  };
}

async function recordAuditEvent(
  req: Request,
  event: { eventType: string; entityType: string; entityId: string; detail?: string },
) {
  await storage.createAuditEvent({
    ...event,
    userId: req.session.userId ?? null,
    detail: event.detail ?? null,
  });
}

function runTenantDocumentUpload(req: Request, res: Response, next: NextFunction) {
  uploadTenantDocument(req, res, async (error) => {
    if (!error) {
      return next();
    }

    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Document must be 10MB or less." });
    }

    return res.status(400).json({ error: error.message || "Invalid document upload." });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app, storage);
  await ensureProductionAdminUser(storage);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", mode: getRuntimeConfig().mode });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await storage.getLandlords();
      if (getRuntimeConfig().isProductionMode) {
        await fs.access(getDocumentUploadRoot());
      }
      res.json({ status: "ready", mode: getRuntimeConfig().mode });
    } catch (error) {
      res.status(503).json({ status: "not_ready" });
    }
  });

  app.use("/api", requireAuth);

  // ====== LANDLORDS ROUTES ======
  app.get("/api/landlords", async (req, res) => {
    try {
      const landlords = await storage.getLandlords();
      res.json(landlords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch landlords" });
    }
  });

  app.get("/api/landlords/:id", async (req, res) => {
    try {
      const landlord = await storage.getLandlord(req.params.id);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }
      res.json(landlord);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch landlord" });
    }
  });

  app.post("/api/landlords", async (req, res) => {
    try {
      const validatedData = insertLandlordSchema.parse(req.body);
      const landlord = await storage.createLandlord(validatedData);
      res.status(201).json(landlord);
    } catch (error) {
      res.status(400).json({ error: "Invalid landlord data" });
    }
  });

  app.patch("/api/landlords/:id", async (req, res) => {
    try {
      const validatedData = insertLandlordSchema.partial().parse(req.body);
      const landlord = await storage.updateLandlord(req.params.id, validatedData);
      res.json(landlord);
    } catch (error) {
      res.status(400).json({ error: "Failed to update landlord" });
    }
  });

  app.delete("/api/landlords/:id", async (req, res) => {
    res.status(403).json({ error: "Permanent landlord deletion is disabled. Keep the landlord record for history." });
  });

  // ====== STORES ROUTES ======
  app.get("/api/stores", async (req, res) => {
    try {
      const [stores, tenants] = await Promise.all([storage.getStores(), storage.getTenants()]);
      const activeTenants = tenants.filter((tenant) => tenant.isActive);
      const storesWithOccupancy = stores.map((store) => {
        const currentTenant = activeTenants.find((tenant) => tenant.storeId === store.id);
        return {
          ...store,
          occupancyStatus: store.isArchived ? "archived" : currentTenant ? "occupied" : "vacant",
          currentTenantId: currentTenant?.id ?? null,
          currentTenantName: currentTenant?.tenantName ?? null,
          currentLeaseEnd: currentTenant?.leaseEnd ?? null,
        };
      });
      res.json(storesWithOccupancy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  app.get("/api/stores/:id", async (req, res) => {
    try {
      const store = await storage.getStore(req.params.id);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      res.json(store);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch store" });
    }
  });

  app.post("/api/stores", async (req, res) => {
    try {
      const validatedData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(validatedData);
      res.status(201).json(store);
    } catch (error) {
      res.status(400).json({ error: "Invalid store data" });
    }
  });

  app.patch("/api/stores/:id", async (req, res) => {
    try {
      const validatedData = insertStoreSchema.partial().parse(req.body);
      const store = await storage.updateStore(req.params.id, validatedData);
      res.json(store);
    } catch (error) {
      res.status(400).json({ error: "Failed to update store" });
    }
  });

  app.delete("/api/stores/:id", async (req, res) => {
    try {
      const tenants = await storage.getTenants();
      const activeTenant = tenants.find((tenant) => tenant.isActive && tenant.storeId === req.params.id);
      if (activeTenant) {
        return res.status(409).json({ error: "This unit has an active tenant. Archive or reassign the tenant before archiving the unit." });
      }
      const store = await storage.archiveStore(req.params.id);
      await recordAuditEvent(req, {
        eventType: "store.archived",
        entityType: "store",
        entityId: store.id,
      });
      res.json(store);
    } catch (error) {
      res.status(404).json({ error: "Store not found" });
    }
  });

  // ====== TENANTS ROUTES ======
  app.get("/api/tenants", async (req, res) => {
    try {
      const tenants = await storage.getTenants();
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  // Get arrears summary for ALL tenants (must come before /:id routes)
  app.get("/api/tenants/arrears", async (req, res) => {
    try {
      const tenants = (await storage.getTenants()).filter((tenant) => tenant.isActive);
      const arrearsData = [];

      for (const tenant of tenants) {
        const payments = activePayments(await storage.getPayments(tenant.id));
        
        const leaseStart = new Date(tenant.leaseStart);
        const leaseEnd = new Date(tenant.leaseEnd);
        const today = new Date();
        const endDate = leaseEnd < today ? leaseEnd : today;
        
        let currentDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), 1);
        const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        let totalArrears = 0;
        
        while (currentDate <= endMonth) {
          const monthYear = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          const monthPayments = payments.filter(p => p.monthYear === monthYear);
          
          const rentAmount = parseFloat(tenant.monthlyRent.toString());
          const utilitiesAmount = parseFloat(tenant.utilitiesCharge?.toString() || "200");
          const totalDue = rentAmount + utilitiesAmount;
          const amountPaid = monthPayments.reduce((sum, p) => sum + parseFloat(p.paymentAmount.toString()), 0);
          const balance = Math.max(0, totalDue - amountPaid);
          
          totalArrears += balance;
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        arrearsData.push({
          tenantId: tenant.id,
          tenantName: tenant.tenantName,
          totalArrears: totalArrears,
        });
      }
      
      res.json(arrearsData);
    } catch (error) {
      console.error("Arrears summary error:", error);
      res.status(500).json({ error: "Failed to calculate arrears summary" });
    }
  });

  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const landlord = await storage.getLandlord(validatedData.landlordId);
      if (!landlord) {
        return res.status(400).json({ error: "Landlord does not exist." });
      }
      if (validatedData.storeId) {
        const store = await storage.getStore(validatedData.storeId);
        if (!store || store.isArchived) {
          return res.status(400).json({ error: "Store is not available for leasing." });
        }
      }
      const tenant = await storage.createTenant(validatedData);
      res.status(201).json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid tenant data" });
    }
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const validatedData = req.body;
      if (typeof validatedData.landlordId === "string") {
        const landlord = await storage.getLandlord(validatedData.landlordId);
        if (!landlord) {
          return res.status(400).json({ error: "Landlord does not exist." });
        }
      }
      if (typeof validatedData.storeId === "string") {
        const store = await storage.getStore(validatedData.storeId);
        if (!store || store.isArchived) {
          return res.status(400).json({ error: "Store is not available for leasing." });
        }
      }
      const tenant = await storage.updateTenant(req.params.id, validatedData);
      res.json(tenant);
    } catch (error) {
      res.status(400).json({ error: "Failed to update tenant" });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.archiveTenant(req.params.id);
      await recordAuditEvent(req, {
        eventType: "tenant.archived",
        entityType: "tenant",
        entityId: tenant.id,
      });
      res.json(tenant);
    } catch (error) {
      res.status(404).json({ error: "Tenant not found" });
    }
  });

  app.patch("/api/tenants/:id/archive", async (req, res) => {
    try {
      const tenant = await storage.archiveTenant(req.params.id);
      await recordAuditEvent(req, {
        eventType: "tenant.archived",
        entityType: "tenant",
        entityId: tenant.id,
      });
      res.json(tenant);
    } catch (error) {
      res.status(404).json({ error: "Tenant not found" });
    }
  });

  app.get("/api/tenants/expiring/:months", async (req, res) => {
    try {
      const months = parseInt(req.params.months);
      const tenants = await storage.getExpiringTenants(months);
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expiring tenants" });
    }
  });

  // ====== PAYMENTS ROUTES ======
  app.get("/api/payments", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const payments = await storage.getPayments(tenantId);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/payments/:id", async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.body.tenantId);
      if (!tenant || !tenant.isActive) {
        return res.status(400).json({ error: "Payment tenant must be an active tenant." });
      }
      const paymentData = buildPaymentData(req.body);
      const validatedData = insertPaymentSchema.parse(paymentData);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid payment data" });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    res.status(409).json({ error: "Payment records are immutable. Use the correction endpoint to preserve audit history." });
  });

  app.post("/api/payments/:id/corrections", async (req, res) => {
    try {
      const current = await storage.getPayment(req.params.id);
      if (!current) {
        return res.status(404).json({ error: "Payment not found" });
      }
      if (current.status === "corrected") {
        return res.status(409).json({ error: "Payment has already been corrected." });
      }
      const paymentData = {
        ...buildPaymentData(req.body, current as unknown as Record<string, unknown>),
        tenantId: current.tenantId,
      };
      const validatedData = insertPaymentSchema.parse(paymentData);
      const result = await storage.correctPayment(req.params.id, validatedData);
      await recordAuditEvent(req, {
        eventType: "payment.corrected",
        entityType: "payment",
        entityId: result.original.id,
        detail: `Correction payment ${result.correction.id} created.`,
      });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to correct payment" });
    }
  });

  app.get("/api/payments/month/:monthYear", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByMonth(req.params.monthYear);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments for month" });
    }
  });

  app.get("/api/payments/tds/unpaid", async (req, res) => {
    return commercialScopeNotAvailable(res);
  });

  // Get arrears (unpaid months) for a tenant
  app.get("/api/tenants/:id/arrears", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Get all payments for this tenant
      const payments = activePayments(await storage.getPayments(tenant.id));
      
      // Calculate all months between lease start and today (or lease end if expired)
      const leaseStart = new Date(tenant.leaseStart);
      const leaseEnd = new Date(tenant.leaseEnd);
      const today = new Date();
      const endDate = leaseEnd < today ? leaseEnd : today;
      
      // Generate list of expected months
      const expectedMonths: Array<{
        monthYear: string;
        date: Date;
        rentAmount: number;
        utilitiesAmount: number;
        totalDue: number;
        isPaid: boolean;
        partiallyPaid: boolean;
        amountPaid: number;
        balance: number;
      }> = [];
      
      let currentDate = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), 1);
      const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      while (currentDate <= endMonth) {
        const monthYear = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        
        // Find ALL payments for this month (could be multiple partial payments)
        const monthPayments = payments.filter(p => p.monthYear === monthYear);
        
        const rentAmount = parseFloat(tenant.monthlyRent.toString());
        const utilitiesAmount = parseFloat(tenant.utilitiesCharge?.toString() || "200");
        const totalDue = rentAmount + utilitiesAmount;
        
        // Sum all payments for this month
        const amountPaid = monthPayments.reduce((sum, p) => sum + parseFloat(p.paymentAmount.toString()), 0);
        const balance = totalDue - amountPaid;
        
        expectedMonths.push({
          monthYear,
          date: new Date(currentDate),
          rentAmount,
          utilitiesAmount,
          totalDue,
          isPaid: balance <= 0,
          partiallyPaid: amountPaid > 0 && balance > 0,
          amountPaid,
          balance: Math.max(0, balance),
        });
        
        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      // Filter to only unpaid or partially paid months
      const unpaidMonths = expectedMonths.filter(m => !m.isPaid);
      
      // Calculate total arrears
      const totalArrears = unpaidMonths.reduce((sum, m) => sum + m.balance, 0);
      
      res.json({
        tenantId: tenant.id,
        tenantName: tenant.tenantName,
        allMonths: expectedMonths,
        unpaidMonths,
        totalArrears,
        oldestUnpaidMonth: unpaidMonths[0] || null,
      });
    } catch (error) {
      console.error("Arrears calculation error:", error);
      res.status(500).json({ error: "Failed to calculate arrears" });
    }
  });

  // ====== DOCUMENTS ROUTES ======
  app.get("/api/documents/tenant/:tenantId", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      const documents = await storage.getDocuments(req.params.tenantId);
      const includeArchived = req.query.includeArchived === "true";
      res.json(includeArchived ? documents : documents.filter((document) => !document.isArchived));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document || document.isArchived || !document.storageKey) {
        return res.status(404).json({ error: "Document file not found" });
      }

      const filePath = documentPathFromStorageKey(document.storageKey);
      res.download(filePath, document.fileName, (error) => {
        if (error && !res.headersSent) {
          res.status(404).json({ error: "Document file not found" });
        }
      });
    } catch (error) {
      res.status(404).json({ error: "Document file not found" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.body.tenantId);
      if (!tenant) {
        return res.status(400).json({ error: "Document tenant does not exist." });
      }
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid document data" });
    }
  });

  app.post("/api/documents/tenant/:tenantId/upload", runTenantDocumentUpload, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.tenantId);
      if (!tenant) {
        if (req.file?.path) {
          await fs.unlink(req.file.path).catch(() => undefined);
        }
        return res.status(404).json({ error: "Tenant not found" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Document file is required." });
      }

      const signatureMatches = await validateDocumentSignature(req.file.path, req.file.mimetype);
      if (!signatureMatches) {
        await fs.unlink(req.file.path).catch(() => undefined);
        return res.status(400).json({ error: "Document content does not match a supported PDF, JPG or PNG file." });
      }

      const documentData = {
        tenantId: tenant.id,
        documentName: String(req.body.documentName || req.file.originalname),
        documentType: String(req.body.documentType || "other"),
        fileUrl: "#local-document-storage",
        fileName: req.file.originalname,
        fileSize: safeDocumentSize(req.file.size),
        mimeType: req.file.mimetype,
        storageKey: req.file.filename,
        notes: req.body.notes ? String(req.body.notes) : null,
      };

      const validatedData = insertDocumentSchema.parse(documentData);
      const document = await storage.createDocument(validatedData);
      await recordAuditEvent(req, {
        eventType: "document.uploaded",
        entityType: "document",
        entityId: document.id,
      });
      res.status(201).json(document);
    } catch (error: any) {
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => undefined);
      }
      res.status(400).json({ error: error.message || "Invalid document data" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.archiveDocument(req.params.id);
      await recordAuditEvent(req, {
        eventType: "document.archived",
        entityType: "document",
        entityId: document.id,
      });
      res.json(document);
    } catch (error) {
      res.status(404).json({ error: "Document not found" });
    }
  });

  // ====== SETTINGS ROUTES ======
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSettingSchema.parse(req.body);
      const setting = await storage.setSetting(validatedData);
      res.json(setting);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid setting data" });
    }
  });

  // ====== EXPENSES ROUTES ======
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      const includeArchived = req.query.includeArchived === "true";
      res.json(includeArchived ? expenses : expenses.filter((expense) => !expense.isArchived));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.getExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      if (req.body.storeId) {
        const store = await storage.getStore(req.body.storeId);
        if (!store || store.isArchived) {
          return res.status(400).json({ error: "Expense store is not available." });
        }
      }
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid expense data" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const existing = await storage.getExpense(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Expense not found" });
      }
      if (req.body.storeId) {
        const store = await storage.getStore(req.body.storeId);
        if (!store || store.isArchived) {
          return res.status(400).json({ error: "Expense store is not available." });
        }
      }
      const expense = await storage.updateExpense(req.params.id, req.body);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const expense = await storage.archiveExpense(req.params.id);
      await recordAuditEvent(req, {
        eventType: "expense.archived",
        entityType: "expense",
        entityId: expense.id,
      });
      res.json(expense);
    } catch (error) {
      res.status(404).json({ error: "Expense not found" });
    }
  });

  // ====== TAX REPORTS ROUTES ======
  app.get("/api/reports/tax/summary/:year", async (req, res) => {
    return commercialScopeNotAvailable(res);
  });

  app.get("/api/reports/tax/monthly/:monthYear", async (req, res) => {
    return commercialScopeNotAvailable(res);
  });

  // ====== BULK UPLOAD ROUTES ======
  app.post("/api/bulk-upload/landlords", async (req, res) => {
    try {
      const { data } = req.body;
      const results = { success: 0, errors: [] as string[] };

      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          const landlordData = {
            uniqueRef: row["Unique Ref"],
            fullName: row["Full Name"],
            idCardNumber: row["ID Card Number"] || null,
            address: row["Address"] || null,
            phoneNumber: row["Phone Number"] || null,
            email: row["Email"] || null,
            signatureUrl: row["Signature URL"] || null,
          };

          const validatedData = insertLandlordSchema.parse(landlordData);
          await storage.createLandlord(validatedData);
          results.success++;
        } catch (error: any) {
          results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Bulk upload failed" });
    }
  });

  app.post("/api/bulk-upload/stores", async (req, res) => {
    try {
      const { data } = req.body;
      const results = { success: 0, errors: [] as string[] };

      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          const storeData = {
            uniqueRef: row["Unique Ref"],
            storeNumber: row["Store Number"],
            floor: row["Floor"],
            size: row["Size"] || null,
            features: row["Features"] || null,
          };

          const validatedData = insertStoreSchema.parse(storeData);
          await storage.createStore(validatedData);
          results.success++;
        } catch (error: any) {
          results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Bulk upload failed" });
    }
  });

  app.post("/api/bulk-upload/tenants", async (req, res) => {
    try {
      const { data } = req.body;
      const results = { success: 0, errors: [] as string[] };

      // Get all landlords and stores for reference matching
      const landlords = await storage.getLandlords();
      const stores = await storage.getStores();

      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i];
          
          // Find landlord by unique ref
          const landlord = landlords.find(l => l.uniqueRef === row["Landlord Ref"]);
          if (!landlord) {
            results.errors.push(`Row ${i + 1}: Landlord with ref ${row["Landlord Ref"]} not found`);
            continue;
          }

          // Find store by unique ref (optional)
          let storeId = null;
          if (row["Store Ref"]) {
            const store = stores.find(s => s.uniqueRef === row["Store Ref"]);
            if (!store) {
              results.errors.push(`Row ${i + 1}: Store with ref ${row["Store Ref"]} not found`);
              continue;
            }
            storeId = store.id;
          }

          const tenantData = {
            landlordId: landlord.id,
            storeId,
            tenantType: row["Tenant Type"] || "individual",
            gender: row["Gender"] || null,
            tenantName: row["Tenant Name"],
            businessName: row["Business Name"] || null,
            tenantIdCard: row["ID Card Number"] || null,
            tenantAddress: row["Address"] || null,
            tenantPhone: row["Phone"] || null,
            tenantEmail: row["Email"] || null,
            tradePermitNo: row["Trade Permit No"] || null,
            tradePermitExpiry: row["Trade Permit Expiry"] || null,
            monthlyRent: row["Monthly Rent"]?.toString() || "0",
            leaseStart: row["Lease Start"],
            leaseEnd: row["Lease End"],
            utilitiesCharge: row["Utilities Charge"]?.toString() || "200",
            deposit: row["Deposit"]?.toString() || null,
            depositPaid: row["Deposit Paid"] === "true" || row["Deposit Paid"] === true,
            premisesAddress: row["Premises Address"] || null,
            commercialPurpose: row["Commercial Purpose"] || null,
            notes: row["Notes"] || null,
            isActive: true,
          };

          const validatedData = insertTenantSchema.parse(tenantData);
          await storage.createTenant(validatedData);
          results.success++;
        } catch (error: any) {
          results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Bulk upload failed" });
    }
  });

  app.get("/api/audit-events", async (req, res) => {
    try {
      const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
      const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
      const events = await storage.getAuditEvents(entityType, entityId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
