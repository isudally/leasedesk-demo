import test from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "./storage";

test("demo mode uses isolated demo storage with fictional seed data", async () => {
  const previous = process.env.LEASEDESK_MODE;
  process.env.LEASEDESK_MODE = "demo";

  try {
    const storage = createStorage();
    const landlords = await storage.getLandlords();

    assert.ok(landlords.length > 0);
    assert.equal(landlords[0].email?.endsWith(".example"), true);
  } finally {
    if (previous === undefined) {
      delete process.env.LEASEDESK_MODE;
    } else {
      process.env.LEASEDESK_MODE = previous;
    }
  }
});
