import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLandlordSchema, insertStoreSchema, insertTenantSchema, insertPaymentSchema, insertDocumentSchema, insertSettingSchema, insertExpenseSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
    res.status(403).json({ error: "Deletes are disabled in the LeaseDesk validation demo" });
  });

  // ====== STORES ROUTES ======
  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await storage.getStores();
      res.json(stores);
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
    res.status(403).json({ error: "Deletes are disabled in the LeaseDesk validation demo" });
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
      const tenants = await storage.getTenants();
      const arrearsData = [];

      for (const tenant of tenants) {
        const payments = await storage.getPayments(tenant.id);
        
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
      const tenant = await storage.createTenant(validatedData);
      res.status(201).json(tenant);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid tenant data" });
    }
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.updateTenant(req.params.id, req.body);
      res.json(tenant);
    } catch (error) {
      res.status(400).json({ error: "Failed to update tenant" });
    }
  });

  app.delete("/api/tenants/:id", async (req, res) => {
    res.status(403).json({ error: "Deletes are disabled in the LeaseDesk validation demo" });
  });

  app.patch("/api/tenants/:id/archive", async (req, res) => {
    res.status(403).json({ error: "Archiving is disabled in the LeaseDesk validation demo" });
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
      // Payment logic:
      // Tenant owes: rent + utilities = totalAmountDue
      // Tenant pays: paymentAmount (may be full or partial)
      // Payment is allocated to rent first, then utilities
      // TDS: 7.5% of rent ACTUALLY PAID - tracked for tax reporting only, NOT deducted
      // Landlord receives: FULL paymentAmount (TDS tracked separately for tax declaration)
      // Balance: totalDue - payment (if partial payment)
      
      const rentAmount = parseFloat(req.body.rentAmount || "0");
      const utilitiesAmount = parseFloat(req.body.utilitiesAmount || "0");
      const totalAmountDue = rentAmount + utilitiesAmount;
      const paymentAmount = parseFloat(req.body.paymentAmount || "0");
      
      // Calculate how much of the payment goes to rent vs utilities
      // Payment is allocated to rent first, then utilities
      const rentPaid = Math.min(paymentAmount, rentAmount);
      
      // TDS is 7.5% of rent ACTUALLY PAID (for tax reporting only)
      const tdsAmount = Math.round(rentPaid * 0.075 * 100) / 100;
      // Landlord receives FULL payment - TDS is tracked separately for tax declaration
      const landlordAmount = paymentAmount;
      const balance = totalAmountDue - paymentAmount;

      const paymentData = {
        ...req.body,
        totalAmountDue: totalAmountDue.toString(),
        tdsAmount: tdsAmount.toString(),
        landlordAmount: landlordAmount.toString(),
        balance: balance.toString(),
      };

      const validatedData = insertPaymentSchema.parse(paymentData);
      const payment = await storage.createPayment(validatedData);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid payment data" });
    }
  });

  app.patch("/api/payments/:id", async (req, res) => {
    try {
      // Get current payment to merge with updates
      const current = await storage.getPayment(req.params.id);
      if (!current) {
        return res.status(404).json({ error: "Payment not found" });
      }

      let updateData = { ...req.body };
      
      // Remove any client-provided calculated fields to prevent override
      delete updateData.tdsAmount;
      delete updateData.totalAmountDue;
      delete updateData.landlordAmount;
      delete updateData.balance;
      
      // Always recalculate when updating any monetary fields
      // Use updated values if provided, otherwise use current values
      const rentAmount = req.body.rentAmount !== undefined 
        ? parseFloat(String(req.body.rentAmount))
        : parseFloat(String(current.rentAmount || "0"));
      const utilitiesAmount = req.body.utilitiesAmount !== undefined 
        ? parseFloat(String(req.body.utilitiesAmount))
        : parseFloat(String(current.utilitiesAmount || "0"));
      const paymentAmount = req.body.paymentAmount !== undefined 
        ? parseFloat(String(req.body.paymentAmount))
        : parseFloat(String(current.paymentAmount || "0"));
      
      const totalAmountDue = rentAmount + utilitiesAmount;
      const rentPaid = Math.min(paymentAmount, rentAmount);
      const tdsAmount = Math.round(rentPaid * 0.075 * 100) / 100; // 7.5% TDS on rent actually paid (for tax reporting only)
      const landlordAmount = paymentAmount; // Landlord receives FULL payment - TDS tracked separately for tax declaration
      const balance = totalAmountDue - paymentAmount;
      
      updateData.tdsAmount = tdsAmount.toString();
      updateData.totalAmountDue = totalAmountDue.toString();
      updateData.landlordAmount = landlordAmount.toString();
      updateData.balance = balance.toString();

      const validatedData = insertPaymentSchema.partial().parse(updateData);
      const payment = await storage.updatePayment(req.params.id, validatedData);
      res.json(payment);
    } catch (error) {
      res.status(400).json({ error: "Failed to update payment" });
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
    try {
      const payments = await storage.getUnpaidTDS();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unpaid TDS" });
    }
  });

  // Get arrears (unpaid months) for a tenant
  app.get("/api/tenants/:id/arrears", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Get all payments for this tenant
      const payments = await storage.getPayments(tenant.id);
      
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
      const documents = await storage.getDocuments(req.params.tenantId);
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
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
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid document data" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    res.status(403).json({ error: "Deletes are disabled in the LeaseDesk validation demo" });
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
      res.json(expenses);
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
      const expense = await storage.updateExpense(req.params.id, req.body);
      res.json(expense);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    res.status(403).json({ error: "Deletes are disabled in the LeaseDesk validation demo" });
  });

  // ====== TAX REPORTS ROUTES ======
  app.get("/api/reports/tax/summary/:year", async (req, res) => {
    try {
      const year = req.params.year;
      const payments = await storage.getPayments();
      
      // Filter payments for the year and calculate totals
      const yearPayments = payments.filter(p => {
        const paymentYear = p.paymentDate.split('-')[0];
        return paymentYear === year;
      });

      const summary = {
        year,
        totalRentCollected: yearPayments.reduce((sum, p) => sum + parseFloat(p.rentAmount.toString()), 0),
        totalTDSDeducted: yearPayments.reduce((sum, p) => sum + parseFloat(p.tdsAmount?.toString() || "0"), 0),
        totalLandlordAmount: yearPayments.reduce((sum, p) => sum + parseFloat(p.landlordAmount.toString()), 0),
        paymentsCount: yearPayments.length,
      };

      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate tax summary" });
    }
  });

  app.get("/api/reports/tax/monthly/:monthYear", async (req, res) => {
    try {
      const monthYear = req.params.monthYear;
      const payments = await storage.getPaymentsByMonth(monthYear);
      
      const summary = {
        monthYear,
        totalRent: payments.reduce((sum, p) => sum + parseFloat(p.rentAmount.toString()), 0),
        totalTDS: payments.reduce((sum, p) => sum + parseFloat(p.tdsAmount?.toString() || "0"), 0),
        totalLandlordAmount: payments.reduce((sum, p) => sum + parseFloat(p.landlordAmount.toString()), 0),
        tdsPaidCount: payments.filter(p => p.tdsPaidToMRA).length,
        tdsPendingCount: payments.filter(p => !p.tdsPaidToMRA).length,
        payments: payments,
      };

      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate monthly report" });
    }
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
            premisesAddress: row["Premises Address"] || "Riverton Market Plaza",
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

  const httpServer = createServer(app);
  return httpServer;
}
