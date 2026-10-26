import { createBlock } from '../../domain/entities/block';
import { validateBackupFile } from '../../infrastructure/export/backup-file';
import { DexieBackupGateway } from '../../infrastructure/export/dexie-backup-gateway';
import { createTempoDb } from '../../infrastructure/db/tempo-db';
import { DexieUnitOfWork } from '../../infrastructure/db/unit-of-work';
import { DexieBlockRepository } from '../../infrastructure/repositories/dexie-block-repository';
import { DexieRoutineExceptionRepository } from '../../infrastructure/repositories/dexie-routine-exception-repository';
import { DexieRoutineRepository } from '../../infrastructure/repositories/dexie-routine-repository';
import { makeAddRoutine } from './add-routine';
import { makeDeleteRoutine } from './delete-routine';
import { makePlaceRoutine } from './place-routine';
import { makeSkipRoutine } from './skip-routine';
import { makeUpdateRoutine } from './update-routine';

function harness(now = new Date('2026-10-26T08:00:00')) {
  const db = createTempoDb(`tempo-routines-${crypto.randomUUID()}`);
  const uow = new DexieUnitOfWork(db);
  const routines = new DexieRoutineRepository(db);
  const exceptions = new DexieRoutineExceptionRepository(db);
  const blocks = new DexieBlockRepository(db);
  const clock = { now: () => now };
  const createId = () => crypto.randomUUID();
  return {
    db,
    uow,
    routines,
    exceptions,
    blocks,
    add: makeAddRoutine({ routines, clock, createId }),
    update: makeUpdateRoutine({ routines, clock }),
    place: makePlaceRoutine({ routines, blocks, exceptions, uow, clock, createId }),
    skip: makeSkipRoutine({ routines, exceptions, clock, createId }),
    remove: makeDeleteRoutine({ routines, blocks, exceptions, uow, clock }),
  };
}

async function close(db: ReturnType<typeof createTempoDb>) {
  db.close();
  await db.delete();
}

