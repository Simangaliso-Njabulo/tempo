import type { Block } from '../entities/block';
import { resolvePlacement } from './placement';

const block = (id: string, startMin: number, durationMin: number, extra: Partial<Block> = {}): Block => ({
  id,
  date: '2026-10-25',
  startMin,
  durationMin,
  kind: 'task',
  status: 'planned',
  title: id,
  anchor: false,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

describe('resolvePlacement', () => {
  it('moves later and pushes the blocks that overlap the landing', () => {
    const result = resolvePlacement({
      blocks: [block('a', 540, 60), block('b', 600, 30), block('c', 630, 30)],
      movingBlockId: 'a',
      targetStartMin: 580,
      minStartMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movingStartMin).toBe(580);
    expect(result.changes).toEqual([
      { blockId: 'b', fromStartMin: 600, fromDurationMin: 30, toStartMin: 640, toDurationMin: 30 },
      { blockId: 'c', fromStartMin: 630, fromDurationMin: 30, toStartMin: 670, toDurationMin: 30 },
    ]);
  });

  it('moves earlier and shifts every block between the new and old start', () => {
    const result = resolvePlacement({
      blocks: [block('b', 600, 30), block('c', 630, 30), block('a', 660, 60)],
      movingBlockId: 'a',
      targetStartMin: 570,
      minStartMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movingStartMin).toBe(570);
    expect(result.changes).toEqual([
      { blockId: 'b', fromStartMin: 600, fromDurationMin: 30, toStartMin: 630, toDurationMin: 30 },
      { blockId: 'c', fromStartMin: 630, fromDurationMin: 30, toStartMin: 660, toDurationMin: 30 },
    ]);
  });

  it('does not shift a block that ends exactly at the new start', () => {
    const result = resolvePlacement({
      blocks: [block('b', 540, 30), block('a', 660, 60)],
      movingBlockId: 'a',
      targetStartMin: 570,
      minStartMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toEqual([]);
    expect(result.movingStartMin).toBe(570);
  });

  it('avoids anchored and completed blocks', () => {
    const result = resolvePlacement({
      blocks: [block('a', 540, 60), block('anchor', 620, 30, { anchor: true, kind: 'break' })],
      movingBlockId: 'a',
      targetStartMin: 570,
      minStartMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movingStartMin).toBe(650);
  });

  it('rejects a completed block', () => {
    const result = resolvePlacement({
      blocks: [block('a', 540, 60, { status: 'done' })],
      movingBlockId: 'a',
      targetStartMin: 600,
      minStartMin: 0,
    });
    expect(result).toEqual({ ok: false, reason: 'block-done', changes: [] });
  });

  it('rejects an unknown block', () => {
    expect(resolvePlacement({ blocks: [], movingBlockId: 'missing', targetStartMin: 600, minStartMin: 0 })).toEqual({
      ok: false,
      reason: 'block-not-found',
      changes: [],
    });
  });

  it('returns no-slot when every candidate is blocked', () => {
    const result = resolvePlacement({
      blocks: [block('a', 1200, 60), block('wall', 1200, 240, { anchor: true })],
      movingBlockId: 'a',
      targetStartMin: 1200,
      minStartMin: 1200,
    });
    expect(result).toEqual({ ok: false, reason: 'no-slot', changes: [] });
  });

  it('never places before minStartMin', () => {
    const result = resolvePlacement({
      blocks: [block('a', 1200, 60)],
      movingBlockId: 'a',
      targetStartMin: 600,
      minStartMin: 1200,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movingStartMin).toBe(1200);
  });

  it('preserves duration and five-minute alignment', () => {
    const result = resolvePlacement({
      blocks: [block('a', 600, 37)],
      movingBlockId: 'a',
      targetStartMin: 607,
      minStartMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.movingStartMin).toBe(610);
  });
});
