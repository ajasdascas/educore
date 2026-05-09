import { test } from '@playwright/test';
import { auditPageLoad, ensureAllQASchools, ensureCoreDataForSchool, installSupportSession, recordSkip } from './helpers/audit';

const teacherPages = [
  ['/teacher/dashboard/', 'dashboard profesor', /Dashboard|Profesor|Grupos|Asistencia/i],
  ['/teacher/classes/', 'mis grupos', /Grupos|Clases|Alumnos/i],
  ['/teacher/attendance/', 'asistencia', /Asistencia/i],
  ['/teacher/schedule/', 'horario', /Horario/i],
  ['/teacher/messages/', 'mensajes', /Mensajes|Comunicacion|Comunicación/i],
  ['/teacher/notifications/', 'notificaciones', /Notificaciones|Avisos/i],
  ['/teacher/profile/', 'perfil', /Perfil|Usuario/i],
  ['/teacher/settings/', 'configuracion', /Configuracion|Configuración|Ajustes/i],
] as const;

test('teacher portal: matriz de flujos QA', async ({ page, request }) => {
  const { session, schools } = await ensureAllQASchools(request);
  if (!session || schools.length === 0) return;

  for (const school of schools) {
    await ensureCoreDataForSchool(request, session, school);
    await installSupportSession(page, session, school, 'teacher');
    for (const [path, flow, pattern] of teacherPages) {
      await auditPageLoad(page, 'Teacher Portal', `${school.name}: ${flow}`, path, pattern);
    }
  }

  recordSkip('Teacher Portal', 'login profesor QA con password persistente', 'El acceso portal puede generar password temporal, pero no se guarda en repo; si ya existe, se requiere reset QA en una fase dedicada.');
  recordSkip('Teacher Portal', 'RBAC profesor con token real', 'Esta corrida usa soporte Super Admin para navegacion; RBAC real de profesor queda para una corrida con credencial temporal reseteada en memoria.');
});
