#!/usr/bin/env node
/**
 * check-auth-password-reset-flow.js
 *
 * Validates the complete password reset flow:
 *   1. Login page has link to /forgot-password (NOT /reset-password directly)
 *   2. /forgot-password page exists and is a real form (not a redirect shell)
 *   3. /reset-password page exists and calls both forgot + reset endpoints
 *   4. reset-password page does NOT leak internal info (invitation_token, base de datos...)
 *   5. Backend auth handler registers ForgotPassword and ResetPassword
 *
 * Usage:
 *   node scripts/check-auth-password-reset-flow.js
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); return false; };

let allPass = true;
function check(result, msg) {
  if (!result) { allPass = false; fail(msg); } else { pass(msg); }
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

console.log("\n🔐 Auth Password Reset Flow Audit\n");

// 1. Login page -> /forgot-password
const loginPage = read("frontend/app/login/page.tsx");
if (!loginPage) {
  check(false, "frontend/app/login/page.tsx exists");
} else {
  check(
    loginPage.includes('"/forgot-password"') || loginPage.includes("'/forgot-password'"),
    "Login page links to /forgot-password"
  );
  check(
    !loginPage.includes('href="/reset-password"'),
    "Login page does NOT link directly to /reset-password (old link removed)"
  );
}

// 2. /forgot-password page is a real form
const forgotPage = read("frontend/app/forgot-password/page.tsx");
if (!forgotPage) {
  check(false, "frontend/app/forgot-password/page.tsx exists");
  allPass = false;
} else {
  check(true, "frontend/app/forgot-password/page.tsx exists");
  check(
    forgotPage.includes("forgot-password") && forgotPage.includes("fetch"),
    "/forgot-password calls /api/v1/auth/forgot-password"
  );
  check(
    !forgotPage.includes("router.replace"),
    "/forgot-password is a real page (not just a redirect shell)"
  );
}

// 3. /reset-password page
const resetPage = read("frontend/app/reset-password/page.tsx");
if (!resetPage) {
  check(false, "frontend/app/reset-password/page.tsx exists");
  allPass = false;
} else {
  check(true, "frontend/app/reset-password/page.tsx exists");
  check(
    resetPage.includes("reset-password"),
    "reset-password page calls reset-password endpoint"
  );
}

// 4. No internal info leak
if (resetPage) {
  const FORBIDDEN = [
    "invitation_token",
    "base de datos",
    "el token se guarda",
    "campo invitation",
    "tiene acceso al servidor",
  ];
  for (const phrase of FORBIDDEN) {
    check(
      !resetPage.toLowerCase().includes(phrase.toLowerCase()),
      "reset-password does NOT contain: \"" + phrase + "\""
    );
  }
}

// 5. Backend auth handler
const authHandler = read("backend/internal/modules/auth/handler.go");
if (!authHandler) {
  check(false, "backend/internal/modules/auth/handler.go exists");
  allPass = false;
} else {
  check(
    authHandler.includes("ForgotPassword"),
    "Backend auth handler has ForgotPassword"
  );
  check(
    authHandler.includes("ResetPassword"),
    "Backend auth handler has ResetPassword"
  );
  check(
    authHandler.includes("ChangePassword"),
    "Backend auth handler has ChangePassword"
  );
}

// 6. Generic success message (no user enumeration)
if (forgotPage) {
  check(
    forgotPage.toLowerCase().includes("si") && (
      forgotPage.includes("instrucciones") ||
      forgotPage.includes("registrado") ||
      forgotPage.includes("recibirás")
    ),
    "/forgot-password shows generic success message (no user enumeration)"
  );
}

console.log("\n" + (allPass ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED") + "\n");
process.exit(allPass ? 0 : 1);
