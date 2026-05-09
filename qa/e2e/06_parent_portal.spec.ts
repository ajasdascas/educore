import { test } from '@playwright/test';
import { auditPageLoad, ensureAllQASchools, ensureCoreDataForSchool, installSupportSession, recordSkip } from './helpers/audit';

const parentPages = [
  ['/parent/dashboard/', 'dashboard padre', /Dashboard|Hijos|Pagos|Asistencia/i],
  ['/parent/children/', 'mis hijos', /Hijos|Alumno|Estudiante/i],
  ['/parent/attendance/', 'asistencia', /Asistencia/i],
  ['/parent/grades/', 'calificaciones/avances', /Calificaciones|Avances|Promedio/i],
  ['/parent/documents/', 'documentos', /Documentos/i],
  ['/parent/payments/', 'pagos', /Pagos|Estado de cuenta|Adeudos/i],
  ['/parent/consents/', 'permisos', /Permisos|Consentimientos|Autorizaciones/i],
  ['/parent/messages/', 'mensajes', /Mensajes|Comunicacion|Comunicación/i],
  ['/parent/notifications/', 'notificaciones', /Notificaciones|Avisos/i],
] as const;

test('parent portal: matriz de flujos QA', async ({ page, request }) => {
  const { session, schools } = await ensureAllQASchools(request);
  if (!session || schools.length === 0) return;

  for (const school of schools) {
    await ensureCoreDataForSchool(request, session, school);
    await installSupportSession(page, session, school, 'parent');
    for (const [path, flow, pattern] of parentPages) {
      await auditPageLoad(page, 'Parent Portal', `${school.name}: ${flow}`, path, pattern);
    }
  }

  recordSkip('Parent Portal', 'login padre QA con password persistente', 'El password temporal no se guarda en repo; si el usuario ya existe, se requiere reset QA en memoria.');
  recordSkip('Parent Portal', 'RBAC padre con token real', 'Esta corrida usa soporte Super Admin para navegacion; RBAC real de padre queda para una corrida con credencial temporal reseteada en memoria.');
});
