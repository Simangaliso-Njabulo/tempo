import { createBlock } from '../../domain/entities/block';
import { createTask } from '../../domain/entities/task';
import { createTempoDb } from '../../infrastructure/db/tempo-db';
import { DexieUnitOfWork } from '../../infrastructure/db/unit-of-work';
import { DexieBlockRepository } from '../../infrastructure/repositories/dexie-block-repository';
import { DexieMetaRepository } from '../../infrastructure/repositories/dexie-meta-repository';
import { DexieTaskRepository } from '../../infrastructure/repositories/dexie-task-repository';
import { makeCarryOver } from './carry-over';
import { makeCloseDay } from './close-day';
import { makeRestoreCarryOver } from './restore-carry-over';
import { makeRestoreCloseDay } from './restore-close-day';

function harness(now = new Date('2026-10-25T00:05:00')) {
  const db = createTempoDb(`tempo-carry-${crypto.randomUUID()}`);
  const uow = new DexieUnitOfWork(db);
  const tasks = new DexieTaskRepository(db);
  const blocks = new DexieBlockRepository(db);
  const meta = new DexieMetaRepository(db);
  const clock = { now: () => now };
  return {
    db,
    tasks,
    blocks,
    meta,
    carry: makeCarryOver({ tasks, blocks, meta, uow, clock }),
    close: makeCloseDay({ tasks, blocks, uow, clock }),
    restoreCarry: makeRestoreCarryOver({ tasks, blocks, uow }),
    restoreClose: makeRestoreCloseDay({ tasks, blocks, uow }),
  };
}

async function close(db: ReturnType<typeof createTempoDb>) {
  db.close();
  await db.delete();
}

it('carries unfinished work, closes per task, and undoes both', async () => {
  const h = harness();
  try {
    await h.meta.put({ key: 'lastActiveDate', value: '2026-10-24' });
    await h.tasks.put(createTask({ id: 't1', title: 'Draft', now: 1 }));
    await h.blocks.put(createBlock({ id: 'b1', date: '2026-10-24', startMin: 540, durationMin: 30, kind: 'task', title: 'Draft', taskId: 't1', now: 1 }));

    const plan = await h.carry('2026-10-25');
    expect(plan.carriedTaskIds).toEqual(['t1']);
    expect(await h.blocks.get('b1')).toBeUndefined();
    expect(await h.tasks.get('t1')).toMatchObject({ status: 'inbox', carriedFrom: '2026-10-24' });
    expect(await h.meta.get('lastActiveDate')).toMatchObject({ value: '2026-10-25' });
    expect(plan.undo.blocks.map((block) => block.id)).toEqual(['b1']);
    expect(plan.undo.tasks.map((task) => task.id)).toEqual(['t1']);

    await h.tasks.put(createTask({ id: 't2', title: 'Keep me', now: 2 }));
    await h.blocks.put(createBlock({ id: 'b2', date: '2026-10-25', startMin: 600, durationMin: 30, kind: 'focus', title: 'Focus', taskId: 't2', now: 2 }));
    const kept = await h.close({ date: '2026-10-25', taskId: 't2', action: 'keep' });
    expect(kept).toMatchObject({ deletedBlocks: 1, futureDeletedBlocks: 0, archived: false, returnedToInbox: true });
    expect(kept.undo?.blocks.map((block) => block.id)).toEqual(['b2']);
    expect(await h.blocks.get('b2')).toBeUndefined();
    expect(await h.tasks.get('t2')).toMatchObject({ status: 'inbox', carriedFrom: '2026-10-25' });

    await h.tasks.put(createTask({ id: 't3', title: 'Future', now: 3 }));
    await h.blocks.put(createBlock({ id: 'b3', date: '2026-10-25', startMin: 660, durationMin: 30, kind: 'task', title: 'Future', taskId: 't3', now: 3 }));
    await h.blocks.put(createBlock({ id: 'b4', date: '2026-10-26', startMin: 660, durationMin: 30, kind: 'task', title: 'Future', taskId: 't3', now: 3 }));
    expect(await h.close({ date: '2026-10-25', taskId: 't3', action: 'keep' })).toMatchObject({
      deletedBlocks: 1,
      futureDeletedBlocks: 0,
      returnedToInbox: false,
    });
    expect(await h.tasks.get('t3')).toMatchObject({ status: 'planned' });

    await h.tasks.put(createTask({ id: 't4', title: 'Let go', now: 4 }));
    await h.blocks.put(createBlock({ id: 'b5', date: '2026-10-25', startMin: 720, durationMin: 30, kind: 'task', title: 'Let go', taskId: 't4', now: 4 }));
    await h.blocks.put(createBlock({ id: 'b6', date: '2026-10-27', startMin: 720, durationMin: 30, kind: 'task', title: 'Let go', taskId: 't4', now: 4 }));
    const letGo = await h.close({ date: '2026-10-25', taskId: 't4', action: 'let-go' });
    expect(letGo).toMatchObject({ deletedBlocks: 1, futureDeletedBlocks: 1, archived: true, returnedToInbox: false });
    expect(letGo.undo?.blocks.map((block) => block.id).sort()).toEqual(['b5', 'b6']);
    expect(await h.blocks.get('b5')).toBeUndefined();
    expect(await h.blocks.get('b6')).toBeUndefined();
    expect(await h.tasks.get('t4')).toMatchObject({ status: 'archived' });

    await h.restoreClose(letGo.undo!);
    expect(await h.blocks.get('b5')).toBeDefined();
    expect(await h.blocks.get('b6')).toBeDefined();
    expect(await h.tasks.get('t4')).toMatchObject({ status: 'inbox' });

    await h.meta.put({ key: 'lastActiveDate', value: '2026-10-26' });
    await h.blocks.put(createBlock({ id: 'b7', date: '2026-10-25', startMin: 780, durationMin: 30, kind: 'task', title: 'Draft', taskId: 't1', now: 5 }));
    expect(await h.carry('2026-10-24')).toEqual({
      deleteBlockIds: [],
      taskUpdates: [],
      carriedTaskIds: [],
      undo: { blocks: [], tasks: [] },
    });
    expect(await h.blocks.get('b7')).toBeDefined();

    await h.restoreCarry(plan.undo);
    expect(await h.blocks.get('b1')).toBeDefined();

    expect((await h.carry('2026-10-25')).carriedTaskIds).toEqual([]);
    expect(await h.blocks.get('b1')).toBeDefined();
  } finally {
    await close(h.db);
  }
});

