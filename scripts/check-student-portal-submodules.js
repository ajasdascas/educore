#!/usr/bin/env node
/**
 * check-student-portal-submodules.js
 * Valida que el Student Portal no tenga SQL inválido para MySQL,
 * que todas las rutas tengan páginas correspondientes, y que no haya
 * mock data sin etiquetar.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); failures++; };
const info = (msg) => console.log(`  ℹ️  ${msg}`);

let failures = 0;

// ─── 1. NO TO_CHAR en backend/internal/modules/student ──────────────────────
console.log("\n[1] Sintaxis MySQL en student repository");
const repoPath = path.join(ROOT, "backend/internal/modules/student/repository.go");
if (!fs.existsSync(repoPath)) {
  fail("repository.go no encontrado");
} else {
  const src = fs.readFileSync(repoPath, "utf8");
  // TO_CHAR en SQL real (no en comentarios)
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (/TO_CHAR\s*\(/.test(line)) {
      fail(`TO_CHAR encontrado en línea ${i + 1}: ${line.trim()}`);
    }
  });
  if (failures === 0) pass("No hay TO_CHAR en SQL real");

  // Verificar que sí usa DATE_FORMAT / TIME_FORMAT
  if (src.includes("DATE_FORMAT")) pass("DATE_FORMAT presente");
  else fail("DATE_FORMAT no encontrado — posible regresión");

  if (src.includes("TIME_FORMAT")) pass("TIME_FORMAT presente para columnas TIME");
  else fail("TIME_FORMAT no encontrado — class_schedule_blocks.start_time es TIME");

  // notifications: asegurar que usa user_id, no recipient_id
  const notifBlock = src.match(/GetNotifications[\s\S]*?^}/m)?.[0] || src;
  if (/n\.user_id/.test(src)) pass("notifications usa n.user_id (columna correcta)");
  else fail("notifications puede estar usando columna incorrecta (debe ser n.user_id)");
  if (/recipient_id/.test(notifBlock.replace(/\/\/.*/g, ""))) {
    fail("GetNotifications usa recipient_id — no existe en tabla notifications");
  }
}

// ─── 2. Rutas registradas en handler.go ────────────────────────────────────
console.log("\n[2] Rutas del Student Portal registradas en backend");
const handlerPath = path.join(ROOT, "backend/internal/modules/student/handler.go");
const requiredRoutes = ["messages", "assignments", "schedule", "notifications", "profile", "grades", "attendance", "dashboard"];
if (!fs.existsSync(handlerPath)) {
  fail("handler.go no encontrado");
} else {
  const src = fs.readFileSync(handlerPath, "utf8");
  requiredRoutes.forEach((route) => {
    if (src.includes(`"/${route}"`)) pass(`Ruta /${route} registrada`);
    else fail(`Ruta /${route} NO registrada en handler.go`);
  });
}

// ─── 3. Páginas frontend existen ───────────────────────────────────────────
console.log("\n[3] Páginas frontend del Student Portal");
const studentPages = [
  "dashboard",
  "profile",
  "grades",
  "attendance",
  "assignments",
  "schedule",
  "messages",
  "notifications",
  "settings",
];
studentPages.forEach((page) => {
  const p = path.join(ROOT, `frontend/app/student/${page}/page.tsx`);
  if (fs.existsSync(p)) pass(`/student/${page}/page.tsx existe`);
  else fail(`/student/${page}/page.tsx NO existe`);
});

// ─── 4. Páginas no tienen mock data sin etiquetar ──────────────────────────
console.log("\n[4] Datos mock en páginas del Student Portal");
const mockPatterns = [
  { pattern: /Juan\s+Pérez|María\s+García|Carlos\s+López/i, label: "nombre de persona hardcoded" },
  { pattern: /245\s+estudiantes|18\s+profesores|12\s+grupos/i, label: "estadísticas hardcoded" },
  { pattern: /teacher-maria-lopez|teacher-carlos-rivera/i, label: "ID de profesor hardcoded" },
  { pattern: /modo\s+demo/i, label: 'string "modo demo"' },
  { pattern: /onlineu\.mx|escuela-demo|demo-school/i, label: "URL o slug de demo hardcoded" },
];
studentPages.forEach((page) => {
  const p = path.join(ROOT, `frontend/app/student/${page}/page.tsx`);
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, "utf8");
  mockPatterns.forEach(({ pattern, label }) => {
    if (pattern.test(src)) fail(`/student/${page}: contiene ${label}`);
  });
});
if (failures === 0) pass("Sin mock data detectado en páginas de student");

