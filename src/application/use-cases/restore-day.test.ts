import { createBlock } from '../../domain/entities/block';
import { createTask } from '../../domain/entities/task';
import { createTempoDb } from '../../infrastructure/db/tempo-db';
import { DexieUnitOfWork } from '../../infrastructure/db/unit-of-work';
import { DexieBlockRepository } from '../../infrastructure/repositories/dexie-block-repository';
import { DexieTaskRepository } from '../../infrastructure/repositories/dexie-task-repository';
import { makeRestoreDay } from './restore-day';

function block(id: string, date = '2026-10-25', startMin = 540) {
  return createBlock({ id, date, startMin, durationMin: 30, kind: 'task', title: id, now: 1 });
}

it('restores a day snapshot, removes newer blocks, and leaves other days alone', async () => {
  const db = createTempoDb(`tempo-restore-day-${crypto.randomUUID()}`);
  const blocks = new DexieBlockRepository(db);
  const tasks = new DexieTaskRepository(db);
  const restore = makeRestoreDay({ blocks, tasks, uow: new DexieUnitOfWork(db) });
  try {
    const originalTask = createTask({ id: 't1', title: 'Keep me', now: 1 });
    const originalBlock = block('b1');
    await blocks.put(originalBlock);
    await blocks.put(block('b3', '2026-10-26'));
    await tasks.put(originalTask);

    const snapshot = { date: '2026-10-25', blocks: [originalBlock], tasks: [originalTask] };

    await blocks.delete('b1');
    await blocks.put(block('b2'));
    await tasks.put({ ...originalTask, title: 'Changed' });

    await restore(snapshot);

    expect(await blocks.get('b1')).toMatchObject({ title: 'b1', startMin: 540 });
    expect(await blocks.get('b2')).toBeUndefined();
    expect(await blocks.get('b3')).toBeDefined();
    expect((await tasks.get('t1'))?.title).toBe('Keep me');
  } finally {
    db.close();
    await db.delete();
  }
});
