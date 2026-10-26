import type { Block } from '../entities/block';

export function blocksOverlap(
  a: Pick<Block, 'startMin' | 'durationMin'>,
  b: Pick<Block, 'startMin' | 'durationMin'>,
): boolean {
  return a.startMin < b.startMin + b.durationMin && b.startMin < a.startMin + a.durationMin;
}

export function findOverlappingBlock<T extends Pick<Block, 'id' | 'startMin' | 'durationMin'>>(
  blocks: T[],
  candidate: Pick<Block, 'startMin' | 'durationMin'>,
  ignoreId?: string,
): T | undefined {
  return blocks.find((block) => block.id !== ignoreId && blocksOverlap(block, candidate));
}

export function compareBlocks(
  a: Pick<Block, 'startMin' | 'createdAt' | 'id'>,
  b: Pick<Block, 'startMin' | 'createdAt' | 'id'>,
): number {
  if (a.startMin !== b.startMin) return a.startMin - b.startMin;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
