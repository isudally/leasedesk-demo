import test from "node:test";
import assert from "node:assert/strict";
import { requireAuth } from "./auth";

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
