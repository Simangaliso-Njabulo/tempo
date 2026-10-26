import { DomainError } from '../../domain/errors';
import { blocksOverlap } from '../../domain/services/overlap';
import { MINUTES_PER_DAY } from '../../domain/values/minute-of-day';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';

export function makeResizeBlock(deps: { blocks: BlockRepository; clock: Clock }) {
  return async (input: { blockId: string; durationMin: number }) => {
    const block = await deps.blocks.get(input.blockId);
    if (!block) throw new DomainError('BLOCK_NOT_FOUND', 'That block no longer exists.');
    if (block.status === 'done') throw new DomainError('BLOCK_DONE', 'Reopen the block before resizing it.');
    if (!Number.isInteger(input.durationMin) || input.durationMin < 5) {
      throw new DomainError('INVALID_INPUT', 'Choose a duration of at least 5 minutes.');
    }
    const duration = input.durationMin;
    if (block.startMin + duration > MINUTES_PER_DAY) throw new DomainError('INVALID_INPUT', 'A block cannot cross midnight.');
    const updated = { ...block, durationMin: duration, updatedAt: deps.clock.now().getTime() };
    const others = (await deps.blocks.listByDate(block.date)).filter((item) => item.id !== block.id);
    if (others.some((item) => blocksOverlap(item, updated))) {
      throw new DomainError('BLOCK_OVERLAP', 'That would overlap another block. Choose a shorter length or move the other block.');
    }
    await deps.blocks.put(updated);
    return updated;
  };
}
