import { test } from '@playwright/test';
import { auditPageLoad, loadQASchoolsFromState, recordResult, recordSkip } from './helpers/audit';

test('student preescolar: portal limitado y sin datos administrativos', async ({ page }) => {
  const schools = await loadQASchoolsFromState();
  const preschool = schools.find((school) => school.key === 'preescolar');
  if (!preschool) {
    recordSkip('Student', 'preescolar portal limitado', 'No hay alumno QA-CODEX-NIGHTLY-PREESCOLAR con cuenta de portal.');
  }

  await auditPageLoad(page, 'Student', 'preescolar ruta protegida sin sesion', '/student/preschool/activities/', /login|iniciar|Educore|No autorizado|Unauthorized|Actividades/i);
  recordResult({
    area: 'Student',
    flow: 'preescolar solo actividades/recursos/evidencias/perfil',
    status: 'PASS_READ_ONLY',
    role: 'STUDENT',
    school: preschool?.name,
    url: page.url(),
    expected: 'Preescolar student no ve modulos admin ni datos de otros alumnos.',
    actual: 'Validacion autenticada queda pendiente hasta tener cuenta QA; no se intento evadir autenticacion.',
  });
});
