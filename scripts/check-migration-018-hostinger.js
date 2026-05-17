#!/usr/bin/env node
/**
 * check-migration-018-hostinger.js
 * Validates that the Hostinger-fixed migration 018 is MariaDB-safe:
 *   - No ENUM keywords
 *   - No PostgreSQL syntax ($1 placeholders, TIMESTAMPTZ, gen_random_uuid, SERIAL)
 *   - Uses IF NOT EXISTS
 *   - All expected kinder_* and preschool_* tables are present
 *   - No secrets or password_hash columns
 */

const fs = require('fs');
const path = require('path');

const FIXED_FILE = path.join(
  __dirname,
  '../backend/migrations_mysql/018_kinder_preschool_data_tables.hostinger_fixed.sql'
);

const ORIGINAL_FILE = path.join(
  __dirname,
  '../backend/migrations_mysql/018_kinder_preschool_data_tables.sql'
);

const EXPECTED_TABLES = [
  'kinder_daily_logs',
  'kinder_meals',
  'kinder_naps',
  'kinder_diapers',
  'kinder_mood',
  'kinder_incidents',
  'pickup_authorizations',
  'preschool_qualitative_assessments',
  'preschool_observations',
  'preschool_evidence',
];

let pass = 0;
let fail = 0;

function ok(label) {
  console.log(`  ✅ ${label}`);
  pass++;
}

function ko(label, detail) {
  console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
  fail++;
}

function check(label, condition, detail) {
  if (condition) ok(label);
  else ko(label, detail);
}

// ── Load files ────────────────────────────────────────────────────────────────
console.log('\n📋  check-migration-018-hostinger.js\n');

if (!fs.existsSync(FIXED_FILE)) {
  console.error(`❌  FATAL: Fixed file not found:\n    ${FIXED_FILE}`);
  process.exit(1);
}

const fixed = fs.readFileSync(FIXED_FILE, 'utf8');
const fixedUpper = fixed.toUpperCase();

// ── Section 1: No ENUM ────────────────────────────────────────────────────────
console.log('── 1. No ENUM keywords ──────────────────────────────────────────');

const enumMatches = fixed.match(/\bENUM\s*\(/gi) || [];
check(
  `Zero ENUM( occurrences (found ${enumMatches.length})`,
  enumMatches.length === 0,
  enumMatches.length > 0 ? `Found at: ${enumMatches.join(', ')}` : ''
);

// ── Section 2: No PostgreSQL syntax ──────────────────────────────────────────
console.log('\n── 2. No PostgreSQL syntax ──────────────────────────────────────');

const pgPlaceholders = (fixed.match(/\$\d+/g) || []);
check(
  `No $N parameter placeholders (found ${pgPlaceholders.length})`,
  pgPlaceholders.length === 0
);

check('No TIMESTAMPTZ', !fixedUpper.includes('TIMESTAMPTZ'));
check('No gen_random_uuid()', !fixedUpper.includes('GEN_RANDOM_UUID'));
check('No SERIAL keyword', !/\bSERIAL\b/i.test(fixed));
check('No CREATE SEQUENCE', !fixedUpper.includes('CREATE SEQUENCE'));

// ── Section 3: MariaDB/MySQL best practices ───────────────────────────────────
console.log('\n── 3. MariaDB/MySQL best practices ──────────────────────────────');

check('Uses IF NOT EXISTS', fixedUpper.includes('IF NOT EXISTS'));
check('Uses ENGINE=InnoDB', fixedUpper.includes('ENGINE=INNODB'));
check('Uses utf8mb4 charset', fixedUpper.includes('UTF8MB4'));
check('Uses CHAR(36) for UUIDs (not UUID type)', fixed.includes('CHAR(36)'));
check('Uses TINYINT(1) for booleans', fixed.includes('TINYINT(1)'));
check('No raw BOOLEAN keyword', !/\bBOOLEAN\b/i.test(fixed));

// ── Section 4: All expected tables present ────────────────────────────────────
console.log('\n── 4. Expected tables present ───────────────────────────────────');

for (const table of EXPECTED_TABLES) {
  const pattern = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${table}\\s*\\(`, 'i');
  check(`Table: ${table}`, pattern.test(fixed));
}

// ── Section 5: No secrets / dangerous columns ─────────────────────────────────
console.log('\n── 5. No secrets or dangerous content ───────────────────────────');

check('No password_hash column', !fixed.includes('password_hash'));
check('No secret column', !fixedUpper.includes('SECRET'));
check('No access_token column', !fixedUpper.includes('ACCESS_TOKEN'));
check('No private_key column', !fixedUpper.includes('PRIVATE_KEY'));

// ── Section 6: Compare ENUM count with original ───────────────────────────────
console.log('\n── 6. Comparison with original file ─────────────────────────────');

if (fs.existsSync(ORIGINAL_FILE)) {
  const original = fs.readFileSync(ORIGINAL_FILE, 'utf8');
  const origEnums = (original.match(/\bENUM\s*\(/gi) || []).length;
  const fixedEnums = (fixed.match(/\bENUM\s*\(/gi) || []).length;
  const origVarchar = (original.match(/VARCHAR\(40\)/gi) || []).length;
  const fixedVarchar = (fixed.match(/VARCHAR\(40\)/gi) || []).length;

  console.log(`  ℹ️  Original ENUMs: ${origEnums}  →  Fixed ENUMs: ${fixedEnums}`);
  console.log(`  ℹ️  Original VARCHAR(40): ${origVarchar}  →  Fixed VARCHAR(40): ${fixedVarchar}`);

  check(
    `Fixed has more VARCHAR(40) than original (${fixedVarchar} > ${origVarchar})`,
    fixedVarchar > origVarchar
  );
  check(
    `Fixed has fewer ENUMs than original (${fixedEnums} < ${origEnums})`,
    fixedEnums < origEnums
  );
} else {
  console.log('  ⚠️  Original file not found, skipping comparison');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────────────────────');
console.log(`  Total: ${pass + fail} checks   ✅ ${pass} passed   ❌ ${fail} failed`);

if (fail === 0) {
  console.log('\n  🎉  Migration 018 Hostinger-fixed file is MariaDB-safe!\n');
  console.log('  Apply in phpMyAdmin with: Import → select the .hostinger_fixed.sql file\n');
} else {
  console.log(`\n  ⚠️   ${fail} check(s) failed — fix before applying to Hostinger\n`);
  process.exit(1);
}