it('guards close day and touches only task and focus blocks', async () => {
  const h = harness(new Date('2026-10-25T10:00:00'));
  try {
    await h.tasks.put(createTask({ id: 't1', title: 'One', now: 1 }));
    await h.blocks.put(createBlock({ id: 'future', date: '2026-10-26', startMin: 540, durationMin: 30, kind: 'task', title: 'One', taskId: 't1', now: 1 }));
    await expect(h.close({ date: '2026-10-26', taskId: 't1', action: 'keep' })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.close({ date: '2026-10-25', taskId: 'missing', action: 'keep' })).rejects.toMatchObject({
      code: 'TASK_NOT_FOUND',
    });

    await h.tasks.put({ ...createTask({ id: 'archived', title: 'Old', now: 2 }), status: 'archived' });
    await h.blocks.put(createBlock({ id: 'old', date: '2026-10-25', startMin: 600, durationMin: 30, kind: 'task', title: 'Old', taskId: 'archived', now: 2 }));
    expect(await h.close({ date: '2026-10-25', taskId: 'archived', action: 'keep' })).toMatchObject({
      deletedBlocks: 0,
      undo: null,
    });
    expect(await h.blocks.get('old')).toBeDefined();

    await h.tasks.put(createTask({ id: 'empty', title: 'Empty', now: 3 }));
    expect(await h.close({ date: '2026-10-25', taskId: 'empty', action: 'keep' })).toMatchObject({
      deletedBlocks: 0,
      undo: null,
    });

    await h.tasks.put(createTask({ id: 'mixed', title: 'Mixed', now: 4 }));
    await h.blocks.put(createBlock({ id: 'work', date: '2026-10-25', startMin: 660, durationMin: 30, kind: 'focus', title: 'Mixed', taskId: 'mixed', now: 4 }));
    await h.blocks.put(createBlock({ id: 'rest', date: '2026-10-25', startMin: 690, durationMin: 30, kind: 'break', title: 'Break', taskId: 'mixed', anchor: true, now: 4 }));
    await h.blocks.put(createBlock({ id: 'recurring', date: '2026-10-25', startMin: 720, durationMin: 30, kind: 'routine', title: 'Walk', taskId: 'mixed', anchor: true, now: 4 }));
    const result = await h.close({ date: '2026-10-25', taskId: 'mixed', action: 'keep' });
    expect(result).toMatchObject({ deletedBlocks: 1, returnedToInbox: true });
    expect(await h.blocks.get('work')).toBeUndefined();
    expect(await h.blocks.get('rest')).toBeDefined();
    expect(await h.blocks.get('recurring')).toBeDefined();
  } finally {
    await close(h.db);
  }
});

