const fs = require('fs');
const path = require('path');

const root = process.cwd();
const reportsDir = path.join(root, 'qa', 'reports');
const checkpointPath = path.join(root, 'qa', 'checkpoints', 'PROGRESS.json');

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toFinalStatus(itemOrStatus) {
  const status = typeof itemOrStatus === 'string' ? itemOrStatus : itemOrStatus.status;
  const actual = typeof itemOrStatus === 'string' ? '' : String(itemOrStatus.actual || '');
  const map = {
    PASS: 'PASS_REAL',
    WARN: 'PARTIAL',
    SKIPPED: 'SKIPPED_NO_CREDENTIALS',
  };
  if (status === 'FAIL') {
    if (/HTTP\s+404\b|status of 404| 404\b/i.test(actual)) return 'FAIL_404';
    if (/HTTP\s+5\d\d\b|status of 5\d\d| 5\d\d\b/i.test(actual)) return 'FAIL_500';
    return 'FAIL_BUTTON_DEAD';
  }
  return map[status] || status;
}

function severityRank(severity) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[severity] ?? 9;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

fs.mkdirSync(reportsDir, { recursive: true });
const e2e = readJSON(path.join(reportsDir, 'e2e-results.json'), {
  generated_at: new Date().toISOString(),
  base_url: 'https://onlineu.mx/educore',
  api_url: 'https://educore-production-beef.up.railway.app',
  results: [],
  bugs: [],
});
const inventory = readJSON(path.join(reportsDir, 'ROUTE_AND_MODULE_INVENTORY.json'), {});
const assets = readJSON(path.join(reportsDir, 'PRODUCTION_ASSETS_REPORT.json'), {});
const progress = readJSON(checkpointPath, {});

const results = (e2e.results || []).map((item) => ({ ...item, final_status: toFinalStatus(item) }));
const bugs = (e2e.bugs || [])
  .map((bug) => ({ ...bug, final_status: toFinalStatus({ status: bug.status || 'FAIL', actual: bug.actual }) }))
  .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
const statusCounts = countBy(results, 'final_status');
const p0 = bugs.filter((bug) => bug.severity === 'P0');
const p1 = bugs.filter((bug) => bug.severity === 'P1');
const route404 = [
  ...(inventory.routes_that_do_not_exist || []).map((route) => ({
    URL: route,
    Rol: 'unknown',
    Desde: 'static href inventory',
    Modulo: '',
    Esperada: 'Frontend page exists',
    Fix: 'Create page or remove/update href.',
  })),
  ...results.filter((item) => item.final_status === 'FAIL_404').map((item) => ({
    URL: item.url,
    Rol: item.role || '',
    Desde: item.area,
    Modulo: item.flow,
    Esperada: item.expected || '',
    Fix: item.recommendation || 'Review route/export/basePath.',
  })),
];

const moduleRows = results.map((item) => ({
  Rol: item.role || 'unknown',
  Nivel: item.school || '',
  Modulo: item.area,
  Submodulo: item.flow,
  Ruta: item.url || '',
  Estado: item.final_status,
  Evidencia: item.evidence || '',
  Comentario: item.actual || '',
}));

const rbacRows = results
  .filter((item) => /security|rbac|access|support/i.test(`${item.area} ${item.flow}`))
  .map((item) => ({
    Area: item.area,
    Flujo: item.flow,
    Estado: item.final_status,
    URL: item.url || '',
    Esperado: item.expected || '',
    Real: item.actual || '',
  }));

const qaObjects = [
  ...(progress.created_qa_objects || []).map((item) => ({ action: 'created', ...item })),
  ...(progress.deleted_qa_objects || []).map((item) => ({ action: 'deleted', ...item })),
];

function writeCSV(file, rows, headers) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ];
  fs.writeFileSync(path.join(reportsDir, file), lines.join('\n') + '\n', 'utf8');
}

writeCSV('BUGS.csv', bugs.map((bug) => ({
  ID: bug.id,
  Severidad: bug.severity,
  Rol: bug.role || '',
  Nivel: bug.school || '',
  URL: bug.url || '',
  Pasos: bug.flow,
  Esperado: bug.expected,
  Real: bug.actual,
  Evidencia: bug.evidence || '',
  Recomendacion: bug.recommendation || '',
})), ['ID', 'Severidad', 'Rol', 'Nivel', 'URL', 'Pasos', 'Esperado', 'Real', 'Evidencia', 'Recomendacion']);

