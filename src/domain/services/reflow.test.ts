import type { Block } from '../entities/block';
import { previewReflow } from './reflow';

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

describe('previewReflow', () => {
  it('does nothing when the day is already clear', () => {
    expect(previewReflow({ blocks: [block('a', 540, 60)], nowMin: 600, overrunBlockId: 'a' })).toEqual({
      kind: 'noop',
      reason: 'already-clear',
    });
  });

  it('shifts one movable block to the new end', () => {
    const result = previewReflow({ blocks: [block('a', 540, 60), block('b', 600, 30)], nowMin: 615, overrunBlockId: 'a' });
    expect(result).toEqual({ kind: 'preview', changes: [{ blockId: 'b', fromStartMin: 600, fromDurationMin: 30, toStartMin: 615, toDurationMin: 30 }] });
  });

  it('shifts every movable block in order and preserves duration', () => {
    const result = previewReflow({
      blocks: [block('a', 540, 60), block('b', 600, 30), block('c', 630, 45)],
      nowMin: 610,
      overrunBlockId: 'a',
    });
    expect(result.kind).toBe('preview');
    if (result.kind !== 'preview') return;
    expect(result.changes.map((change) => [change.blockId, change.toStartMin, change.toDurationMin])).toEqual([
      ['b', 610, 30],
      ['c', 640, 45],
    ]);
  });

  it('protects anchored and completed blocks and flows around them', () => {
    const result = previewReflow({
      blocks: [
        block('a', 540, 60),
        block('b', 600, 30),
        block('anchor', 620, 30, { anchor: true, kind: 'break' }),
        block('done', 650, 30, { status: 'done' }),
        block('c', 680, 30),
      ],
      nowMin: 610,
      overrunBlockId: 'a',
    });
    expect(result.kind).toBe('preview');
    if (result.kind !== 'preview') return;
    expect(result.changes).toEqual([
      { blockId: 'b', fromStartMin: 600, fromDurationMin: 30, toStartMin: 680, toDurationMin: 30 },
      { blockId: 'c', fromStartMin: 680, fromDurationMin: 30, toStartMin: 710, toDurationMin: 30 },
    ]);
  });

  it('never shifts blocks before the overrun block', () => {
    const result = previewReflow({
      blocks: [block('before', 480, 60), block('a', 540, 60), block('after', 600, 30)],
      nowMin: 610,
      overrunBlockId: 'a',
    });
    expect(result.kind).toBe('preview');
    if (result.kind !== 'preview') return;
    expect(result.changes.map((change) => change.blockId)).toEqual(['after']);
  });

  it('reports no slot without inventing a time', () => {
    const result = previewReflow({
      blocks: [block('a', 540, 60), block('b', 600, 30), block('wall', 610, 830, { anchor: true })],
      nowMin: 610,
      overrunBlockId: 'a',
    });
    expect(result).toEqual({ kind: 'blocked', reason: 'no-slot', blockId: 'b', changes: [] });
  });

  it('reports past midnight when the day cannot hold the block', () => {
    const result = previewReflow({
      blocks: [block('a', 1380, 50), block('b', 1430, 10)],
      nowMin: 1435,
      overrunBlockId: 'a',
    });
    expect(result).toEqual({ kind: 'blocked', reason: 'past-midnight', blockId: 'b', changes: [] });
  });

  it('returns no-blocks-after when the overrun block is last', () => {
    const result = previewReflow({ blocks: [block('a', 540, 30)], nowMin: 1439, overrunBlockId: 'a' });
    expect(result).toEqual({ kind: 'noop', reason: 'no-blocks-after' });
  });

  it('does not reflow a completed overrun block', () => {
    expect(previewReflow({ blocks: [block('a', 540, 30, { status: 'done' })], nowMin: 1439, overrunBlockId: 'a' })).toEqual({
      kind: 'noop',
      reason: 'already-clear',
    });
  });
});
