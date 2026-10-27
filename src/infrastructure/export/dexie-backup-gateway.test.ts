import { defaultSettings } from '../../domain/entities/settings';
import { createTask } from '../../domain/entities/task';
import { createTempoDb } from '../db/tempo-db';
import { DexieUnitOfWork } from '../db/unit-of-work';
import { DexieBackupGateway } from './dexie-backup-gateway';

const file = {
  app: 'tempo' as const,
  schemaVersion: 1 as const,
  exportedAt: '2026-10-25T12:00:00.000Z',
  data: {
    tasks: [createTask({ id: 't1', title: 'Imported', now: 10 })],
    blocks: [], routines: [], routineExceptions: [], settings: defaultSettings(10), meta: [],
  },
};

it('replaces and merges without overwriting newer local data', async () => {
  const db = createTempoDb(`tempo-backup-${crypto.randomUUID()}`);
  const gateway = new DexieBackupGateway(db, new DexieUnitOfWork(db));
  await db.tasks.put({ ...createTask({ id: 't1', title: 'Local', now: 20 }), updatedAt: 20 });
  const summary = await gateway.importAll(file, 'merge');
  expect(summary.skipped).toBe(1);
  expect((await db.tasks.get('t1'))?.title).toBe('Local');
  await gateway.importAll(file, 'replace');
  expect((await db.tasks.get('t1'))?.title).toBe('Imported');
  db.close();
  await db.delete();
});

it('leaves the previous data intact when a replace fails validation', async () => {
  const db = createTempoDb(`tempo-backup-fail-${crypto.randomUUID()}`);
  const gateway = new DexieBackupGateway(db, new DexieUnitOfWork(db));
  await db.tasks.put(createTask({ id: 'keep', title: 'Keep me', now: 10 }));
  const bad = { ...file, data: { ...file.data, blocks: [{ id: 'b1' }] } };
  await expect(gateway.importAll(bad as never, 'replace')).rejects.toThrow();
  expect((await db.tasks.get('keep'))?.title).toBe('Keep me');
  db.close();
  await db.delete();
});
