import { test } from '@playwright/test';
import { expectProtectedAPIRejects, recordResult, recordSecurityScopeSkip } from './helpers/audit';

const safeProtectedEndpoints = [
  ['/api/v1/super-admin/schools', 'SUPER_ADMIN'],
  ['/api/v1/school-admin/dashboard', 'SCHOOL_ADMIN'],
  ['/api/v1/teacher/dashboard', 'TEACHER'],
  ['/api/v1/parent/dashboard', 'PARENT'],
  ['/api/v1/student/dashboard', 'STUDENT'],
];

test('access control seguro: APIs protegidas y limites de alcance', async ({ request }) => {
  for (const [endpoint, role] of safeProtectedEndpoints) {
    await expectProtectedAPIRejects(request, endpoint, role);
  }

  recordSecurityScopeSkip(
    'RBAC',
    'IDOR ofensivo con mutacion de IDs',
    'No se prueban payloads, fuzzing, enumeracion agresiva ni explotacion. Solo se documenta como pendiente seguro con objetos QA conocidos.',
  );
  recordResult({
    area: 'Tenant isolation',
    flow: 'cross-tenant solo con objetos QA',
    status: 'SKIPPED_NO_CREDENTIALS',
    expected: 'Usar dos tenants QA-CODEX y detenerse ante primer fallo de autorizacion.',
    actual: 'No hay dos sesiones QA completas en esta corrida; no se hizo probing ofensivo.',
  });
});
