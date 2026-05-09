import { test } from '@playwright/test';
import { auditPageLoad, ensureAllQASchools, ensureCoreDataForSchool, installSupportSession, recordSkip } from './helpers/audit';

const studentPages = [
  ['/student/dashboard/', 'dashboard alumno', /Dashboard|Alumno|Calificaciones|Asistencia/i],
  ['/student/assignments/', 'tareas/classroom', /Tareas|Actividades|Assignments/i],
  ['/student/schedule/', 'horario', /Horario/i],
  ['/student/grades/', 'boleta/calificaciones', /Calificaciones|Boleta|Promedio/i],
  ['/student/attendance/', 'asistencia', /Asistencia/i],
  ['/student/messages/', 'centro de mensajes', /Mensajes|Comunicacion|Comunicación/i],
  ['/student/notifications/', 'notificaciones/noticias', /Notificaciones|Avisos|Noticias/i],
  ['/student/profile/', 'perfil/documentos personalizados', /Perfil|Usuario|Documentos/i],
  ['/student/settings/', 'configuracion', /Configuracion|Configuración|Ajustes/i],
] as const;

test('student portal: matriz de flujos QA', async ({ page, request }) => {
  const { session, schools } = await ensureAllQASchools(request);
  if (!session || schools.length === 0) return;

  for (const school of schools) {
    await ensureCoreDataForSchool(request, session, school);
    await installSupportSession(page, session, school, 'student');
    for (const [path, flow, pattern] of studentPages) {
      await auditPageLoad(page, 'Student Portal', `${school.name}: ${flow}`, path, pattern);
    }
  }

  recordSkip('Student Portal', 'login alumno QA con password persistente', 'El password temporal no se guarda en repo; si el usuario ya existe, se requiere reset QA en memoria.');
  recordSkip('Student Portal', 'RBAC alumno con token real', 'Esta corrida usa soporte Super Admin para navegacion; RBAC real de alumno queda para una corrida con credencial temporal reseteada en memoria.');
});
