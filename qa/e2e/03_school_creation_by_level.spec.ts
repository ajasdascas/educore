import { test } from '@playwright/test';
import { qaName, recordResult, requireMutationGate } from './helpers/audit';

const schools = [
  { name: 'Kinder-E2E', level: 'KINDER', slug: 'qa-codex-kinder-e2e' },
  { name: 'Preescolar-E2E', level: 'PRESCHOOL/PREESCOLAR', slug: 'qa-codex-preescolar-e2e' },
  { name: 'Primaria-E2E', level: 'PRIMARY/PRIMARIA', slug: 'qa-codex-primaria-e2e' },
];

test('escuelas QA por nivel: crear o reutilizar solo con gate explicito', async () => {
  if (!requireMutationGate('School Creation', 'crear/reutilizar escuelas QA por nivel')) return;

  for (const school of schools) {
    recordResult({
      area: 'School Creation',
      flow: `crear o reutilizar ${school.level}`,
      status: 'SKIPPED',
      school: `QA-CODEX-${school.name}`,
      expected: `Crear o reutilizar slug ${school.slug} con prefijo ${qaName(school.name)}.`,
      actual: 'Gate de mutacion habilitado, pero este scaffold no ejecuta altas hasta confirmar selectores/API productivos sin riesgo.',
      recommendation: 'Completar este caso con API/UI confirmada en una rama QA antes de activar mutaciones en produccion.',
    });
  }
});