it('adds a routine, sorts its days, and rejects invalid input', async () => {
  const h = harness();
  try {
    const routine = await h.add({
      title: '  Morning walk  ',
      kind: 'routine',
      daysOfWeek: [5, 1, 3],
      preferredStartMin: 480,
      durationMin: 30,
      anchor: true,
    });
    expect(routine).toMatchObject({
      title: 'Morning walk',
      daysOfWeek: [1, 3, 5],
      active: true,
    });

    const base = { title: 'Walk', kind: 'routine' as const, daysOfWeek: [1], preferredStartMin: 480, durationMin: 30, anchor: true };
    await expect(h.add({ ...base, title: '  ' })).rejects.toMatchObject({ code: 'EMPTY_TITLE' });
    await expect(h.add({ ...base, title: 'x'.repeat(201) })).rejects.toMatchObject({ code: 'TITLE_TOO_LONG' });
    await expect(h.add({ ...base, daysOfWeek: [] })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.add({ ...base, daysOfWeek: [0, 7] })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.add({ ...base, daysOfWeek: [1, 1] })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.add({ ...base, preferredStartMin: 1440 })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.add({ ...base, durationMin: 4 })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.add({ ...base, durationMin: 30.5 })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.add({ ...base, preferredStartMin: 1430, durationMin: 30 })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  } finally {
    await close(h.db);
  }
});

it('places a routine once, respects due days and skips, and updates it', async () => {
  const h = harness();
  try {
    const routine = await h.add({
      title: 'Morning walk',
      kind: 'routine',
      daysOfWeek: [1],
      preferredStartMin: 480,
      durationMin: 30,
      anchor: true,
    });

    const placed = await h.place({ routineId: routine.id, date: '2026-10-26' });
    expect(await h.blocks.get(placed.blockId)).toMatchObject({
      routineId: routine.id,
      anchor: true,
      startMin: 480,
      durationMin: 30,
    });

    await expect(h.place({ routineId: routine.id, date: '2026-10-26' })).rejects.toMatchObject({
      code: 'ROUTINE_ALREADY_PLACED',
    });
    await expect(h.place({ routineId: routine.id, date: '2026-10-27' })).rejects.toMatchObject({
      code: 'ROUTINE_NOT_DUE',
    });
    await expect(h.place({ routineId: 'missing', date: '2026-10-26' })).rejects.toMatchObject({
      code: 'ROUTINE_NOT_FOUND',
    });

    const skipped = await h.skip({ routineId: routine.id, date: '2026-10-26' });
    expect(skipped).toMatchObject({ routineId: routine.id, date: '2026-10-26', type: 'skip' });
    expect(await h.skip({ routineId: routine.id, date: '2026-10-26' })).toEqual(skipped);
    expect(await h.exceptions.listByDate('2026-10-26')).toHaveLength(1);

    const updated = await h.update({ id: routine.id, patch: { title: '  Evening walk  ', preferredStartMin: 1020 } });
    expect(updated).toMatchObject({ title: 'Evening walk', preferredStartMin: 1020, active: true });
    await expect(h.update({ id: 'missing', patch: {} })).rejects.toMatchObject({ code: 'ROUTINE_NOT_FOUND' });
  } finally {
    await close(h.db);
  }
});

it('removes today and future uncompleted blocks on delete and keeps clean history', async () => {
  const h = harness();
  try {
    const routine = await h.add({
      title: 'Morning walk',
      kind: 'routine',
      daysOfWeek: [1],
      preferredStartMin: 420,
      durationMin: 30,
      anchor: true,
    });
    await h.blocks.bulkPut([
      createBlock({ id: 'past-planned', date: '2026-10-25', startMin: 480, durationMin: 30, kind: 'routine', title: 'Past', routineId: routine.id, anchor: true, now: 1 }),
      createBlock({ id: 'today-planned', date: '2026-10-26', startMin: 420, durationMin: 30, kind: 'routine', title: 'Today', routineId: routine.id, anchor: true, now: 1 }),
      createBlock({ id: 'future-planned', date: '2026-10-27', startMin: 600, durationMin: 30, kind: 'routine', title: 'Future', routineId: routine.id, anchor: true, now: 1 }),
      {
        ...createBlock({ id: 'today-done', date: '2026-10-26', startMin: 540, durationMin: 30, kind: 'routine', title: 'Done', routineId: routine.id, anchor: true, now: 1 }),
        status: 'done' as const,
        completedAt: 2,
      },
    ]);
    await h.exceptions.put({ id: 'skip-1', routineId: routine.id, date: '2026-10-25', type: 'skip', createdAt: 1 });
    await h.exceptions.put({ id: 'skip-2', routineId: routine.id, date: '2026-10-27', type: 'skip', createdAt: 1 });

    const result = await h.remove(routine.id);
    expect(result).toEqual({ deletedBlocks: 2, retainedBlocks: 2, deletedExceptions: 2 });
    expect(await h.routines.get(routine.id)).toBeUndefined();
    expect(await h.blocks.get('today-planned')).toBeUndefined();
    expect(await h.blocks.get('future-planned')).toBeUndefined();
    expect((await h.blocks.get('past-planned'))?.routineId).toBeUndefined();
    expect((await h.blocks.get('today-done'))?.status).toBe('done');
    expect((await h.blocks.get('today-done'))?.routineId).toBeUndefined();
    expect(await h.exceptions.listByRoutine(routine.id)).toHaveLength(0);

    const backup = await new DexieBackupGateway(h.db, h.uow).exportAll();
    expect(() => validateBackupFile(backup)).not.toThrow();
    await expect(h.remove('missing')).rejects.toMatchObject({ code: 'ROUTINE_NOT_FOUND' });
  } finally {
    await close(h.db);
  }
});

it('pushes movable blocks when an anchored routine takes the preferred slot', async () => {
  const h = harness();
  try {
    await h.blocks.put(
      createBlock({ id: 'movable', date: '2026-10-26', startMin: 480, durationMin: 30, kind: 'focus', title: 'Focus', now: 1 }),
    );
    const routine = await h.add({
      title: 'Standup',
      kind: 'routine',
      daysOfWeek: [1],
      preferredStartMin: 480,
      durationMin: 30,
      anchor: true,
    });
    const placed = await h.place({ routineId: routine.id, date: '2026-10-26' });
    expect(placed.startMin).toBe(480);
    expect((await h.blocks.get('movable'))?.startMin).toBe(510);
  } finally {
    await close(h.db);
  }
});
