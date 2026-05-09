import { test } from '@playwright/test';
import {
  auditPageLoad,
  ensureAllQASchools,
  ensureCoreDataForSchool,
  installSupportSession,
  recordResult,
  saveAuditScreenshot,
} from './helpers/audit';

test.setTimeout(180_000);

test('school admin: operacion core por escuela QA', async ({ page, request }, testInfo) => {
  const { session, schools } = await ensureAllQASchools(request);
  if (!session || schools.length === 0) return;

  for (const school of schools) {
    await installSupportSession(page, session, school, 'school_admin');
    for (const [path, label, pattern] of [
      ['/school-admin/dashboard/', 'dashboard school admin', /Dashboard|Alumnos|Profesores|Grupos/i],
      ['/school-admin/academic/', 'estructura', /Estructura|Ciclo|Nivel|Grado/i],
      ['/school-admin/students/', 'estudiantes', /Estudiantes|Alumnos/i],
      ['/school-admin/teachers/', 'profesores', /Profesores|Docentes/i],
      ['/school-admin/groups/', 'grupos', /Grupos/i],
      ['/school-admin/schedule/', 'horarios', /Horario|Horarios/i],
      ['/school-admin/attendance/', 'asistencia', /Asistencia/i],
      ['/school-admin/documents/', 'documentos', /Documentos/i],
      ['/school-admin/reports/', 'reportes', /Reportes/i],
      ['/school-admin/communications/', 'comunicaciones', /Comunicaciones|Mensajes|Anuncios/i],
      ['/school-admin/settings/', 'configuracion', /Configuracion|Configuración|Ajustes/i],
    ] as const) {
      await auditPageLoad(page, 'School Admin', `${school.name}: ${label}`, path, pattern);
    }

    const core = await ensureCoreDataForSchool(request, session, school);
    if (core?.student?.id && core.group?.id) {
      recordResult({
        area: 'School Admin',
        flow: `${school.name}: operacion core datos QA`,
        status: 'PASS',
        school: school.name,
        expected: 'Alumno, profesor y grupo QA disponibles para portales.',
        actual: `student_id=${core.student.id}; group_id=${core.group.id}; teacher_id=${core.teacher?.id ?? 'missing'}`,
      });
    }

    await saveAuditScreenshot(page, `school-admin-${school.key}-settings`, testInfo);
  }
});