it('carries only unfinished task and focus blocks, with the latest source date winning', async () => {
  const h = harness();
  try {
    await h.meta.put({ key: 'lastActiveDate', value: '2026-10-24' });
    await h.tasks.put(createTask({ id: 't1', title: 'Carry', now: 1 }));
    await h.tasks.put(createTask({ id: 't2', title: 'Continues', now: 2 }));
    await h.tasks.put({ ...createTask({ id: 't3', title: 'Archived', now: 3 }), status: 'archived' });
    await h.blocks.bulkPut([
      createBlock({ id: 'old-1', date: '2026-10-22', startMin: 480, durationMin: 30, kind: 'task', title: 'Carry', taskId: 't1', now: 1 }),
      createBlock({ id: 'old-2', date: '2026-10-24', startMin: 540, durationMin: 30, kind: 'focus', title: 'Carry', taskId: 't1', now: 1 }),
      {
        ...createBlock({ id: 'done-1', date: '2026-10-24', startMin: 600, durationMin: 30, kind: 'task', title: 'Carry', taskId: 't1', now: 1 }),
        status: 'done' as const,
        completedAt: 2,
      },
      createBlock({ id: 'future-1', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'task', title: 'Continues', taskId: 't2', now: 2 }),
      createBlock({ id: 'old-3', date: '2026-10-24', startMin: 600, durationMin: 30, kind: 'task', title: 'Continues', taskId: 't2', now: 2 }),
      createBlock({ id: 'archived-old', date: '2026-10-23', startMin: 480, durationMin: 30, kind: 'task', title: 'Archived', taskId: 't3', now: 3 }),
      createBlock({ id: 'break-old', date: '2026-10-23', startMin: 540, durationMin: 30, kind: 'break', title: 'Tea', taskId: 't1', anchor: true, now: 1 }),
      createBlock({ id: 'routine-old', date: '2026-10-23', startMin: 600, durationMin: 30, kind: 'routine', title: 'Walk', now: 1 }),
    ]);

    const plan = await h.carry('2026-10-25');
    expect([...plan.deleteBlockIds].sort()).toEqual(['archived-old', 'old-1', 'old-2', 'old-3']);
    expect(plan.carriedTaskIds).toEqual(['t1']);
    expect(await h.tasks.get('t1')).toMatchObject({ status: 'inbox', carriedFrom: '2026-10-24' });
    expect(await h.tasks.get('t2')).toMatchObject({ status: 'planned' });
    expect((await h.tasks.get('t2'))?.carriedFrom).toBeUndefined();
    expect(await h.tasks.get('t3')).toMatchObject({ status: 'archived' });

    expect(await h.blocks.get('done-1')).toBeDefined();
    expect(await h.blocks.get('break-old')).toBeDefined();
    expect(await h.blocks.get('routine-old')).toBeDefined();
    expect(await h.blocks.get('future-1')).toBeDefined();
    expect(await h.blocks.get('old-1')).toBeUndefined();
    expect(await h.blocks.get('old-2')).toBeUndefined();
    expect(await h.blocks.get('old-3')).toBeUndefined();
    expect(await h.blocks.get('archived-old')).toBeUndefined();

    await h.restoreCarry(plan.undo);
    expect(await h.blocks.get('old-1')).toBeDefined();
    expect(await h.blocks.get('archived-old')).toBeDefined();
    expect(await h.tasks.get('t1')).toMatchObject({ status: 'inbox' });
    expect((await h.tasks.get('t1'))?.carriedFrom).toBeUndefined();
  } finally {
    await close(h.db);
  }
});

it('records the first real plan once and advances the active date only', async () => {
  const h = harness(new Date('2026-10-25T08:00:00'));
  try {
    await h.blocks.bulkPut([
      createBlock({ id: 'b1', date: '2026-10-25', startMin: 480, durationMin: 30, kind: 'task', title: 'A', now: 1 }),
      createBlock({ id: 'b2', date: '2026-10-25', startMin: 510, durationMin: 30, kind: 'focus', title: 'B', now: 1 }),
      createBlock({ id: 'b3', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'routine', title: 'C', now: 1 }),
    ]);
    expect((await h.carry('2026-10-25')).carriedTaskIds).toEqual([]);
    expect(await h.meta.get('lastActiveDate')).toMatchObject({ value: '2026-10-25' });
    expect(await h.meta.get('realPlanDates')).toMatchObject({ value: ['2026-10-25'] });

    await h.meta.put({ key: 'realPlanDates', value: ['2026-10-20'] });
    await h.blocks.put(createBlock({ id: 'b4', date: '2026-10-25', startMin: 570, durationMin: 30, kind: 'task', title: 'D', now: 1 }));
    expect((await h.carry('2026-10-25')).carriedTaskIds).toEqual([]);
    expect(await h.meta.get('realPlanDates')).toMatchObject({ value: ['2026-10-20', '2026-10-25'] });
  } finally {
    await close(h.db);
  }
});