// ─── 5. Tablas existen en migraciones MySQL ─────────────────────────────────
console.log("\n[5] Tablas requeridas en migraciones MySQL");
const migDir = path.join(ROOT, "backend/migrations_mysql");
const allMigSQL = fs.readdirSync(migDir)
  .filter((f) => f.endsWith(".sql") && !f.startsWith("000"))
  .map((f) => fs.readFileSync(path.join(migDir, f), "utf8"))
  .join("\n");

const requiredTables = [
  "parent_messages",
  "student_assignments",
  "class_schedule_blocks",
  "notifications",
  "subjects",
  "group_students",
];
requiredTables.forEach((table) => {
  if (allMigSQL.includes(`CREATE TABLE IF NOT EXISTS ${table}`) ||
      allMigSQL.includes(`CREATE TABLE IF NOT EXISTS \`${table}\``)) {
    pass(`Tabla ${table} definida en migraciones`);
  } else {
    fail(`Tabla ${table} NO encontrada en migraciones MySQL`);
  }
});

// ─── 6. class_schedule_blocks.start_time / end_time son TIME ───────────────
console.log("\n[6] Tipos de columna en class_schedule_blocks");
const scheduleMatch = allMigSQL.match(/CREATE TABLE IF NOT EXISTS class_schedule_blocks[\s\S]*?(?=CREATE TABLE|$)/);
if (scheduleMatch) {
  const def = scheduleMatch[0];
  if (/start_time\s+TIME/i.test(def)) pass("start_time es TIME — TIME_FORMAT es correcto");
  else fail("start_time no es TIME — revisar tipo de columna");
  if (/end_time\s+TIME/i.test(def)) pass("end_time es TIME — TIME_FORMAT es correcto");
  else fail("end_time no es TIME — revisar tipo de columna");
} else {
  info("No se pudo extraer definición de class_schedule_blocks para verificar tipos");
}

// ─── 7. notifications usa user_id (no recipient_id) ────────────────────────
console.log("\n[7] Columna user_id en tabla notifications");
const notifMatch = allMigSQL.match(/CREATE TABLE IF NOT EXISTS notifications[\s\S]*?(?=CREATE TABLE|$)/);
if (notifMatch) {
  const def = notifMatch[0];
  if (/\buser_id\b/.test(def)) pass("notifications.user_id existe en schema");
  else fail("notifications.user_id NO encontrado — revisar schema");
  if (/\brecipient_id\b/.test(def)) fail("notifications tiene recipient_id — ajustar query si se usa");
  else pass("notifications NO tiene recipient_id — query usa user_id correctamente");
  if (/\bis_read\b/.test(def)) pass("notifications.is_read existe — se puede usar directamente");
} else {
  info("No se pudo extraer definición de notifications para verificar columnas");
}

// ─── 8. parent/messages frontend usa API real ──────────────────────────────
console.log("\n[8] Parent messages: sin recipientes hardcoded");
const parentMsgPath = path.join(ROOT, "frontend/app/parent/messages/page.tsx");
if (fs.existsSync(parentMsgPath)) {
  const src = fs.readFileSync(parentMsgPath, "utf8");
  if (/teacher-maria-lopez|teacher-carlos-rivera|id:\s*["']teacher-/i.test(src)) {
    fail("parent/messages: recipientes hardcoded detectados");
  } else {
    pass("parent/messages: sin recipientes hardcoded");
  }
  if (/authFetch.*children.*teachers|children.*authFetch/is.test(src)) {
    pass("parent/messages: llama a API de teachers");
  } else if (/authFetch/.test(src)) {
    pass("parent/messages: usa authFetch (verificar que llame endpoint real)");
  } else {
    fail("parent/messages: no usa authFetch");
  }
}

// ─── Resumen ─────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(60));
if (failures === 0) {
  console.log("✅ Todos los checks pasaron. Student Portal listo para push.\n");
  process.exit(0);
} else {
  console.error(`❌ ${failures} problema(s) encontrado(s). Corregir antes de push.\n`);
  process.exit(1);
}
