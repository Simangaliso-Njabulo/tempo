import { createBlock } from '../../domain/entities/block';
import { defaultSettings } from '../../domain/entities/settings';
import { createTask } from '../../domain/entities/task';
import { createTempoDb } from './tempo-db';
import { DexieResetGateway } from './dexie-reset-gateway';
import { DexieUnitOfWork } from './unit-of-work';

it('clears every table in one unit of work', async () => {
  const db = createTempoDb(`tempo-reset-${crypto.randomUUID()}`);
  try {
    const uow = new DexieUnitOfWork(db);
    await db.tasks.put(createTask({ id: 't1', title: 'Draft', now: 1 }));
    await db.blocks.put(
      createBlock({ id: 'b1', date: '2026-10-26', startMin: 540, durationMin: 30, kind: 'task', title: 'Draft', now: 1 }),
    );
    await db.routines.put({
      id: 'r1',
      title: 'Walk',
      kind: 'routine',
      daysOfWeek: [1],
      preferredStartMin: 480,
      durationMin: 30,
      anchor: true,
      active: true,
      createdAt: 1,
      updatedAt: 1,
    });
    await db.routineExceptions.put({ id: 'e1', routineId: 'r1', date: '2026-10-26', type: 'skip', createdAt: 1 });
    await db.settings.put(defaultSettings(1));
    await db.meta.put({ key: 'lastActiveDate', value: '2026-10-26' });

    await new DexieResetGateway(db, uow).resetAll();

    expect(await db.tasks.count()).toBe(0);
    expect(await db.blocks.count()).toBe(0);
    expect(await db.routines.count()).toBe(0);
    expect(await db.routineExceptions.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
    expect(await db.meta.count()).toBe(0);
  } finally {
    db.close();
    await db.delete();
  }
});
