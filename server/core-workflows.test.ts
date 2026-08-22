import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { registerRoutes } from "./routes";

test("core commercial workflows use safe lifecycle, corrections, and document storage", async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  await registerRoutes(app);

  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;
    const cookie = await login(baseUrl);

    const stores = await requestJson<any[]>(baseUrl, "/api/stores", { cookie });
    const unitOne = stores.find((store) => store.id === "st-001");
    const vacantUnit = stores.find((store) => store.id === "st-013");
    assert.equal(unitOne?.occupancyStatus, "occupied");
    assert.equal(unitOne?.currentTenantName, "Bloom Coffee Ltd");
    assert.equal(vacantUnit?.occupancyStatus, "vacant");

    const invalidTenant = await fetch(`${baseUrl}/api/tenants`, {
      method: "POST",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({
        landlordId: "ll-001",
        storeId: "missing-store",
        tenantType: "company",
        tenantName: "Invalid Tenant Ltd",
        monthlyRent: "1000",
        leaseStart: "2026-08-01",
        leaseEnd: "2027-07-31",
        premisesAddress: "Validation Plaza",
        isActive: true,
      }),
    });
    assert.equal(invalidTenant.status, 400);

    const payments = await requestJson<any[]>(baseUrl, "/api/payments?tenantId=tn-001", { cookie });
    const originalPayment = payments[0];

    const overwriteAttempt = await fetch(`${baseUrl}/api/payments/${originalPayment.id}`, {
      method: "PATCH",
      headers: jsonHeaders(cookie),
      body: JSON.stringify({ notes: "unsafe overwrite" }),
    });
    assert.equal(overwriteAttempt.status, 409);

    const correction = await requestJson<any>(baseUrl, `/api/payments/${originalPayment.id}/corrections`, {
      cookie,
      method: "POST",
      body: {
        paymentAmount: "13700",
        receivedBy: "LeaseDesk Test",
        receiptNumber: "LD-CORR-001",
        notes: "Fictional correction record.",
      },
      expectedStatus: 201,
    });
    assert.equal(correction.original.status, "corrected");
    assert.equal(correction.correction.correctionOfPaymentId, originalPayment.id);

    const archivedTenant = await requestJson<any>(baseUrl, "/api/tenants/tn-011/archive", {
      cookie,
      method: "PATCH",
      expectedStatus: 200,
    });
    assert.equal(archivedTenant.isActive, false);
    assert.ok(archivedTenant.archivedAt);

    const expense = await requestJson<any>(baseUrl, "/api/expenses", {
      cookie,
      method: "POST",
      body: {
        paidBy: "LeaseDesk Test",
        expenseDate: "2026-08-15",
        description: "Fictional common-area cleaning",
        amount: "450.00",
        category: "cleaning",
        expenseType: "building-wide",
        splitMethod: "equal",
        notes: "Fictional Slice 3 test expense.",
      },
      expectedStatus: 201,
    });
    const archivedExpense = await requestJson<any>(baseUrl, `/api/expenses/${expense.id}`, {
      cookie,
      method: "DELETE",
    });
    assert.equal(archivedExpense.isArchived, true);

    const visibleExpenses = await requestJson<any[]>(baseUrl, "/api/expenses", { cookie });
    assert.equal(visibleExpenses.some((item) => item.id === expense.id), false);

    const uploadForm = new FormData();
    uploadForm.set("documentType", "lease");
    uploadForm.set("documentName", "Fictional lease agreement");
    uploadForm.set("file", new Blob(["%PDF-1.4\n%fictional\n"], { type: "application/pdf" }), "fictional-lease.pdf");

    const upload = await fetch(`${baseUrl}/api/documents/tenant/tn-001/upload`, {
      method: "POST",
      headers: { cookie },
      body: uploadForm,
    });
    assert.equal(upload.status, 201);
    const uploadedDocument: any = await upload.json();
    assert.equal(uploadedDocument.mimeType, "application/pdf");
    assert.ok(uploadedDocument.storageKey);

    const download = await fetch(`${baseUrl}/api/documents/${uploadedDocument.id}/download`, {
      headers: { cookie },
    });
    assert.equal(download.status, 200);

    const invalidUploadForm = new FormData();
    invalidUploadForm.set("documentType", "notes");
    invalidUploadForm.set("file", new Blob(["plain text"], { type: "text/plain" }), "notes.txt");
    const invalidUpload = await fetch(`${baseUrl}/api/documents/tenant/tn-001/upload`, {
      method: "POST",
      headers: { cookie },
      body: invalidUploadForm,
    });
    assert.equal(invalidUpload.status, 400);

    const archivedDocument = await requestJson<any>(baseUrl, `/api/documents/${uploadedDocument.id}`, {
      cookie,
      method: "DELETE",
    });
    assert.equal(archivedDocument.isArchived, true);

    const tds = await fetch(`${baseUrl}/api/payments/tds/unpaid`, { headers: { cookie } });
    assert.equal(tds.status, 410);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

async function login(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "demo", password: "demo-only" }),
  });

  assert.equal(response.status, 200);
  return cookieFrom(response);
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: {
    cookie: string;
    method?: string;
    body?: Record<string, unknown>;
    expectedStatus?: number;
  },
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? jsonHeaders(options.cookie) : { cookie: options.cookie },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  assert.equal(response.status, options.expectedStatus ?? 200);
  return (await response.json()) as T;
}

function jsonHeaders(cookie: string) {
  return {
    "content-type": "application/json",
    cookie,
  };
}

function cookieFrom(response: Response) {
  const cookies = (response.headers as any).getSetCookie?.() ?? [response.headers.get("set-cookie")];
  const cookie = cookies.find(Boolean);
  assert.ok(cookie, "Expected response to set a session cookie");
  return cookie.split(";")[0];
}
