import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, isPasswordHash, verifyPassword } from "./passwords";

test("hashes and verifies passwords without storing plaintext", () => {
  const hash = hashPassword("correct horse battery staple");

  assert.equal(isPasswordHash(hash), true);
  assert.notEqual(hash, "correct horse battery staple");
  assert.equal(verifyPassword("correct horse battery staple", hash), true);
  assert.equal(verifyPassword("wrong password", hash), false);
});