writeCSV('MODULE_ROLE_LEVEL_MATRIX.csv', moduleRows, ['Rol', 'Nivel', 'Modulo', 'Submodulo', 'Ruta', 'Estado', 'Evidencia', 'Comentario']);
writeCSV('ROUTE_404_REPORT.csv', route404, ['URL', 'Rol', 'Desde', 'Modulo', 'Esperada', 'Fix']);
writeCSV('RBAC_IDOR_REPORT.csv', rbacRows, ['Area', 'Flujo', 'Estado', 'URL', 'Esperado', 'Real']);

const finalJSON = {
  generated_at: new Date().toISOString(),
  base_url: e2e.base_url,
  api_url: e2e.api_url,
  ready_to_sell: p0.length === 0 && p1.length === 0 && results.some((item) => item.final_status === 'PASS_REAL') ? 'PARCIAL' : 'NO',
  status_counts: statusCounts,
  p0_count: p0.length,
  p1_count: p1.length,
  pages_inventory_count: (inventory.frontend_routes || []).length,
  module_inventory_count: (inventory.modules_detected || []).length,
  endpoint_inventory_count: (inventory.endpoints_found || []).length,
  route_404_count: route404.length,
  bugs,
  results,
  inventory,
  assets,
  qa_objects: qaObjects,
  scope_guardrails: [
    'Functional QA and safe access-control checks only.',
    'No brute force, fuzzing, auth bypass, exploit payloads, real emails, real payments, or real-data extraction.',
    'Unsafe security paths are SKIPPED_SECURITY_SCOPE.',
  ],
};
fs.writeFileSync(path.join(reportsDir, 'FULL_REAL_PLATFORM_AUDIT.json'), JSON.stringify(finalJSON, null, 2) + '\n');

const areaRows = [
  'Landing', 'Auth', 'Super Admin', 'Planes', 'Escuelas', 'School Admin', 'Teacher', 'Parent', 'Student',
  'Kinder', 'Preescolar', 'Primaria', 'Billing', 'Payments', 'Credenciales', 'Emails', 'Backups',
  'Mensajes', 'Notificaciones', 'Permisos', 'RBAC', 'Tenant isolation', 'Responsive', 'Deploy/static export',
].map((area) => {
  const matches = results.filter((item) => new RegExp(area.replace('/', '|'), 'i').test(`${item.area} ${item.flow}`));
  const failures = matches.filter((item) => /^FAIL/.test(item.final_status));
  const partial = matches.filter((item) => /^PARTIAL|^SKIPPED|REQUIRES/.test(item.final_status));
  return {
    area,
    status: failures.length ? 'FAIL' : partial.length ? 'PARTIAL/SKIPPED' : matches.length ? 'PASS_REAL' : 'SKIPPED_NO_COVERAGE',
    evidence: matches[0]?.evidence || matches[0]?.url || '',
    failures: failures.length,
    pending: partial.length,
    severity: failures.some((item) => item.severity === 'P0') ? 'P0' : failures.some((item) => item.severity === 'P1') ? 'P1' : partial.length ? 'P2' : '',
  };
});

