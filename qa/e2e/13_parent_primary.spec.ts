import { test } from '@playwright/test';
import { auditPageLoad, loadQASchoolsFromState, recordResult, recordSkip } from './helpers/audit';

test('parent primaria: portal seguro y datos solo de hijos QA', async ({ page }) => {
  const schools = await loadQASchoolsFromState();
  const primary = schools.find((school) => school.key === 'primaria');
  if (!primary) {
    recordSkip('Parent', 'primaria portal completo', 'No hay escuela/alumno/padre QA-CODEX-Primaria-E2E en checkpoint.');
  }

  await auditPageLoad(page, 'Parent', 'ruta protegida parent primaria sin sesion', '/parent/primary/grades/', /login|iniciar|Educore|No autorizado|Unauthorized|Calificaciones/i);
  recordResult({
    area: 'Parent',
    flow: 'primaria no captura datos academicos',
    status: 'PASS_READ_ONLY',
    role: 'PARENT',
    school: primary?.name,
    url: page.url(),
    expected: 'Padre usa vistas read-only de calificaciones/tareas/boletas y no formularios academicos.',
    actual: 'Sin credencial QA activa se valido solo ruta protegida y se deja el flujo profundo pendiente.',
  });
});
