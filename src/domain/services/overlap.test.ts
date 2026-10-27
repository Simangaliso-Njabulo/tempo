import { blocksOverlap, compareBlocks, findOverlappingBlock } from './overlap';

const block = (id: string, startMin: number, durationMin: number, extra = {}) => ({
  id, startMin, durationMin, status: 'planned' as const, anchor: false, createdAt: 0, ...extra,
});

describe('overlap', () => {
  it('treats touching edges as non-overlapping', () => {
    expect(blocksOverlap(block('a', 540, 30), block('b', 570, 30))).toBe(false);
    expect(blocksOverlap(block('a', 540, 31), block('b', 570, 30))).toBe(true);
  });

  it('finds the first overlapping block and can ignore one id', () => {
    const a = block('a', 540, 30);
    const b = block('b', 555, 30);
    expect(findOverlappingBlock([a, b], block('c', 550, 10))?.id).toBe('a');
    expect(findOverlappingBlock([a, b], block('c', 550, 10), 'a')?.id).toBe('b');
  });

  it('orders by start, then creation, then id', () => {
    const items = [block('b', 600, 30), block('a', 600, 30), block('c', 540, 60)];
    expect(items.sort(compareBlocks).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });
});
