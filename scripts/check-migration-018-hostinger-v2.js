#!/usr/bin/env node
// ============================================================
// Check Migration 018 Hostinger v2 — Ultra-strict validation
// Fails if ANY forbidden pattern is found
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const V2_FILE = path.join(ROOT, 'backend/migrations_mysql/018_kinder_preschool_data_tables.hostinger_v2.sql');
const PARTS_DIR = path.join(ROOT, 'backend/migrations_mysql/018_hostinger_parts');

const EXPECTED_PARTS = [
  '01_kinder_daily_logs.sql',
  '02_kinder_meals.sql',
  '03_kinder_naps.sql',
  '04_kinder_diapers.sql',
  '05_kinder_mood.sql',
  '06_kinder_incidents.sql',
  '07_kinder_pickup_authorizations.sql',
  '08_preschool_qualitative_assessments.sql',
  '09_preschool_development_areas.sql',
  '10_preschool_observations.sql',
  '11_preschool_evidence.sql',
];

const FORBIDDEN_PATTERNS = [
  { regex: /\bENUM\s*\(/i, label: 'ENUM(' },
  { regex: /\bJSON\b/i, label: 'JSON type' },
  { regex: /\bCHECK\s*\(/i, label: 'CHECK(' },
  { regex: /DEFAULT\s*\(\s*UUID\(\)\s*\)/i, label: 'DEFAULT (UUID())' },
  { regex: /DEFAULT\s+UUID\(\)/i, label: 'DEFAULT UUID()' },
  { regex: /DEFAULT\s*\(\s*CURRENT_DATE\s*\)/i, label: 'DEFAULT (CURRENT_DATE)' },
  { regex: /[`\s,]portion[`\s,]/i, label: 'column named portion' },
  { regex: /[`\s,]food_note[`\s,]/i, label: 'column named food_note' },
  { regex: /^\s*`?type`?\s+(CHAR|VARCHAR|INT|TEXT|TINYINT|DATETIME|DATE|TIME)/im, label: 'column named type (reserved word)' },
  { regex: /^\s*`?status`?\s+(CHAR|VARCHAR|INT|TEXT|TINYINT|DATETIME|DATE|TIME)/im, label: 'column named status (reserved word)' },
  { regex: /^\s*`?date`?\s+(CHAR|VARCHAR|INT|TEXT|TINYINT|DATETIME|DATE|TIME)/im, label: 'column named date (reserved word)' },
  { regex: /^\s*`?time`?\s+(CHAR|VARCHAR|INT|TEXT|TINYINT|DATETIME|DATE|TIME)/im, label: 'column named time (reserved word)' },
];

let passed = 0;
let failed = 0;

function check(condition, msg) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

console.log('\n🗄️  MIGRATION 018 HOSTINGER v2 — STRICT VALIDATION\n');

// ── 1. File existence ─────────────────────────────────────────────────────────
console.log('1. File existence');
check(fs.existsSync(V2_FILE), `v2 file exists: 018_kinder_preschool_data_tables.hostinger_v2.sql`);
check(fs.existsSync(PARTS_DIR), `parts directory exists: 018_hostinger_parts/`);

for (const part of EXPECTED_PARTS) {
  const partPath = path.join(PARTS_DIR, part);
  check(fs.existsSync(partPath), `part exists: ${part}`);
}

// ── 2. Forbidden patterns in v2 file ──────────────────────────────────────────
console.log('\n2. Forbidden patterns in v2 file');
if (fs.existsSync(V2_FILE)) {
  const v2Content = fs.readFileSync(V2_FILE, 'utf-8');
  const lines = v2Content.split('\n');

  for (const { regex, label } of FORBIDDEN_PATTERNS) {
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith('--')) continue;
      if (regex.test(line)) {
        found = true;
        console.log(`  ❌ FORBIDDEN: "${label}" at line ${i + 1}: ${line.trim()}`);
        failed++;
        break;
      }
    }
    if (!found) {
      check(true, `No forbidden "${label}" in DDL`);
    }
  }
}

// ── 3. Forbidden patterns in parts ────────────────────────────────────────────
console.log('\n3. Forbidden patterns in parts');
for (const part of EXPECTED_PARTS) {
  const partPath = path.join(PARTS_DIR, part);
  if (!fs.existsSync(partPath)) continue;
  const content = fs.readFileSync(partPath, 'utf-8');
  const lines = content.split('\n');
  let partClean = true;

  for (const { regex, label } of FORBIDDEN_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith('--')) continue;
      if (regex.test(line)) {
        console.log(`  ❌ ${part}: FORBIDDEN "${label}" at line ${i + 1}`);
        failed++;
        partClean = false;
        break;
      }
    }
  }
  if (partClean) {
    check(true, `${part}: clean (no forbidden patterns)`);
  }
}

