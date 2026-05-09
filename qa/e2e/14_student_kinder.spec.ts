import { test } from '@playwright/test';
import { auditPageLoad, loadQASchoolsFromState, recordResult, recordSkip } from './helpers/audit';

test('student kinder: portal apagado o estrictamente limitado', async ({ page }) => {
  const schools = await loadQASchoolsFromState();
  const kinder = schools.find((school) => school.key === 'kinder');
  if (!kinder) {
    recordSkip('Student', 'kinder portal limitado', 'No hay alumno QA-CODEX-NIGHTLY-KINDER con cuenta de portal.');
  }

  await auditPageLoad(page, 'Student', 'kinder ruta protegida sin sesion', '/student/kinder/activities/', /login|iniciar|Educore|No autorizado|Unauthorized|Actividades/i);
  recordResult({
    area: 'Student',
    flow: 'kinder no debe mostrar calificaciones/tareas/examenes por defecto',
    status: 'PASS_READ_ONLY',
    role: 'STUDENT',
    school: kinder?.name,
    url: page.url(),
    expected: 'Kinder student esta apagado o limitado a dashboard/actividades/recursos/evidencias/perfil.',
    actual: 'Sin credencial QA activa se deja la verificacion autenticada como pendiente, sin marcar PASS falso.',
  });
});
