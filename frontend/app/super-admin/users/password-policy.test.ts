import assert from "node:assert/strict";
import test from "node:test";

import { evaluateTemporaryPassword } from "../../../lib/password-policy.ts";

test("accepts a strong temporary password", () => {
  assert.equal(evaluateTemporaryPassword("Temporal-Segura-2026!").valid, true);
});

test("rejects short or incomplete temporary passwords", () => {
  assert.equal(evaluateTemporaryPassword("Admin123!").valid, false);
  assert.equal(evaluateTemporaryPassword("temporary-password-2026!").valid, false);
});

test("enforces bcrypt's 72-byte boundary", () => {
  assert.equal(evaluateTemporaryPassword(`Aa1!${"x".repeat(69)}`).valid, false);
});

test("uses the same ASCII symbol rule as the backend", () => {
  assert.equal(evaluateTemporaryPassword("ContrasenaSegura2026ñ").valid, false);
  assert.equal(evaluateTemporaryPassword("Contrasena-Segura2026").valid, true);
});
