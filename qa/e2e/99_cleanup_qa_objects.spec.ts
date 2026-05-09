import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { recordResult, recordSkip } from './helpers/audit';

const root = path.resolve(__dirname, '..', '..', '..');
const progressPath = path.join(root, 'qa', 'checkpoints', 'PROGRESS.json');

test('cleanup: solo objetos QA-CODEX-NIGHTLY creados por esta corrida', async () => {
  const progress = fs.existsSync(progressPath)
    ? JSON.parse(fs.readFileSync(progressPath, 'utf8'))
    : { created_qa_objects: [], deleted_qa_objects: [] };
  const created = progress.created_qa_objects ?? [];
  const unsafe = created.filter((item: any) => !String(item.name || item.slug || item.id || '').includes('QA-CODEX-NIGHTLY'));

  if (unsafe.length) {
    recordResult({
      area: 'Cleanup',
      flow: 'validar prefijo de objetos QA',
      status: 'FAIL_SECURITY',
      expected: 'Todo objeto creado por la auditoria contiene QA-CODEX-NIGHTLY.',
      actual: `Objetos sin prefijo seguro: ${unsafe.length}`,
      severity: 'P0',
    });
    return;
  }

  if (process.env.E2E_CLEANUP_QA_OBJECTS !== 'true') {
    recordSkip('Cleanup', 'eliminar/archivar objetos QA', 'E2E_CLEANUP_QA_OBJECTS no es true; no se ejecuta cleanup destructivo/archivado.');
    return;
  }

  recordResult({
    area: 'Cleanup',
    flow: 'cleanup seguro',
    status: 'SKIPPED_SECURITY_SCOPE',
    expected: 'Archivar/eliminar solo objetos QA-CODEX-NIGHTLY con API documentada.',
    actual: 'La automatizacion de borrado directo queda deshabilitada hasta implementar endpoints QA-safe por tipo.',
    recommendation: 'Preferir archivar desde UI o endpoints de QA dedicados; nunca borrar datos reales.',
  });
});
