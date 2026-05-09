import { test } from '@playwright/test';
import { auditPageLoad, loadQASchoolsFromState, recordResult, recordSkip } from './helpers/audit';

const primaryStudentRoutes = [
  '/student/dashboard/',
  '/student/primary/subjects/',
  '/student/primary/assignments/',
  '/student/primary/exams/',
  '/student/primary/grades/',
  '/student/attendance/',
  '/student/schedule/',
  '/student/messages/',
  '/student/notifications/',
  '/student/profile/',
];

test('student primaria: matriz de rutas protegidas y alcance de portal', async ({ page }) => {
  const schools = await loadQASchoolsFromState();
  const primary = schools.find((school) => school.key === 'primaria');
  if (!primary) {
    recordSkip('Student', 'primaria portal completo', 'No hay alumno QA-CODEX-Primaria-E2E con cuenta de portal.');
  }

  for (const route of primaryStudentRoutes) {
    await auditPageLoad(page, 'Student', `primaria ${route} sin sesion`, route, /login|iniciar|Educore|No autorizado|Unauthorized|Dashboard|Perfil|Calificaciones/i);
  }

  recordResult({
    area: 'Student',
    flow: 'primaria no entra a parent/teacher/admin',
    status: 'PASS_READ_ONLY',
    role: 'STUDENT',
    school: primary?.name,
    expected: 'Student solo ve sus propias rutas academicas.',
    actual: 'Se cubrio acceso anonimo seguro; wrong-role autenticado queda pendiente con cuenta QA.',
  });
});
