#!/usr/bin/env node
/**
 * Audit: auth email (forgot-password / reset-password / Resend integration)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let passed = 0, failed = 0, skipped = 0;

function check(label, ok, note = "") {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}${note ? " — " + note : ""}`); failed++; }
}
function skip(label, reason = "") {
  console.log(`  ⏭️  SKIPPED ${label}${reason ? " — " + reason : ""}`);
  skipped++;
}
function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}
function exists(rel) {
  try { fs.accessSync(path.join(ROOT, rel)); return true; } catch { return false; }
}

console.log("\n📧  EDUCORE — AUTH EMAIL RESET AUDIT\n");

// ── 1. Backend auth handler ─────────────────────────────────────────────────
console.log("1. Forgot Password endpoint");
const handler = read("backend/internal/modules/auth/handler.go");
check("ForgotPassword generates 32-byte random token", handler.includes("rand.Read(tokenBytes)") && handler.includes("make([]byte, 32)"));
// Expiry is now computed in Go (time.Now().UTC().Add(time.Hour)) and passed as a parameter
check("Token stored in DB with 1-hour expiry",
  (handler.includes("invitation_expires_at = $2") || handler.includes("invitation_expires_at = NOW() + INTERVAL")) &&
  (handler.includes("time.Hour") || handler.includes("INTERVAL '1 hour'")));
check("Returns same generic message regardless of email existence", handler.includes("If the email exists"));
check("No TODO comment for email left unimplemented", !handler.includes("TODO: Send email"));
check("Email client called when configured", handler.includes("emailClient.Configured()") && handler.includes("SendPasswordReset"));
check("Email send failure is logged, not returned to user", handler.includes("log.Printf") && handler.includes("email send failed"));
check("provider not configured logged when absent", handler.includes("email provider not configured"));

// ── 2. Reset password endpoint ──────────────────────────────────────────────
console.log("\n2. Reset Password endpoint");
check("ResetPassword validates token + expiry in DB", handler.includes("invitation_expires_at > NOW()"));
check("New password hashed with bcrypt", handler.includes("bcrypt.GenerateFromPassword"));
check("Token and expiry cleared after use", handler.includes("invitation_token = NULL") && handler.includes("invitation_expires_at = NULL"));
check("Min password length enforced (8 chars)", handler.includes("len(req.NewPassword) < 8"));
check("RowsAffected check prevents reuse of expired tokens", handler.includes("RowsAffected() == 0"));

// ── 3. Email client package ────────────────────────────────────────────────
console.log("\n3. Email client (pkg/email)");
const emailPkg = read("backend/internal/pkg/email/resend.go");
check("Resend client package exists", emailPkg.length > 0);
check("Configured() returns false when API key is empty", emailPkg.includes("func (c *Client) Configured()") && emailPkg.includes("return c.apiKey != \"\""));
check("HTTP timeout set on client", emailPkg.includes("Timeout: 10 * time.Second"));
check("Authorization header set from apiKey", emailPkg.includes("Bearer ") && emailPkg.includes("c.apiKey"));
check("Password reset HTML email template included", emailPkg.includes("passwordResetHTML"));
check("Reset link built from appURL + token", emailPkg.includes("c.appURL") && emailPkg.includes("reset-password?token="));

// ── 4. Config / env ────────────────────────────────────────────────────────
console.log("\n4. Config & environment variables");
const cfg = read("backend/internal/config/config.go");
check("Config has ResendAPIKey field", cfg.includes("ResendAPIKey"));
check("Config has EmailFrom field", cfg.includes("EmailFrom"));
check("Config has PublicAppURL field", cfg.includes("PublicAppURL"));
check("RESEND_API_KEY read from env (not hardcoded)", cfg.includes("RESEND_API_KEY") && !cfg.match(/ResendAPIKey\s*=\s*"re_/));
check("PASSWORD_RESET_FROM_EMAIL env var supported", cfg.includes("PASSWORD_RESET_FROM_EMAIL"));
check("PUBLIC_APP_URL env var supported", cfg.includes("PUBLIC_APP_URL"));

const envExample = read(".env.example");
check("RESEND_API_KEY documented in .env.example", envExample.includes("RESEND_API_KEY"));

// ── 5. main.go wiring ─────────────────────────────────────────────────────
console.log("\n5. main.go wiring");
const main = read("backend/cmd/server/main.go");
check("email.NewClient called with cfg values", main.includes("pkgemail.NewClient(") || main.includes("email.NewClient("));
check("emailClient passed to auth.NewHandler", main.includes("emailClient)"));
check("No hardcoded secrets", !main.includes("re_") && !main.includes("SG."));

// ── 6. Env detection ──────────────────────────────────────────────────────
console.log("\n6. Runtime env check");
const resendKey = process.env.RESEND_API_KEY || "";
if (!resendKey) {
  skip("Live email send", "RESEND_API_KEY not set — provider not configured, controlled error expected");
} else {
  check("RESEND_API_KEY present in environment", true);
}

// ── 7. Docs ───────────────────────────────────────────────────────────────
console.log("\n7. Documentation");
check("docs/AUTH_EMAIL_SETUP.md exists", exists("docs/AUTH_EMAIL_SETUP.md"));

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`  ✅ Passed:  ${passed}`);
console.log(`  ❌ Failed:  ${failed}`);
console.log(`  ⏭️  Skipped: ${skipped}`);
if (failed === 0) {
  console.log("\n  🎉 Auth email reset — all checks passed\n");
} else {
  console.log(`\n  ⚠️  ${failed} check(s) failed — see above\n`);
  process.exit(1);
}
