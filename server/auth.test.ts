import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { AddressInfo } from "node:net";
import { requireAuth, setupAuth } from "./auth";
import { hashPassword } from "./passwords";

test("rejects unauthenticated API access", () => {
  let statusCode = 0;
  let body: unknown;
  let nextCalled = false;

  const req = { session: {} };
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  };

  requireAuth(req as any, res as any, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 401);
  assert.deepEqual(body, { error: "Authentication required." });
  assert.equal(nextCalled, false);
});

test("allows authenticated API access", () => {
  let nextCalled = false;

  requireAuth({ session: { userId: "user-1" } } as any, {} as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test("login regenerates the session and logout invalidates protected access", async () => {
  const previousMode = process.env.LEASEDESK_MODE;
  process.env.LEASEDESK_MODE = "demo";

  const app = express();
  app.use(express.json());
  setupAuth(app, lifecycleStorage());
  app.post("/touch-session", (req, res) => {
    req.session.userId = undefined;
    (req.session as any).preLoginMarker = "created";
    res.status(204).end();
  });
  app.get("/api/protected", requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  const server = app.listen(0);

  try {
    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const preLogin = await fetch(`${baseUrl}/touch-session`, { method: "POST" });
    const preLoginCookie = cookieFrom(preLogin);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: preLoginCookie,
      },
      body: JSON.stringify({ username: "owner", password: "correct-password" }),
    });
    const postLoginCookie = cookieFrom(login);

    assert.equal(login.status, 200);
    assert.notEqual(sessionValue(preLoginCookie), sessionValue(postLoginCookie));

    const protectedResponse = await fetch(`${baseUrl}/api/protected`, {
      headers: { cookie: postLoginCookie },
    });
    assert.equal(protectedResponse.status, 200);

    const logout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: postLoginCookie },
    });
    assert.equal(logout.status, 204);

    const afterLogout = await fetch(`${baseUrl}/api/protected`, {
      headers: { cookie: postLoginCookie },
    });
    assert.equal(afterLogout.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    if (previousMode === undefined) {
      delete process.env.LEASEDESK_MODE;
    } else {
      process.env.LEASEDESK_MODE = previousMode;
    }
  }
});

function cookieFrom(response: Response) {
  const cookies = (response.headers as any).getSetCookie?.() ?? [response.headers.get("set-cookie")];
  const cookie = cookies.find(Boolean);
  assert.ok(cookie, "Expected response to set a session cookie");
  return cookie.split(";")[0];
}

function sessionValue(cookie: string) {
  const [, value] = cookie.split("=");
  return value;
}

function lifecycleStorage() {
  const user = {
    id: "user-1",
    username: "owner",
    password: hashPassword("correct-password"),
  };

  const unsupported = async () => {
    throw new Error("Unsupported in auth lifecycle test");
  };

  return {
    getUser: async (id: string) => (id === user.id ? user : undefined),
    getUserByUsername: async (username: string) => (username === user.username ? user : undefined),
    createUser: unsupported,
    getLandlords: unsupported,
    getLandlord: unsupported,
    getLandlordByRef: unsupported,
    createLandlord: unsupported,
    updateLandlord: unsupported,
    deleteLandlord: unsupported,
    getStores: unsupported,
    getStore: unsupported,
    getStoreByRef: unsupported,
    createStore: unsupported,
    updateStore: unsupported,
    deleteStore: unsupported,
    getTenants: unsupported,
    getTenant: unsupported,
    createTenant: unsupported,
    updateTenant: unsupported,
    deleteTenant: unsupported,
    getExpiringTenants: unsupported,
    getPayments: unsupported,
    getPayment: unsupported,
    createPayment: unsupported,
    updatePayment: unsupported,
    getPaymentsByMonth: unsupported,
    getUnpaidTDS: unsupported,
    getDocuments: unsupported,
    getDocument: unsupported,
    createDocument: unsupported,
    deleteDocument: unsupported,
    getSetting: unsupported,
    setSetting: unsupported,
    getExpenses: unsupported,
    getExpense: unsupported,
    createExpense: unsupported,
    updateExpense: unsupported,
    deleteExpense: unsupported,
  } as any;
}