// ── 4. Each part has exactly one CREATE TABLE ─────────────────────────────────
console.log('\n4. Each part has exactly one CREATE TABLE');
for (const part of EXPECTED_PARTS) {
  const partPath = path.join(PARTS_DIR, part);
  if (!fs.existsSync(partPath)) continue;
  const content = fs.readFileSync(partPath, 'utf-8');
  const createCount = (content.match(/CREATE TABLE/gi) || []).length;
  check(createCount === 1, `${part}: ${createCount} CREATE TABLE statement(s)`);
}

// ── 5. kinder_meals specific checks ──────────────────────────────────────────
console.log('\n5. kinder_meals column naming');
const mealsPartPath = path.join(PARTS_DIR, '02_kinder_meals.sql');
if (fs.existsSync(mealsPartPath)) {
  const mealsContent = fs.readFileSync(mealsPartPath, 'utf-8');
  check(mealsContent.includes('meal_portion'), 'kinder_meals uses meal_portion (not portion)');
  check(mealsContent.includes('meal_note'), 'kinder_meals uses meal_note (not food_note)');
  check(!mealsContent.includes('DEFAULT (UUID())'), 'kinder_meals: no DEFAULT (UUID())');
}

// ── 6. All tables use ENGINE=InnoDB ───────────────────────────────────────────
console.log('\n6. ENGINE and CHARSET');
if (fs.existsSync(V2_FILE)) {
  const v2Content = fs.readFileSync(V2_FILE, 'utf-8');
  const v2Lines = v2Content.split('\n').filter(l => !l.trimStart().startsWith('--'));
  const v2Code = v2Lines.join('\n');
  const tableCount = (v2Code.match(/CREATE TABLE/gi) || []).length;
  const innodbCount = (v2Code.match(/ENGINE=InnoDB/g) || []).length;
  const utf8mb4Count = (v2Code.match(/utf8mb4/g) || []).length;
  check(innodbCount === tableCount, `All ${tableCount} tables use ENGINE=InnoDB (found ${innodbCount})`);
  check(utf8mb4Count >= tableCount, `All tables use utf8mb4 charset (found ${utf8mb4Count} refs)`);
}

// ── 7. Backend INSERT statements include explicit id ──────────────────────────
console.log('\n7. Backend INSERT includes explicit id');
const GO_FILES = [
  'backend/internal/modules/teacher/kinder_preschool.go',
  'backend/internal/modules/school_admin/kinder.go',
  'backend/internal/modules/school_admin/preschool.go',
];

const INSERT_TABLES = [
  'kinder_daily_logs', 'kinder_meals', 'kinder_naps', 'kinder_diapers',
  'kinder_mood', 'kinder_incidents', 'pickup_authorizations',
  'preschool_qualitative_assessments', 'preschool_observations', 'preschool_evidence',
];

for (const goFile of GO_FILES) {
  const filePath = path.join(ROOT, goFile);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');

  for (const table of INSERT_TABLES) {
    const insertRegex = new RegExp(`INSERT INTO ${table}\\s*\\(([^)]+)\\)\\s*VALUES\\s*\\(([^)]+)\\)`, 'gi');
    let match;
    while ((match = insertRegex.exec(content)) !== null) {
      const cols = match[1];
      const vals = match[2];
      // Skip PostgreSQL-only queries (use $N placeholders, never run on MySQL)
      if (/\$\d/.test(vals) && !/\?/.test(vals)) continue;
      const hasId = /\bid\b/.test(cols);
      check(hasId, `${path.basename(goFile)}: INSERT INTO ${table} includes id column`);
    }
  }
}

// ── 8. Backend uses meal_portion and meal_note (not portion/food_note) ────────
console.log('\n8. Backend column rename verification');
for (const goFile of GO_FILES) {
  const filePath = path.join(ROOT, goFile);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('kinder_meals')) {
    const hasMealPortion = content.includes('meal_portion');
    const hasOldPortion = /[^_]portion[^s_]/.test(content.replace(/json:"portion"/g, '').replace(/Portion/g, ''));
    check(hasMealPortion, `${path.basename(goFile)}: uses meal_portion in SQL`);

    const hasMealNote = content.includes('meal_note');
    check(hasMealNote, `${path.basename(goFile)}: uses meal_note in SQL`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);

if (failed > 0) {
  console.log(`\n  🚨 ${failed} issue(s) found — fix before deploying to Hostinger\n`);
  process.exit(1);
} else {
  console.log(`\n  ✨ All checks pass — safe to import in Hostinger\n`);
  process.exit(0);
}
