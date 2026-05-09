#!/usr/bin/env node
/**
 * check-credentials-and-invitations.js
 * Audits how user credentials are created and invitation flows work.
 * Checks: password hashing (bcrypt), JWT, invitation tokens, activation endpoints.
 *
 * Run: node scripts/check-credentials-and-invitations.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0; let failed = 0; let skipped = 0;
function pass(msg)  { console.log(`  ✅ PASS    ${msg}`); passed++; }
function fail(msg)  { console.log(`  ❌ FAIL    ${msg}`); failed++; }
function skip(msg)  { console.log(`  ⬜ SKIP    ${msg}`); skipped++; }

console.log("\n🔐 CREDENTIALS & INVITATIONS AUDIT\n");

// 1. Password hashing
console.log("1. Password hashing (bcrypt)");
function globSearch(dir, ext) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      if (f.isDirectory() && f.name !== "vendor" && f.name !== ".git") walk(full);
      else if (f.isFile() && f.name.endsWith(ext)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

const goFiles = globSearch(path.join(ROOT, "backend"), ".go");
const hashingFiles = goFiles.filter(f => {
  const c = fs.readFileSync(f, "utf-8");
  return c.includes("bcrypt") || c.includes("argon2") || c.includes("scrypt");
});
if (hashingFiles.length > 0) {
  pass(`Password hashing found in ${hashingFiles.length} file(s): ${hashingFiles.map(f => path.relative(ROOT, f)).join(", ")}`);
} else {
  fail("No bcrypt/argon2/scrypt usage found — passwords may not be hashed");
}

// Check for plaintext password patterns
const plaintextRisk = goFiles.filter(f => {
  const c = fs.readFileSync(f, "utf-8");
  // password in direct SQL insert without hash
  return c.match(/INSERT.*password.*req\.(Password|password)\b/) &&
         !c.includes("bcrypt") && !c.includes("Hash");
});
if (plaintextRisk.length > 0) {
  fail(`Potential plaintext password in ${plaintextRisk.map(f => path.relative(ROOT, f)).join(", ")}`);
} else {
  pass("No obvious plaintext password inserts");
}

// 2. JWT implementation
console.log("\n2. JWT implementation");
const jwtFiles = goFiles.filter(f => fs.readFileSync(f, "utf-8").includes("jwt"));
if (jwtFiles.length > 0) {
  pass(`JWT usage in ${jwtFiles.length} file(s)`);
} else {
  fail("No JWT usage found in backend");
}

// Check JWT_SECRET from env (not hardcoded)
const envHardcoded = goFiles.filter(f => {
  const c = fs.readFileSync(f, "utf-8");
  return c.match(/jwt\.NewWithClaims|SignedString/) && c.match(/"[a-zA-Z0-9+/=]{20,}"/);
});
if (envHardcoded.length > 0) {
  fail(`Potential hardcoded JWT secret in ${envHardcoded.map(f => path.relative(ROOT, f)).join(", ")}`);
} else {
  pass("No hardcoded JWT secrets detected");
}

// 3. Auth endpoints
console.log("\n3. Auth endpoints");
const authHandler = path.join(ROOT, "backend/internal/modules/auth/handler.go");
if (fs.existsSync(authHandler)) {
  const h = fs.readFileSync(authHandler, "utf-8");
  const endpoints = [
    { pattern: "login",           label: "POST /auth/login" },
    { pattern: "refresh",         label: "POST /auth/refresh" },
    { pattern: "logout",          label: "POST /auth/logout" },
    { pattern: "forgot",          label: "POST /auth/forgot-password" },
    { pattern: "reset",           label: "POST /auth/reset-password" },
    { pattern: "invitation",      label: "POST /auth/accept-invitation" },
    { pattern: "activate",        label: "GET/POST /auth/activate" },
  ];
  for (const ep of endpoints) {
    if (h.includes(ep.pattern)) pass(ep.label);
    else skip(`${ep.label} — not found in auth handler`);
  }
} else {
  fail("auth/handler.go not found");
}

// 4. Invitation flow
console.log("\n4. Invitation / activation token flow");
const allGoContent = goFiles.map(f => ({ file: f, content: fs.readFileSync(f, "utf-8") }));
const invTokenFiles = allGoContent.filter(({ content }) =>
  content.includes("invitation_token") || content.includes("InvitationToken") ||
  content.includes("activation_token") || content.includes("ActivationToken")
);
if (invTokenFiles.length > 0) {
  pass(`Invitation/activation tokens found in ${invTokenFiles.length} file(s)`);
  invTokenFiles.forEach(({ file }) => console.log(`     └─ ${path.relative(ROOT, file)}`));
} else {
  skip("No invitation/activation token logic found — users may be created with temp passwords");
}

// Check if users table has invitation_token column
const mysqlMigrDir = path.join(ROOT, "backend", "migrations_mysql");
const sqlFiles = fs.existsSync(mysqlMigrDir)
  ? fs.readdirSync(mysqlMigrDir).filter(f => f.endsWith(".sql"))
  : [];
const hasInvToken = sqlFiles.some(f => {
  const c = fs.readFileSync(path.join(mysqlMigrDir, f), "utf-8");
  return c.includes("invitation_token") || c.includes("activation_token");
});
if (hasInvToken) {
  pass("invitation_token or activation_token column in DB migrations");
} else {
  skip("No invitation_token column in migrations — users created with auto-generated passwords");
}

// 5. Email sending for invitations
console.log("\n5. Email sending for invitations/credentials");
const emailFiles = allGoContent.filter(({ content }) =>
  content.includes("SendEmail") || content.includes("SendTemplate") ||
  content.includes("resend") || content.includes("email.Send")
);
if (emailFiles.length > 0) {
  pass(`Email sending found in ${emailFiles.length} file(s)`);
} else {
  skip("No email sending found — invitations may not be emailed (check RESEND_API_KEY)");
}

const emailPkg = path.join(ROOT, "backend/internal/pkg/email");
if (fs.existsSync(emailPkg)) {
  pass("backend/internal/pkg/email package exists");
} else {
  fail("backend/internal/pkg/email package NOT found");
}

// 6. Frontend login page
console.log("\n6. Frontend auth pages");
const loginPage = path.join(ROOT, "frontend/app/login/page.tsx");
if (fs.existsSync(loginPage)) {
  const c = fs.readFileSync(loginPage, "utf-8");
  if (c.includes("password") || c.includes("email")) {
    pass("Login page has email/password form");
  } else {
    fail("Login page may be missing form fields");
  }
} else {
  fail("frontend/app/login/page.tsx not found");
}

const resetPage = path.join(ROOT, "frontend/app/reset-password/page.tsx");
const forgotPage = path.join(ROOT, "frontend/app/forgot-password/page.tsx");
if (fs.existsSync(resetPage))  pass("reset-password page exists");
else skip("reset-password page not found");
if (fs.existsSync(forgotPage)) pass("forgot-password page exists");
else skip("forgot-password page not found");

// 7. Default/test credentials check
console.log("\n7. Default test credentials check");
const envPath = path.join(ROOT, "backend", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  if (envContent.match(/ADMIN_PASSWORD\s*=\s*(password|admin|123456|test)/i)) {
    fail("Weak default admin password detected in .env");
  } else {
    pass("No obvious weak default admin password in .env");
  }
}

// Summary
console.log(`
────────────────────────────────────────────────────
  ✅ Passed  : ${passed}
  ❌ Failed  : ${failed}
  ⬜ Skipped : ${skipped}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