const markdown = [
  '# EduCore Full Real Platform Audit',
  '',
  `Generated: ${finalJSON.generated_at}`,
  `Base URL: ${finalJSON.base_url}`,
  `API URL: ${finalJSON.api_url}`,
  '',
  '## 1. Resumen ejecutivo',
  '',
  `- Listo para vender: **${finalJSON.ready_to_sell}**.`,
  `- P0 encontrados: ${finalJSON.p0_count}.`,
  `- P1 encontrados: ${finalJSON.p1_count}.`,
  `- Rutas frontend inventariadas: ${finalJSON.pages_inventory_count}.`,
  `- Modulos detectados por inventario: ${finalJSON.module_inventory_count}.`,
  `- Endpoints backend detectados: ${finalJSON.endpoint_inventory_count}.`,
  `- Rutas 404/static missing detectadas: ${finalJSON.route_404_count}.`,
  '- Alcance: QA funcional autorizada y control de acceso seguro; no pentesting ofensivo.',
  '',
  '| Estado | Conteo |',
  '| --- | ---: |',
  ...Object.entries(statusCounts).sort().map(([status, count]) => `| ${status} | ${count} |`),
  '',
  '## 2. Tabla por area',
  '',
  '| Area | Estado | Evidencia | Fallas | Pendiente | Severidad |',
  '| --- | --- | --- | ---: | ---: | --- |',
  ...areaRows.map((row) => `| ${row.area} | ${row.status} | ${row.evidence} | ${row.failures} | ${row.pending} | ${row.severity} |`),
  '',
  '## 3. Matriz modulo/submodulo',
  '',
  'Ver `MODULE_ROLE_LEVEL_MATRIX.csv` para la matriz completa.',
  '',
  '## 4. Bugs',
  '',
  bugs.length
    ? '| ID | Severidad | Rol | Nivel | URL | Pasos | Esperado | Real | Evidencia | Recomendacion |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n'
      + bugs.map((bug) => `| ${bug.id} | ${bug.severity} | ${bug.role || ''} | ${bug.school || ''} | ${bug.url || ''} | ${bug.flow} | ${(bug.expected || '').replace(/\|/g, '/')} | ${(bug.actual || '').replace(/\|/g, '/')} | ${bug.evidence || ''} | ${(bug.recommendation || '').replace(/\|/g, '/')} |`).join('\n')
    : 'No se registraron bugs en los resultados disponibles.',
  '',
  '## 5. Rutas 404',
  '',
  route404.length ? 'Ver `ROUTE_404_REPORT.csv`.' : 'No se registraron rutas 404 en el inventario/resultados disponibles.',
  '',
  '## 6. Roles/modulos mal ubicados',
  '',
  'Ver `MODULE_ROLE_LEVEL_MATRIX.csv`; cualquier `PARTIAL_WRONG_ROLE` queda listado ahi.',
  '',
  '## 7. Botones sin accion',
  '',
  'Los botones muertos se reportan como `FAIL_BUTTON_DEAD` en `BUGS.csv` y en la matriz.',
  '',
  '## 8. Funcionalidad de adorno',
  '',
  'Los estados `PASS_EMPTY_STATE`, `PASS_EMPTY_STATE_ACCEPTABLE` y `PARTIAL_EMPTY_STATE_ONLY` indican pantallas sin logica real probada.',
  '',
  '## 9. Seguridad',
  '',
  'Ver `RBAC_IDOR_REPORT.csv`. Las pruebas se limitaron a navegacion normal y APIs propias; cualquier ruta ofensiva se marca `SKIPPED_SECURITY_SCOPE`.',
  '',
  '## 10. Datos QA',
  '',
  qaObjects.length
    ? qaObjects.map((item) => `- ${item.action}: ${item.type || 'object'} ${item.name || item.id || ''}`).join('\n')
    : '- No hay objetos QA registrados como creados/eliminados en `PROGRESS.json`.',
  '',
  '## 11. Recomendaciones finales',
  '',
  '- Arreglar primero cualquier P0/P1 antes de vender.',
  '- Convertir los `SKIPPED_NO_CREDENTIALS` en pruebas reales con credenciales QA locales.',
  '- Mantener storage state, traces, screenshots y videos fuera de Git.',
  '- Ejecutar cleanup antes de cerrar una corrida con mutaciones QA.',
  '',
];

fs.writeFileSync(path.join(reportsDir, 'FULL_REAL_PLATFORM_AUDIT.md'), markdown.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(reportsDir, 'QA_OBJECTS_CREATED_AND_CLEANED.md'), [
  '# QA Objects Created And Cleaned',
  '',
  qaObjects.length ? qaObjects.map((item) => `- ${item.action}: ${item.type || 'object'} ${item.name || item.id || ''}`).join('\n') : 'No QA objects recorded.',
  '',
].join('\n'), 'utf8');

console.log(`Final QA reports written. Results=${results.length}; Bugs=${bugs.length}; P0=${p0.length}; P1=${p1.length}.`);
