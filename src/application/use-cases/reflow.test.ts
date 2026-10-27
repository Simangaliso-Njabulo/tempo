import { createBlock } from '../../domain/entities/block';
import { createTempoDb } from '../../infrastructure/db/tempo-db';
import { DexieUnitOfWork } from '../../infrastructure/db/unit-of-work';
import { DexieBlockRepository } from '../../infrastructure/repositories/dexie-block-repository';
import { makeApplyReflow } from './apply-reflow';
import { makePreviewReflow } from './preview-reflow';

function harness() {
  const db = createTempoDb(`tempo-reflow-${crypto.randomUUID()}`);
  const uow = new DexieUnitOfWork(db);
  const blocks = new DexieBlockRepository(db);
  const clock = { now: () => new Date(1000) };
  return {
    db,
    blocks,
    preview: makePreviewReflow({ blocks }),
    apply: makeApplyReflow({ blocks, uow, clock }),
  };
}

async function close(db: ReturnType<typeof createTempoDb>) {
  db.close();
  await db.delete();
}

const day = '2026-10-25';

it('previews and applies a reflow in one transaction', async () => {
  const h = harness();
  try {
    await h.blocks.bulkPut([
      createBlock({ id: 'a', date: day, startMin: 540, durationMin: 60, kind: 'task', title: 'A', now: 100 }),
      createBlock({ id: 'b', date: day, startMin: 600, durationMin: 30, kind: 'task', title: 'B', now: 100 }),
      createBlock({ id: 'c', date: day, startMin: 630, durationMin: 30, kind: 'task', title: 'C', now: 100 }),
    ]);

    const result = await h.preview({ date: day, overrunBlockId: 'a', nowMin: 615 });
    expect(result.kind).toBe('preview');
    if (result.kind !== 'preview') return;

    expect(await h.apply({ date: day, changes: result.changes })).toBe(2);
    expect((await h.blocks.get('b'))?.startMin).toBe(615);
    expect((await h.blocks.get('c'))?.startMin).toBe(645);
    expect((await h.blocks.get('c'))?.updatedAt).toBe(1000);
    expect((await h.blocks.get('a'))?.updatedAt).toBe(100);
  } finally {
    await close(h.db);
  }
});

it('reports no work when the day is already clear or nothing follows', async () => {
  const h = harness();
  try {
    await h.blocks.bulkPut([
      createBlock({ id: 'a', date: day, startMin: 540, durationMin: 60, kind: 'task', title: 'A', now: 100 }),
    ]);
    await expect(h.preview({ date: day, overrunBlockId: 'a', nowMin: 540 })).resolves.toEqual({
      kind: 'noop',
      reason: 'already-clear',
    });
    await expect(h.preview({ date: day, overrunBlockId: 'a', nowMin: 615 })).resolves.toEqual({
      kind: 'noop',
      reason: 'no-blocks-after',
    });
    await expect(h.preview({ date: day, overrunBlockId: 'missing', nowMin: 615 })).resolves.toEqual({
      kind: 'noop',
      reason: 'already-clear',
    });
    expect(await h.apply({ date: day, changes: [] })).toBe(0);
  } finally {
    await close(h.db);
  }
});

it('protects anchored, completed, and stale blocks', async () => {
  const h = harness();
  try {
    await h.blocks.bulkPut([
      createBlock({ id: 'anchor', date: day, startMin: 600, durationMin: 30, kind: 'break', title: 'Break', anchor: true, now: 100 }),
      {
        ...createBlock({ id: 'done', date: day, startMin: 660, durationMin: 30, kind: 'task', title: 'Done', now: 100 }),
        status: 'done' as const,
        completedAt: 101,
      },
      createBlock({ id: 'b', date: day, startMin: 540, durationMin: 30, kind: 'task', title: 'B', now: 100 }),
    ]);
    const move = (blockId: string, fromStartMin: number, toStartMin: number) => ({
      blockId,
      fromStartMin,
      fromDurationMin: 30,
      toStartMin,
      toDurationMin: 30,
    });

    await expect(h.apply({ date: day, changes: [move('anchor', 600, 570)] })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.apply({ date: day, changes: [move('done', 660, 630)] })).rejects.toMatchObject({ code: 'BLOCK_DONE' });
    await expect(h.apply({ date: day, changes: [move('b', 545, 570)] })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.apply({ date: day, changes: [move('missing', 540, 570)] })).rejects.toMatchObject({
      code: 'BLOCK_NOT_FOUND',
    });
    expect((await h.blocks.get('b'))?.updatedAt).toBe(100);
  } finally {
    await close(h.db);
  }
});

it('rejects duplicate ids and invalid times', async () => {
  const h = harness();
  try {
    await h.blocks.bulkPut([
      createBlock({ id: 'b', date: day, startMin: 540, durationMin: 30, kind: 'task', title: 'B', now: 100 }),
    ]);
    const base = { blockId: 'b', fromStartMin: 540, fromDurationMin: 30, toStartMin: 570, toDurationMin: 30 };

    await expect(h.apply({ date: day, changes: [base, base] })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(h.apply({ date: day, changes: [{ ...base, toStartMin: -5 }] })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.apply({ date: day, changes: [{ ...base, toStartMin: 540.5 }] })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.apply({ date: day, changes: [{ ...base, toDurationMin: 4 }] })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.apply({ date: day, changes: [{ ...base, toStartMin: 1420, toDurationMin: 30 }] })).rejects.toMatchObject(
      { code: 'INVALID_INPUT' },
    );
    expect(await h.apply({ date: day, changes: [base] })).toBe(1);
  } finally {
    await close(h.db);
  }
});

it('rejects a plan where two shifted blocks land on each other', async () => {
  const h = harness();
  try {
    await h.blocks.bulkPut([
      createBlock({ id: 'b', date: day, startMin: 600, durationMin: 30, kind: 'task', title: 'B', now: 100 }),
      createBlock({ id: 'c', date: day, startMin: 660, durationMin: 30, kind: 'task', title: 'C', now: 100 }),
    ]);
    const changes = [
      { blockId: 'b', fromStartMin: 600, fromDurationMin: 30, toStartMin: 660, toDurationMin: 30 },
      { blockId: 'c', fromStartMin: 660, fromDurationMin: 30, toStartMin: 660, toDurationMin: 30 },
    ];
    await expect(h.apply({ date: day, changes })).rejects.toMatchObject({ code: 'BLOCK_OVERLAP' });
    // A rejected apply writes nothing.
    expect((await h.blocks.get('b'))?.startMin).toBe(600);
    expect((await h.blocks.get('c'))?.startMin).toBe(660);
  } finally {
    await close(h.db);
  }
});
