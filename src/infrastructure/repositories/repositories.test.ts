import { createBlock } from '../../domain/entities/block';
import { defaultSettings } from '../../domain/entities/settings';
import { createTask } from '../../domain/entities/task';
import { createTempoDb } from '../db/tempo-db';
import { DexieBlockRepository } from './dexie-block-repository';
import { DexieSettingsRepository } from './dexie-settings-repository';
import { DexieTaskRepository } from './dexie-task-repository';

it('round-trips tasks, blocks, and settings', async () => {
  const db = createTempoDb(`tempo-repos-${crypto.randomUUID()}`);
  const tasks = new DexieTaskRepository(db);
  const blocks = new DexieBlockRepository(db);
  const settings = new DexieSettingsRepository(db);

  await tasks.put(createTask({ id: 't1', title: 'Draft', now: 100 }));
  await blocks.put(createBlock({ id: 'b1', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'task', title: 'Draft', taskId: 't1', now: 100 }));
  await settings.put(defaultSettings(100));

  expect((await tasks.listAll()).map((task) => task.id)).toEqual(['t1']);
  expect((await blocks.listByDate('2026-10-25')).map((block) => block.id)).toEqual(['b1']);
  expect((await settings.get())?.theme).toBe('system');

  db.close();
  await db.delete();
});
