import { test } from '@playwright/test';
import {
  auditPageLoad,
  ensureAllQASchools,
  installAuthSession,
  recordResult,
  saveAuditScreenshot,
  validateSchoolModules,
} from './helpers/audit';

test('escuelas QA por nivel: crear o reutilizar solo con gate explicito', async ({ page, request }, testInfo) => {
  const { session, schools } = await ensureAllQASchools(request);
  if (!session) return;

  for (const school of schools) {
    await validateSchoolModules(request, session, school);
  }

  await installAuthSession(page, session);
  await auditPageLoad(page, 'School Creation', 'validar listado Super Admin escuelas QA', '/super-admin/schools/', /Escuelas|Instituciones|Schools/i);
  const body = await page.locator('body').innerText().catch(() => '');
  const visible = schools.some((school) => body.includes(school.slug) || body.includes(school.name));
  const screenshot = await saveAuditScreenshot(page, 'qa-schools-super-admin-list', testInfo);
  recordResult({
    area: 'School Creation',
    flow: 'validar escuelas QA visibles en UI',
    status: visible ? 'PASS' : 'WARN',
    url: page.url(),
    expected: 'Al menos una escuela QA creada/reutilizada aparece en la UI Super Admin.',
    actual: visible ? 'Escuela QA visible en listado.' : 'No se encontro slug/nombre QA en texto visible; API si devolvio escuelas QA.',
    evidence: screenshot,
    severity: visible ? undefined : 'P2',
  });
});
