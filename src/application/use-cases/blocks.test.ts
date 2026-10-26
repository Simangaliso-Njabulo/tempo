import { createBlock } from '../../domain/entities/block';
import { createTempoDb } from '../../infrastructure/db/tempo-db';
import { DexieUnitOfWork } from '../../infrastructure/db/unit-of-work';
import { DexieBlockRepository } from '../../infrastructure/repositories/dexie-block-repository';
import { DexieTaskRepository } from '../../infrastructure/repositories/dexie-task-repository';
import { makeAddBreak } from './add-break';
import { makeAddFocus } from './add-focus';
import { makeAddTask } from './add-task';
import { makeCompleteBlock } from './complete-block';
import { makeDeleteBlock } from './delete-block';
import { makeMoveBlock } from './move-block';
import { makePlaceTask } from './place-task';
import { makeResizeBlock } from './resize-block';

function harness() {
  const db = createTempoDb(`tempo-blocks-${crypto.randomUUID()}`);
  const uow = new DexieUnitOfWork(db);
  const tasks = new DexieTaskRepository(db);
  const blocks = new DexieBlockRepository(db);
  const clock = { now: () => new Date(1000) };
  const createId = () => crypto.randomUUID();
  return {
    db,
    tasks,
    blocks,
    addTask: makeAddTask({ tasks, clock, createId }),
    placeTask: makePlaceTask({ tasks, blocks, uow, clock, createId }),
    moveBlock: makeMoveBlock({ blocks, uow, clock }),
    resize: makeResizeBlock({ blocks, clock }),
    complete: makeCompleteBlock({ blocks, tasks, uow, clock }),
    remove: makeDeleteBlock({ blocks, tasks, uow, clock }),
    addBreak: makeAddBreak({ blocks, clock, createId }),
    addFocus: makeAddFocus({ blocks, clock, createId }),
  };
}

async function close(db: ReturnType<typeof createTempoDb>) {
  db.close();
  await db.delete();
}

it('places, moves, resizes, completes, reopens, and deletes a task block', async () => {
  const h = harness();
  try {
    const task = await h.addTask({ title: 'Draft' });
    const placed = await h.placeTask({ taskId: task.id, date: '2026-10-25', startMin: 540, durationMin: 30 });
    expect((await h.tasks.get(task.id))?.status).toBe('planned');

    await h.moveBlock({ blockId: placed.blockId, targetStartMin: 600 });
    expect((await h.blocks.get(placed.blockId))?.startMin).toBe(600);

    await h.resize({ blockId: placed.blockId, durationMin: 45 });
    expect((await h.blocks.get(placed.blockId))?.durationMin).toBe(45);

    await h.complete({ blockId: placed.blockId, done: true });
    expect((await h.tasks.get(task.id))?.status).toBe('done');
    await h.complete({ blockId: placed.blockId, done: false });
    expect((await h.tasks.get(task.id))?.status).toBe('planned');

    await h.remove(placed.blockId);
    expect(await h.blocks.listByDate('2026-10-25')).toHaveLength(0);
    expect((await h.tasks.get(task.id))?.status).toBe('inbox');
  } finally {
    await close(h.db);
  }
});

it('uses the new duration when re-placing a task and pushes the next block', async () => {
  const h = harness();
  try {
    const first = await h.addTask({ title: 'First' });
    const second = await h.addTask({ title: 'Second' });
    await h.placeTask({ taskId: first.id, date: '2026-10-25', startMin: 540, durationMin: 30 });
    const other = await h.placeTask({ taskId: second.id, date: '2026-10-25', startMin: 600, durationMin: 30 });

    const replaced = await h.placeTask({ taskId: first.id, date: '2026-10-25', startMin: 540, durationMin: 90 });
    expect((await h.blocks.get(replaced.blockId))?.durationMin).toBe(90);
    expect((await h.blocks.get(other.blockId))?.startMin).toBe(630);

    const day = await h.blocks.listByDate('2026-10-25');
    expect(day.some((block) => block.startMin === 600)).toBe(false);
  } finally {
    await close(h.db);
  }
});

