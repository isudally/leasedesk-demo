import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "leasedesk-upload-config-"));
  const config = validateRuntimeConfig({
    LEASEDESK_MODE: "production",
    DATABASE_URL: "postgres://example.invalid/leasedesk",
    SESSION_SECRET: "not-a-real-secret",
    LEASEDESK_ADMIN_USERNAME: "owner",
    LEASEDESK_ADMIN_PASSWORD_HASH: "scrypt:salt:hash",
    LEASEDESK_UPLOAD_DIR: uploadDir,
  });

  assert.equal(config.isProductionMode, true);
  assert.equal(config.uploadDir, uploadDir);
});

test("production mode rejects missing or unavailable upload storage", () => {
  const baseEnv = {
    LEASEDESK_MODE: "production",
    DATABASE_URL: "postgres://example.invalid/leasedesk",
    SESSION_SECRET: "not-a-real-secret",
    LEASEDESK_ADMIN_USERNAME: "owner",
    LEASEDESK_ADMIN_PASSWORD_HASH: "scrypt:salt:hash",
  };

  assert.throws(() => validateRuntimeConfig(baseEnv), /LEASEDESK_UPLOAD_DIR/);
  assert.throws(
    () => validateRuntimeConfig({ ...baseEnv, LEASEDESK_UPLOAD_DIR: path.join(os.tmpdir(), "leasedesk-missing-dir") }),
    /LEASEDESK_UPLOAD_DIR must point to an existing writable directory/,
  );
});
