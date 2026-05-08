import { test } from '@playwright/test';
import { recordSkip } from './helpers/audit';

const levelMatrix = [
  ['Kinder', 'Reporte diario, alimentacion, siesta, higiene/panal, estado de animo, incidentes, entrada/salida, autorizados, pagos, credenciales, comunicacion'],
  ['Preescolar', 'Campos formativos, evaluacion cualitativa, observaciones, evidencias, actividades, materiales, asistencia, comunicacion, pagos, credenciales'],
  ['Primaria', 'Materias, horarios, tareas, classroom, examenes, calificaciones, boletas, biblioteca, asistencia, estado de cuenta, pagos, credenciales, documentos, comunicacion'],
];

test('module entitlements: matriz por nivel y plan', async () => {
  for (const [level, expected] of levelMatrix) {
    recordSkip(
      'Module Entitlements',
      `${level}: modulos activos/bloqueados`,
      `Requiere escuela QA ${level} y rol autenticado. Esperado a validar: ${expected}.`,
    );
  }
});