it('moves a block earlier and pushes the blocks in between', async () => {
  const h = harness();
  try {
    const first = await h.addTask({ title: 'First' });
    const second = await h.addTask({ title: 'Second' });
    const late = await h.placeTask({ taskId: first.id, date: '2026-10-25', startMin: 660, durationMin: 30 });
    const middle = await h.placeTask({ taskId: second.id, date: '2026-10-25', startMin: 630, durationMin: 30 });

    await h.moveBlock({ blockId: late.blockId, targetStartMin: 600 });
    expect((await h.blocks.get(late.blockId))?.startMin).toBe(600);
    expect((await h.blocks.get(middle.blockId))?.startMin).toBe(630);
  } finally {
    await close(h.db);
  }
});

it('rejects placement for unknown and archived tasks', async () => {
  const h = harness();
  try {
    await expect(
      h.placeTask({ taskId: 'missing', date: '2026-10-25', startMin: 540 }),
    ).rejects.toMatchObject({ code: 'TASK_NOT_FOUND' });
    const task = await h.addTask({ title: 'Old' });
    await h.tasks.put({ ...task, status: 'archived' });
    await expect(
      h.placeTask({ taskId: task.id, date: '2026-10-25', startMin: 540 }),
    ).rejects.toMatchObject({ code: 'TASK_ARCHIVED' });
  } finally {
    await close(h.db);
  }
});

it('rejects a resize that overlaps, crosses midnight, or is too short', async () => {
  const h = harness();
  try {
    await h.blocks.bulkPut([
      createBlock({ id: 'a', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'task', title: 'A', now: 1 }),
      createBlock({ id: 'b', date: '2026-10-25', startMin: 600, durationMin: 30, kind: 'task', title: 'B', now: 1 }),
      createBlock({ id: 'late', date: '2026-10-25', startMin: 1400, durationMin: 30, kind: 'task', title: 'Late', now: 1 }),
    ]);
    await expect(h.resize({ blockId: 'a', durationMin: 90 })).rejects.toMatchObject({ code: 'BLOCK_OVERLAP' });
    await expect(h.resize({ blockId: 'late', durationMin: 60 })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.resize({ blockId: 'a', durationMin: 1 })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.resize({ blockId: 'a', durationMin: 30.5 })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.resize({ blockId: 'missing', durationMin: 30 })).rejects.toMatchObject({ code: 'BLOCK_NOT_FOUND' });
  } finally {
    await close(h.db);
  }
});

it('rejects moving, resizing, or deleting a completed block', async () => {
  const h = harness();
  try {
    const task = await h.addTask({ title: 'Done' });
    const placed = await h.placeTask({ taskId: task.id, date: '2026-10-25', startMin: 540 });
    await h.complete({ blockId: placed.blockId, done: true });
    await expect(h.moveBlock({ blockId: placed.blockId, targetStartMin: 600 })).rejects.toMatchObject({ code: 'BLOCK_DONE' });
    await expect(h.resize({ blockId: placed.blockId, durationMin: 60 })).rejects.toMatchObject({ code: 'BLOCK_DONE' });
  } finally {
    await close(h.db);
  }
});

it('adds anchored breaks and focus blocks and rejects overlap or midnight', async () => {
  const h = harness();
  try {
    const rest = await h.addBreak({ date: '2026-10-25', startMin: 540, durationMin: 60 });
    expect(rest).toMatchObject({ kind: 'break', anchor: true, title: 'Break' });
    await expect(h.addFocus({ date: '2026-10-25', startMin: 560, durationMin: 30, title: 'Deep work' })).rejects.toMatchObject({
      code: 'BLOCK_OVERLAP',
    });
    const focus = await h.addFocus({ date: '2026-10-25', startMin: 660, durationMin: 90, title: '  Deep work  ' });
    expect(focus).toMatchObject({ kind: 'focus', title: 'Deep work', anchor: false });
    await expect(h.addFocus({ date: '2026-10-25', startMin: 660, durationMin: 90, title: ' ' })).rejects.toMatchObject({
      code: 'EMPTY_TITLE',
    });
    await expect(h.addBreak({ date: '2026-10-25', startMin: 1400, durationMin: 60 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.addBreak({ date: '2026-10-25', startMin: 900, durationMin: -30 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  } finally {
    await close(h.db);
  }
});
