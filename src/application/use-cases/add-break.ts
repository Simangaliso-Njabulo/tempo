import { createBlock } from '../../domain/entities/block';
import { DomainError } from '../../domain/errors';
import { blocksOverlap } from '../../domain/services/overlap';
import { MINUTES_PER_DAY } from '../../domain/values/minute-of-day';
import type { LocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';

export function makeAddBreak(deps: { blocks: BlockRepository; clock: Clock; createId: () => string }) {
  return async (input: { date: LocalDate; startMin: number; durationMin: number; title?: string }) => {
    if (!Number.isInteger(input.startMin) || input.startMin < 0 || input.startMin >= MINUTES_PER_DAY) {
      throw new DomainError('INVALID_INPUT', 'Choose a valid start time.');
    }
    if (!Number.isInteger(input.durationMin) || input.durationMin < 5) {
      throw new DomainError('INVALID_INPUT', 'Choose a duration of at least 5 minutes.');
    }
    const title = input.title?.trim() || 'Break';
    if (title.length > 200) throw new DomainError('TITLE_TOO_LONG', 'Keep the title under 200 characters.');
    const blocks = await deps.blocks.listByDate(input.date);
    const block = createBlock({
      id: deps.createId(), date: input.date, startMin: input.startMin, durationMin: input.durationMin,
      kind: 'break', title, anchor: true, now: deps.clock.now().getTime(),
    });
    if (block.startMin + block.durationMin > MINUTES_PER_DAY) throw new DomainError('INVALID_INPUT', 'A block cannot cross midnight.');
    if (blocks.some((item) => blocksOverlap(item, block))) throw new DomainError('BLOCK_OVERLAP', 'That would overlap another block.');
    await deps.blocks.put(block);
    return block;
  };
}
