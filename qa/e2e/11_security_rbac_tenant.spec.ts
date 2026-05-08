import { test } from '@playwright/test';
import { expectProtectedAPIRejects, probeAPI, recordResult } from './helpers/audit';

const protectedEndpoints = [
  ['/api/v1/super-admin/schools', 'SUPER_ADMIN'],
  ['/api/v1/super-admin/users', 'SUPER_ADMIN'],
  ['/api/v1/school-admin/dashboard', 'SCHOOL_ADMIN'],
  ['/api/v1/teacher/dashboard', 'TEACHER'],
  ['/api/v1/parent/dashboard', 'PARENT'],
  ['/api/v1/student/dashboard', 'STUDENT'],
];

test('security: APIs sensibles rechazan requests sin token o token invalido', async ({ request }) => {
  for (const [endpoint, role] of protectedEndpoints) {
    await expectProtectedAPIRejects(request, endpoint, role);
  }

  const supportProbe = await probeAPI(request, 'GET', '/api/v1/school-admin/dashboard', {
    token: 'QA-CODEX-invalid-token',
    supportTenantID: 'QA-CODEX-invalid-tenant',
  });
  recordResult({
    area: 'Security/RBAC',
    flow: 'X-Support-Tenant-ID sin Super Admin',
    status: supportProbe.status >= 400 ? 'PASS' : 'FAIL',
    role: 'ANONYMOUS',
    expected: 'Header de soporte no concede acceso sin token Super Admin valido.',
    actual: `HTTP ${supportProbe.status}`,
    severity: supportProbe.status >= 400 ? undefined : 'P0',
  });
});
