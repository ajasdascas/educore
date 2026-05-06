#!/usr/bin/env node
/**
 * Backfill: Apply education level module templates to existing schools.
 * Run once after deploying migration 017.
 *
 * Usage:
 *   DB_URL="mysql://user:pass@host:3306/educore" node scripts/backfill-school-module-templates.js
 *   DB_URL="mysql://user:pass@host:3306/educore" node scripts/backfill-school-module-templates.js --dry-run
 */

const mysql = require("mysql2/promise");

const DRY_RUN = process.argv.includes("--dry-run");

const modulesByEducationLevel = {
  babies:  ["academic_core","users","students","groups","schedules","documents","communications","daily_logs","meals","naps","diapers","mood","health_checks","incidents","pickup_authorizations","milestones","photos_evidence","attendance"],
  daycare: ["academic_core","users","students","groups","schedules","documents","communications","daily_logs","meals","naps","diapers","mood","health_checks","incidents","pickup_authorizations","milestones","photos_evidence","attendance"],
  kinder:  ["academic_core","users","students","groups","schedules","documents","communications","daily_logs","meals","naps","diapers","mood","health_checks","incidents","pickup_authorizations","milestones","photos_evidence","attendance","reports"],
  preescolar: ["academic_core","users","students","groups","schedules","attendance","documents","reports","communications","qualitative_assessments","development_areas","observations","activities","behavior_notes","preschool_report_cards"],
  primaria: ["academic_core","users","students","groups","schedules","attendance","grades","grading","report_cards","documents","reports","communications","subjects","assignments","exams","classroom"],
  secundaria: ["academic_core","users","students","groups","schedules","attendance","grades","grading","report_cards","documents","reports","communications","subjects","assignments","exams","classroom","extracurriculars"],
  preparatoria: ["academic_core","users","students","groups","schedules","attendance","grades","grading","report_cards","documents","reports","communications","subjects","assignments","exams","classroom","extracurriculars"],
};

function normalizeLevel(raw) {
  if (!raw) return "primaria";
  const s = raw.toLowerCase().trim();
  if (s.includes("kinder") || s.includes("estancia") || s.includes("inicial")) return "kinder";
  if (s.includes("preescolar") || s.includes("jardin") || s.includes("jardín")) return "preescolar";
  if (s.includes("primaria")) return "primaria";
  if (s.includes("secundaria")) return "secundaria";
  if (s.includes("preparatoria") || s.includes("bachillerato") || s.includes("prepa")) return "preparatoria";
  if (s.includes("daycare") || s.includes("guarderia") || s.includes("guardería")) return "daycare";
  if (s.includes("babies") || s.includes("lactantes")) return "babies";
  return "primaria";
}

async function newUUID(conn) {
  const [[row]] = await conn.query("SELECT UUID() AS id");
  return row.id;
}

async function main() {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    console.error("❌ DB_URL environment variable is required");
    process.exit(1);
  }

  console.log(`\nEduCore — Backfill School Module Templates${DRY_RUN ? " (DRY RUN)" : ""}\n`);

  const conn = await mysql.createConnection(dbUrl);

  try {
    // Get all active tenants with their school level info
    const [tenants] = await conn.query(`
      SELECT t.id AS tenant_id, t.name,
             GROUP_CONCAT(sl.level_key) AS level_keys
      FROM tenants t
      LEFT JOIN school_levels sl ON sl.tenant_id = t.id AND sl.enabled = 1
      WHERE t.status = 'active'
      GROUP BY t.id, t.name
    `);

    console.log(`Found ${tenants.length} active tenants\n`);

    let totalActivated = 0;
    let totalSkipped = 0;

    for (const tenant of tenants) {
      const rawLevels = tenant.level_keys ? tenant.level_keys.split(",") : ["primaria"];
      const levels = [...new Set(rawLevels.map(normalizeLevel))];
      const allModules = new Set();

      for (const level of levels) {
        const mods = modulesByEducationLevel[level] || modulesByEducationLevel.primaria;
        mods.forEach((m) => allModules.add(m));
      }

      console.log(`  Tenant: ${tenant.name} (${tenant.tenant_id})`);
      console.log(`  Levels: ${levels.join(", ")}`);
      console.log(`  Modules to ensure: ${[...allModules].join(", ")}`);

      let activatedCount = 0;
      for (const moduleKey of allModules) {
        // Check if module key exists in catalog
        const [[catalogRow]] = await conn.query(
          "SELECT 1 FROM modules_catalog WHERE `key` = ? LIMIT 1",
          [moduleKey]
        );
        if (!catalogRow) {
          console.log(`    ⚠️  Module key '${moduleKey}' not in catalog — skipping`);
          totalSkipped++;
          continue;
        }

        // Check if already active for this tenant
        const [[existing]] = await conn.query(
          "SELECT 1 FROM tenant_modules WHERE tenant_id = ? AND module_key = ? LIMIT 1",
          [tenant.tenant_id, moduleKey]
        );

        if (existing) {
          // Already active — ensure it's enabled
          if (!DRY_RUN) {
            await conn.query(
              "UPDATE tenant_modules SET enabled = 1 WHERE tenant_id = ? AND module_key = ?",
              [tenant.tenant_id, moduleKey]
            );
          }
        } else {
          // Insert new
          if (!DRY_RUN) {
            const id = await newUUID(conn);
            await conn.query(
              "INSERT INTO tenant_modules (id, tenant_id, module_key, enabled) VALUES (?, ?, ?, 1)",
              [id, tenant.tenant_id, moduleKey]
            );
          }
          activatedCount++;
        }
      }

      totalActivated += activatedCount;
      console.log(`  → ${activatedCount} new modules activated\n`);
    }

    console.log("═".repeat(60));
    console.log(`Backfill complete: ${totalActivated} modules activated, ${totalSkipped} skipped (not in catalog)`);
    if (DRY_RUN) console.log("(DRY RUN — no changes written)");
    console.log("═".repeat(60) + "\n");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
