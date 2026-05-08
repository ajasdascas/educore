import { test } from '@playwright/test';
import { recordSkip } from './helpers/audit';

const teacherFlows = [
  'login profesor QA',
  'dashboard profesor',
  'mis grupos',
  'asistencia',
  'horario',
  'mensajes/notificaciones',
  'perfil/configuracion',
  'Kinder: reporte diario, alimentacion, siesta, higiene, incidentes',
  'Preescolar: observaciones, evaluacion cualitativa, evidencias',
  'Primaria: materias, tareas, calificaciones, examenes, materiales',
  'RBAC: profesor no entra a Super Admin ni ve otro tenant',
];

test('teacher portal: matriz de flujos QA', async () => {
  for (const flow of teacherFlows) {
    recordSkip('Teacher Portal', flow, 'Falta usuario profesor QA creado por flujo mutante seguro.');
  }
});
