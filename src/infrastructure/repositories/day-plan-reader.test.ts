import { createTask } from '../../domain/entities/task';
import { createTempoDb } from '../db/tempo-db';
import { DexieUnitOfWork } from '../db/unit-of-work';
import { DexieDayPlanReader } from './dexie-day-plan-reader';

it('reads a day plan and rolls back a failed transaction', async () => {
  const db = createTempoDb(`tempo-day-${crypto.randomUUID()}`);
  const uow = new DexieUnitOfWork(db);
  const reader = new DexieDayPlanReader(db);

  await uow.run(['tasks'], async () => {
    await db.tasks.put(createTask({ id: 't1', title: 'Draft', now: 100 }));
    throw new Error('rollback');
  }).catch(() => undefined);

  expect(await db.tasks.count()).toBe(0);
  expect((await reader.read('2026-10-25')).settings.theme).toBe('system');
  db.close();
  await db.delete();
});
