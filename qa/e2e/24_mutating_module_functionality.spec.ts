import { Page, test } from '@playwright/test';
import {
  apiGetJSON,
  apiLoginUser,
  apiPostJSON,
  appendCreatedQAObject,
  auditPageLoad,
  e2eApiURL,
  e2eBaseURL,
  ensureAllQASchools,
  ensureCoreDataForSchool,
  extractArray,
  qaName,
  recordResult,
  recordSkip,
  toAbsoluteURL,
} from './helpers/audit';

type APICallResult = Awaited<ReturnType<typeof apiPostJSON>>;

const today = new Date().toISOString().slice(0, 10);

function bodyData(result: APICallResult): Record<string, any> {
  return result.body?.data ?? result.body ?? {};
}

function recordAPIResult(
  area: string,
  flow: string,
  school: string,
  endpoint: string,
  result: APICallResult,
  expected: string,
  successText: string,
  severity: 'P0' | 'P1' | 'P2' | 'P3' = 'P2',
): void {
  recordResult({
    area,
    flow,
    status: result.ok ? 'PASS_REAL' : 'FAIL',
    school,
    url: `${e2eApiURL}${endpoint}`,
    expected,
    actual: result.ok ? successText : `HTTP ${result.status}: ${result.text}`,
    severity: result.ok ? undefined : severity,
  });
}

