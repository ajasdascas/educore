const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const migrationPath = path.resolve(
  __dirname,
  "../backend/migrations_mysql/014_backfill_school_grading_scales.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

test("backfills one default grading scale only when a tenant has none", () => {
  assert.match(sql, /INSERT\s+IGNORE\s+INTO\s+school_grading_scales/i);
  assert.match(sql, /FROM\s+tenants\s+t[\s\S]*t\.status\s*=\s*'active'/i);
  assert.match(
    sql,
    /NOT\s+EXISTS\s*\([\s\S]*FROM\s+school_grading_scales\s+sg[\s\S]*sg\.tenant_id\s*=\s*t\.id[\s\S]*\)/i,
  );
});

test("does not mutate or delete existing grading scales", () => {
  assert.doesNotMatch(sql, /\b(?:DELETE|TRUNCATE|DROP|UPDATE)\b/i);
  assert.match(sql, /'Escala default'/);
  assert.match(sql, /JSON_OBJECT\('min',\s*0,\s*'max',\s*100,\s*'passing',\s*60\)/i);
});

test("records an idempotent provisioning event", () => {
  assert.match(sql, /INSERT\s+IGNORE\s+INTO\s+school_provisioning_events/i);
  assert.match(sql, /backfill_grading_scales_014/);
  assert.match(
    sql,
    /NOT\s+EXISTS\s*\([\s\S]*FROM\s+school_provisioning_events\s+spe[\s\S]*spe\.tenant_id\s*=\s*t\.id[\s\S]*spe\.event_type\s*=\s*'backfill_grading_scales_014'/i,
  );
});
