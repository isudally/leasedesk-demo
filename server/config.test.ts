import test from "node:test";
import assert from "node:assert/strict";
import { getRuntimeConfig, validateRuntimeConfig } from "./config";

test("defaults to isolated demo mode outside production", () => {
  const config = getRuntimeConfig({});
  assert.equal(config.mode, "demo");
  assert.equal(config.isProductionMode, false);
});

test("production mode requires database, session and admin bootstrap configuration", () => {
  assert.throws(
    () => validateRuntimeConfig({ LEASEDESK_MODE: "production" }),
    /DATABASE_URL, SESSION_SECRET, LEASEDESK_ADMIN_USERNAME/,
  );
});

test("production mode accepts explicit required configuration", () => {
  const config = validateRuntimeConfig({
    LEASEDESK_MODE: "production",
    DATABASE_URL: "postgres://example.invalid/leasedesk",
    SESSION_SECRET: "not-a-real-secret",
    LEASEDESK_ADMIN_USERNAME: "owner",
    LEASEDESK_ADMIN_PASSWORD_HASH: "scrypt:salt:hash",
  });

  assert.equal(config.isProductionMode, true);
});
