import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { ensureProductionAdminUser, requireAuth, setupAuth } from "./auth";
import { getPool, resetDatabaseConnectionForTests } from "./db";
import { DatabaseStorage } from "./db-storage";

const shouldRun = process.env.LEASEDESK_RUN_POSTGRES_TESTS === "1";

test("production Postgres storage persists records and sessions", { skip: !shouldRun }, async () => {
  const previousEnv = captureEnv();
  process.env.LEASEDESK_MODE = "production";
  process.env.SESSION_SECRET = "leasedesk-postgres-integration-session-secret";
  process.env.LEASEDESK_ADMIN_USERNAME = "owner";
  process.env.LEASEDESK_ADMIN_PASSWORD = "correct-password";
  process.env.LEASEDESK_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "leasedesk-postgres-uploads-"));

  try {
    await resetDatabaseConnectionForTests();
    await resetTables();

    const storage = new DatabaseStorage();
    await ensureProductionAdminUser(storage);

    const landlord = await storage.createLandlord({
      uniqueRef: "LL-IT-001",
      fullName: "Integration Test Properties Ltd",
      gender: null,
      idCardNumber: null,
      address: "100 Test Street",
      phoneNumber: "+230 5000 0001",
      email: "landlord@example.com",
      signatureUrl: null,
    });

    const store = await storage.createStore({
      uniqueRef: "ST-IT-001",
      storeNumber: "Unit IT-01",
      floor: "Ground",
      size: "42 sqm",
      features: "Integration test unit",
    });

    const tenant = await storage.createTenant({
      landlordId: landlord.id,
      storeId: store.id,
      tenantType: "company",
      gender: null,
      tenantName: "Integration Tenant Ltd",
      businessName: "Integration Tenant",
      tenantIdCard: null,
      tenantAddress: "200 Test Avenue",
      tenantPhone: "+230 5000 0002",
      tenantEmail: "tenant@example.com",
      tradePermitNo: "TEST-PERMIT-001",
      tradePermitExpiry: "2027-12-31",
      monthlyRent: "12000.00",
      leaseStart: "2026-01-01",
      leaseEnd: "2026-12-31",
      utilitiesCharge: "1000.00",
      deposit: "24000.00",
      depositPaid: true,
      premisesAddress: "Integration Test Plaza",
      commercialPurpose: "Fictional integration testing",
      notes: "Fictional integration test data.",
      renewalDecision: "pending",
      isActive: true,
    });

    const payment = await storage.createPayment({
      tenantId: tenant.id,
      receivedBy: "Integration Tester",
      paymentDate: "2026-08-05",
      monthYear: "August 2026",
      rentAmount: "12000.00",
      utilitiesAmount: "1000.00",
      totalAmountDue: "13000.00",
      paymentAmount: "13000.00",
      tdsAmount: "0.00",
      landlordAmount: "13000.00",
      balance: "0.00",
      tdsPaidToMRA: false,
      landlordSigned: true,
      tenantSigned: true,
      receiptNumber: "LD-IT-001",
      notes: "Fictional integration payment.",
    });

    await storage.updatePayment(payment.id, { notes: "Fictional integration payment updated." });
    await storage.createDocument({
      tenantId: tenant.id,
      documentName: "Fictional Lease",
      documentType: "contract",
      fileUrl: "#integration-placeholder",
      fileName: "fictional-lease.pdf",
      fileSize: "10 KB",
      notes: "Metadata only.",
    });
    await storage.createExpense({
      paidBy: "Integration Tester",
      expenseDate: "2026-08-10",
      description: "Fictional cleaning",
      amount: "500.00",
      category: "cleaning",
      otherCategoryText: null,
      expenseType: "building-wide",
      storeId: null,
      splitMethod: "equal",
      notes: "Fictional integration expense.",
    });
    const auditEvent = await storage.createAuditEvent({
      eventType: "payment.corrected",
      entityType: "payment",
      entityId: payment.id,
      userId: "integration-test-user",
      detail: "Fictional integration audit event.",
    });

    await resetDatabaseConnectionForTests();

    const storageAfterReconnect = new DatabaseStorage();
    const persistedTenant = await storageAfterReconnect.getTenant(tenant.id);
    const persistedPayment = await storageAfterReconnect.getPayment(payment.id);
    const persistedDocuments = await storageAfterReconnect.getDocuments(tenant.id);
    const persistedExpenses = await storageAfterReconnect.getExpenses();
    const persistedAuditEvents = await storageAfterReconnect.getAuditEvents("payment", payment.id);

    assert.equal(persistedTenant?.tenantName, "Integration Tenant Ltd");
    assert.equal(persistedPayment?.notes, "Fictional integration payment updated.");
    assert.equal(persistedDocuments.length, 1);
    assert.equal(persistedExpenses.length, 1);
    assert.equal(persistedAuditEvents[0]?.id, auditEvent.id);

    await verifyPostgresSessionStore(storageAfterReconnect);
  } finally {
    await resetDatabaseConnectionForTests();
    restoreEnv(previousEnv);
  }
});

async function verifyPostgresSessionStore(storage: DatabaseStorage) {
  const app = express();
  app.use(express.json());
  setupAuth(app, storage);
  app.get("/api/protected", requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: secureHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ username: "owner", password: "correct-password" }),
    });
    const sessionCookie = cookieFrom(login);
    assert.equal(login.status, 200);

    const sessionRows = await getPool().query("select count(*)::int as count from leasedesk_sessions");
    assert.ok(sessionRows.rows[0].count >= 1);

    const protectedResponse = await fetch(`${baseUrl}/api/protected`, {
      headers: secureHeaders({ cookie: sessionCookie }),
    });
    assert.equal(protectedResponse.status, 200);

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: secureHeaders({ cookie: sessionCookie }),
    });
    assert.equal(logout.status, 204);

    const afterLogout = await fetch(`${baseUrl}/api/protected`, {
      headers: secureHeaders({ cookie: sessionCookie }),
    });
    assert.equal(afterLogout.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function secureHeaders(headers: Record<string, string>) {
  return { ...headers, "x-forwarded-proto": "https" };
}

async function resetTables() {
  await getPool().query(`
    truncate table
      documents,
      expenses,
      audit_events,
      payments,
      tenants,
      stores,
      landlords,
      settings,
      users
    restart identity cascade
  `);
}

function cookieFrom(response: Response) {
  const cookies = (response.headers as any).getSetCookie?.() ?? [response.headers.get("set-cookie")];
  const cookie = cookies.find(Boolean);
  assert.ok(cookie, "Expected response to set a session cookie");
  return cookie.split(";")[0];
}

function captureEnv() {
  return {
    LEASEDESK_MODE: process.env.LEASEDESK_MODE,
    SESSION_SECRET: process.env.SESSION_SECRET,
    LEASEDESK_ADMIN_USERNAME: process.env.LEASEDESK_ADMIN_USERNAME,
    LEASEDESK_ADMIN_PASSWORD: process.env.LEASEDESK_ADMIN_PASSWORD,
    LEASEDESK_ADMIN_PASSWORD_HASH: process.env.LEASEDESK_ADMIN_PASSWORD_HASH,
    LEASEDESK_UPLOAD_DIR: process.env.LEASEDESK_UPLOAD_DIR,
  };
}

function restoreEnv(previous: ReturnType<typeof captureEnv>) {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
