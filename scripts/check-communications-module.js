#!/usr/bin/env node
/**
 * check-communications-module.js
 * Verifica que el módulo de Comunicaciones responda correctamente en producción.
 *
 * Uso:
 *   SCHOOL_ADMIN_EMAIL=admin@escuela.com SCHOOL_ADMIN_PASSWORD=pass node scripts/check-communications-module.js
 *
 * También acepta AUTH_TOKEN directamente si ya tienes un JWT:
 *   AUTH_TOKEN=eyJ... node scripts/check-communications-module.js
 */

const BASE_URL = process.env.API_BASE_URL || "https://educore-production.up.railway.app";
const EMAIL = process.env.SCHOOL_ADMIN_EMAIL;
const PASSWORD = process.env.SCHOOL_ADMIN_PASSWORD;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

const TENANT_SLUG = process.env.TENANT_SLUG || "";

async function request(path, options = {}, token) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(TENANT_SLUG ? { "X-Tenant-Slug": TENANT_SLUG } : {}),
  };
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  let body = {};
  try { body = await res.json(); } catch (_) {}
  return { status: res.status, ok: res.ok, body };
}

function pass(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); process.exitCode = 1; }
function info(msg) { console.log(`  ℹ️  ${msg}`); }

async function main() {
  console.log(`\n🔍 Communications Module Check — ${BASE_URL}\n`);

  // 1. Autenticación
  let token = AUTH_TOKEN;
  if (!token) {
    if (!EMAIL || !PASSWORD) {
      fail("Necesitas SCHOOL_ADMIN_EMAIL + SCHOOL_ADMIN_PASSWORD o AUTH_TOKEN");
      process.exit(1);
    }
    const auth = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!auth.ok || !auth.body?.data?.access_token) {
      fail(`Login fallido (${auth.status}): ${JSON.stringify(auth.body?.error || auth.body)}`);
      process.exit(1);
    }
    token = auth.body.data.access_token;
    pass(`Login OK (role: ${auth.body.data.role})`);
  } else {
    pass("Token provisto externamente");
  }

  // 2. GET /communications (lista)
  const list = await request("/api/v1/school-admin/communications", {}, token);
  if (list.status === 500) {
    fail(`GET /communications → 500. Probable Error 1146 (tabla school_communications inexistente). Aplica migración 008_school_communications.sql`);
  } else if (list.ok) {
    const count = Array.isArray(list.body?.data?.communications) ? list.body.data.communications.length : "?";
    pass(`GET /communications → 200 (${count} registros)`);
  } else {
    fail(`GET /communications → ${list.status}: ${JSON.stringify(list.body?.error || list.body)}`);
  }

  // 3. GET /communications/stats
  const stats = await request("/api/v1/school-admin/communications/stats", {}, token);
  if (stats.status === 500) {
    fail(`GET /communications/stats → 500. Probable COUNT(*) FILTER syntax o tabla faltante`);
  } else if (stats.ok) {
    const d = stats.body?.data || {};
    pass(`GET /communications/stats → 200 (total=${d.total_messages ?? "?"}, sent=${d.sent_messages ?? "?"})`);
  } else {
    fail(`GET /communications/stats → ${stats.status}: ${JSON.stringify(stats.body?.error || stats.body)}`);
  }

  // 4. POST /communications (crear borrador)
  const create = await request("/api/v1/school-admin/communications", {
    method: "POST",
    body: JSON.stringify({
      title: "[Test] Verificación automática",
      content: "Este mensaje fue generado por el script check-communications-module.js",
      type: "announcement",
      priority: "normal",
      recipient_type: "role",
      recipient_id: "parents",
    }),
  }, token);
  let createdId = null;
  if (create.ok) {
    createdId = create.body?.data?.id;
    pass(`POST /communications → 201/200 (id=${createdId})`);
  } else if (create.status === 500) {
    fail(`POST /communications → 500. Tabla school_communications falta o INSERT falla`);
  } else {
    fail(`POST /communications → ${create.status}: ${JSON.stringify(create.body?.error || create.body)}`);
  }

  // 5. DELETE borrador de prueba si se creó
  if (createdId) {
    const del = await request(`/api/v1/school-admin/communications/${createdId}`, { method: "DELETE" }, token);
    if (del.ok) {
      pass(`DELETE /communications/${createdId} → OK (limpieza)`);
    } else {
      info(`DELETE /communications/${createdId} → ${del.status} (no crítico)`);
    }
  }

  console.log(`\n${process.exitCode ? "❌ Hay fallos." : "✅ Módulo de Comunicaciones OK."}\n`);
}

main().catch((err) => { console.error("Error inesperado:", err); process.exit(1); });