async function openDashboardWithSession(
  page: Page,
  session: { accessToken: string; user: Record<string, unknown> },
  role: string,
  school: string,
  path: string,
  expected: RegExp,
): Promise<void> {
  await page.goto(`${e2eBaseURL}/login/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((auth) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('access_token', auth.accessToken);
    window.localStorage.setItem('user', JSON.stringify(auth.user));
  }, session);
  await auditPageLoad(page, `${role} Portal`, `${school}: navegador real con login ${role}`, path, expected);
}

test('mutating QA-CODEX: escuelas, modulos, datos academicos, pagos simulados y portales reales', async ({ page, request }) => {
  const { session, schools } = await ensureAllQASchools(request);
  if (!session || schools.length === 0) {
    recordSkip('QA Mutation', 'arranque mutante', 'No hay sesion Super Admin o escuelas QA disponibles.');
    return;
  }

  for (const school of schools) {
    const core = await ensureCoreDataForSchool(request, session, school);
    if (!core?.group?.id || !core.student?.id) {
      recordResult({
        area: 'School Admin',
        flow: `${school.name}: datos base para modulos`,
        status: 'FAIL',
        school: school.name,
        expected: 'Grupo y alumno QA disponibles antes de mutar modulos.',
        actual: `group=${Boolean(core?.group?.id)} student=${Boolean(core?.student?.id)}`,
        severity: 'P1',
      });
      continue;
    }

    const scheduleEndpoint = '/api/v1/school-admin/academic/schedule';
    const schedule = await apiPostJSON(request, session, scheduleEndpoint, {
      group_id: core.group.id,
      subject_id: core.subject?.id ?? '',
      teacher_id: core.teacher?.id ?? '',
      day: 'monday',
      start_time: '09:00',
      end_time: '09:45',
      room: 'QA-CODEX Aula 1',
      status: 'active',
      notes: qaName(`Horario-${school.key}`),
    }, school.id);
    const scheduleID = bodyData(schedule).id;
    if (schedule.ok && scheduleID) {
      appendCreatedQAObject({ type: 'schedule', id: scheduleID, name: qaName(`Horario-${school.key}`), school: school.name });
    }
    recordAPIResult('School Admin', `${school.name}: crear horario`, school.name, scheduleEndpoint, schedule, 'Crear bloque de horario QA.', `schedule_id=${scheduleID ?? 'missing'}`, 'P2');

    const attendanceEndpoint = `/api/v1/school-admin/attendance/groups/${core.group.id}/bulk`;
    const attendance = await apiPostJSON(request, session, attendanceEndpoint, {
      date: today,
      records: [{ student_id: core.student.id, status: 'present', notes: qaName(`Asistencia-${school.key}`) }],
    }, school.id);
    recordAPIResult('School Admin', `${school.name}: registrar asistencia`, school.name, attendanceEndpoint, attendance, 'Registrar asistencia QA sin tocar alumnos reales.', attendance.ok ? 'Asistencia guardada.' : '', 'P2');

    const documentEndpoint = '/api/v1/school-admin/documents';
    const document = await apiPostJSON(request, session, documentEndpoint, {
      student_id: core.student.id,
      title: qaName(`Documento-${school.key}`),
      description: 'Documento QA-CODEX sin archivo real.',
      category: 'other',
      file_name: 'qa-codex-document.txt',
      file_url: '#',
      file_size: 0,
      mime_type: 'text/plain',
      storage_status: 'digital_only',
    }, school.id);
    const documentID = bodyData(document).id;
    if (document.ok && documentID) {
      appendCreatedQAObject({ type: 'document', id: documentID, name: qaName(`Documento-${school.key}`), school: school.name });
    }
    recordAPIResult('School Admin', `${school.name}: crear documento`, school.name, documentEndpoint, document, 'Crear documento QA sin exponer archivos reales.', `document_id=${documentID ?? 'missing'}`, 'P2');

    const communicationEndpoint = '/api/v1/school-admin/communications';
    const communication = await apiPostJSON(request, session, communicationEndpoint, {
      title: qaName(`Comunicado-${school.key}`),
      content: 'Comunicado QA-CODEX creado como borrador; no se envia email real.',
      type: 'announcement',
      priority: 'normal',
      recipient_type: 'role',
      recipient_id: 'parents',
      channels: ['push'],
      email: false,
      push: true,
      sms: false,
    }, school.id);
    const communicationID = bodyData(communication).id;
    if (communication.ok && communicationID) {
      appendCreatedQAObject({ type: 'communication', id: communicationID, name: qaName(`Comunicado-${school.key}`), school: school.name });
    }
    recordAPIResult('School Admin', `${school.name}: crear comunicado borrador`, school.name, communicationEndpoint, communication, 'Crear comunicacion QA sin correo/SMS real.', `communication_id=${communicationID ?? 'missing'}`, 'P2');

    const reportEndpoint = '/api/v1/school-admin/reports/generate';
    const report = await apiPostJSON(request, session, reportEndpoint, {
      type: 'attendance',
      format: 'json',
      group_id: core.group.id,
      start_date: today,
      end_date: today,
      include_charts: false,
      include_details: true,
    }, school.id);
    const reportID = bodyData(report).id;
    if (report.ok && reportID) {
      appendCreatedQAObject({ type: 'report', id: reportID, name: qaName(`Reporte-${school.key}`), school: school.name });
    }
    recordAPIResult('School Admin', `${school.name}: generar reporte`, school.name, reportEndpoint, report, 'Generar reporte QA con datos del tenant QA.', `report_id=${reportID ?? 'missing'}`, 'P2');

    if (core.subject?.id && school.key === 'primaria') {
      const gradesEndpoint = '/api/v1/school-admin/grades/grades/bulk';
      const grades = await apiPostJSON(request, session, gradesEndpoint, {
        grades: [{
          student_id: core.student.id,
          subject_id: core.subject.id,
          score: 92,
          type: 'exam',
          description: qaName('Calificacion-Primaria'),
          weight: 1,
        }],
      }, school.id);
      recordAPIResult('Primaria', `${school.name}: crear calificacion`, school.name, gradesEndpoint, grades, 'Registrar calificacion QA en Primaria.', grades.ok ? 'Calificacion guardada.' : '', 'P1');

      const reportCardEndpoint = '/api/v1/school-admin/report-cards/generate';
      const reportCard = await apiPostJSON(request, session, reportCardEndpoint, {
        student_id: core.student.id,
        period: 'exam',
        include_attendance: true,
        include_comments: true,
        persist_as_document: false,
        confirmation_text: 'GENERAR BOLETA QA-CODEX',
      }, school.id);
      recordAPIResult('Primaria', `${school.name}: generar boleta`, school.name, reportCardEndpoint, reportCard, 'Generar boleta QA sin persistir documento permanente.', reportCard.ok ? 'Boleta calculada.' : '', 'P1');
    } else {
      recordResult({
        area: school.key === 'primaria' ? 'Primaria' : school.key === 'kinder' ? 'Kinder' : 'Preescolar',
        flow: `${school.name}: calificaciones/boletas por nivel`,
        status: school.key === 'primaria' ? 'FAIL' : 'PASS_READ_ONLY',
        school: school.name,
        expected: school.key === 'primaria' ? 'Primaria debe tener materia para calificaciones.' : 'Kinder/Preescolar no fuerzan calificaciones numericas por defecto.',
        actual: core.subject?.id ? 'Materia disponible.' : 'Sin materia numerica aplicable.',
        severity: school.key === 'primaria' ? 'P1' : undefined,
      });
    }

    const chargeEndpoint = '/api/v1/school-admin/payments/charges';
    const charge = await apiPostJSON(request, session, chargeEndpoint, {
      student_id: core.student.id,
      concept: qaName(`Colegiatura-${school.key}`),
      description: 'Cargo QA-CODEX simulado; no usa pasarela real.',
      amount: 10,
      currency: 'MXN',
      due_date: today,
      notes: 'QA-CODEX simulated charge',
    }, school.id);
    const chargeData = bodyData(charge);
    const paymentID = chargeData.id;
    recordResult({
      area: 'Billing/Payments',
      flow: `${school.name}: crear cargo simulado`,
      status: charge.ok ? 'PASS_REAL' : charge.status === 403 ? 'PARTIAL' : 'FAIL',
      school: school.name,
      url: `${e2eApiURL}${chargeEndpoint}`,
      expected: 'Crear cargo QA o devolver modulo bloqueado claramente por plan.',
      actual: charge.ok ? `payment_id=${paymentID ?? 'missing'}` : `HTTP ${charge.status}: ${charge.text}`,
      severity: charge.ok || charge.status === 403 ? undefined : 'P1',
      recommendation: charge.status === 403 ? 'Validar si plan basic debe incluir payments o solo payments_basic.' : undefined,
    });
    if (charge.ok && paymentID) {
      appendCreatedQAObject({ type: 'payment', id: paymentID, name: qaName(`Colegiatura-${school.key}`), school: school.name });
      const recordEndpoint = `/api/v1/school-admin/payments/${paymentID}/record-payment`;
      const manualPayment = await apiPostJSON(request, session, recordEndpoint, {
        method: 'cash',
        amount: 10,
        reference: qaName(`PagoManual-${school.key}`),
        notes: 'Pago manual QA-CODEX; no pasarela real.',
      }, school.id);
      recordAPIResult('Billing/Payments', `${school.name}: registrar pago manual simulado`, school.name, recordEndpoint, manualPayment, 'Registrar pago manual QA sin tarjeta ni pasarela.', manualPayment.ok ? 'Pago manual registrado.' : '', 'P1');
    }
    recordResult({
      area: 'Billing/Payments',
      flow: `${school.name}: pasarela tarjeta real`,
      status: 'SKIPPED_SECURITY_SCOPE',
      school: school.name,
      expected: 'No ejecutar pagos reales ni tarjetas reales.',
      actual: 'No se llamo checkout/card-checkout-session; solo cargo y pago manual QA si el modulo lo permitio.',
    });

    const teacherSession = await apiLoginUser(request, core.portalCredentials?.teacher?.email, core.portalCredentials?.teacher?.password, 'TEACHER', 'Teacher Portal', `${school.name}: login profesor real`, school.name);
    if (teacherSession) {
      await apiGetJSON(request, teacherSession, '/api/v1/teacher/dashboard');
      await openDashboardWithSession(page, teacherSession, 'Teacher', school.name, '/teacher/dashboard/', /Dashboard|Profesor|Grupos|Asistencia/i);
    }

    const parentSession = await apiLoginUser(request, core.portalCredentials?.parent?.email, core.portalCredentials?.parent?.password, 'PARENT', 'Parent Portal', `${school.name}: login padre real`, school.name);
    if (parentSession) {
      const children = await apiGetJSON(request, parentSession, '/api/v1/parent/children');
      const childCount = extractArray(children.body, ['children', 'data']).length;
      recordResult({
        area: 'Parent Portal',
        flow: `${school.name}: padre ve hijos vinculados`,
        status: children.ok && childCount >= 1 ? 'PASS_REAL' : 'FAIL',
        role: 'PARENT',
        school: school.name,
        url: `${e2eApiURL}/api/v1/parent/children`,
        expected: 'Padre QA ve al menos su alumno QA vinculado.',
        actual: children.ok ? `children=${childCount}` : `HTTP ${children.status}: ${children.text}`,
        severity: children.ok && childCount >= 1 ? undefined : 'P1',
      });
      await openDashboardWithSession(page, parentSession, 'Parent', school.name, '/parent/dashboard/', /Dashboard|Hijos|Pagos|Asistencia/i);
    }

    const studentSession = await apiLoginUser(request, core.portalCredentials?.student?.email, core.portalCredentials?.student?.password, 'STUDENT', 'Student Portal', `${school.name}: login alumno real`, school.name);
    if (studentSession) {
      for (const endpoint of ['/api/v1/student/dashboard', '/api/v1/student/schedule', '/api/v1/student/attendance', '/api/v1/student/grades', '/api/v1/student/assignments']) {
        const read = await apiGetJSON(request, studentSession, endpoint);
        recordResult({
          area: 'Student Portal',
          flow: `${school.name}: leer ${endpoint.replace('/api/v1/student/', '')}`,
          status: read.ok ? 'PASS_REAL' : 'FAIL',
          role: 'STUDENT',
          school: school.name,
          url: `${e2eApiURL}${endpoint}`,
          expected: 'Alumno QA lee solo sus propios datos.',
          actual: read.ok ? 'Endpoint respondio correctamente.' : `HTTP ${read.status}: ${read.text}`,
          severity: read.ok ? undefined : 'P1',
        });
      }
      await openDashboardWithSession(page, studentSession, 'Student', school.name, '/student/dashboard/', /Dashboard|Alumno|Calificaciones|Asistencia/i);
    }
  }

  await auditPageLoad(page, 'QA Evidence', 'produccion abierta al final', '/', /Educore|OnlineU|Login|Iniciar/i);
});
