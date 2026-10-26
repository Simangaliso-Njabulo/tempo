import { DomainError } from '../../domain/errors';
import type { Block } from '../../domain/entities';
import { blocksOverlap } from '../../domain/services/overlap';
import type { BlockShift } from '../../domain/services/reflow';
import type { LocalDate } from '../../domain/values/local-date';
import { MINUTES_PER_DAY } from '../../domain/values/minute-of-day';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { UnitOfWork } from '../ports/unit-of-work';

const STALE_MESSAGE = 'The day changed. Preview the reflow again.';

export function makeApplyReflow(deps: { blocks: BlockRepository; uow: UnitOfWork; clock: Clock }) {
  return async (input: { date: LocalDate; changes: BlockShift[] }) => {
    const blocks = await deps.blocks.listByDate(input.date);
    const byId = new Map(blocks.map((block) => [block.id, block]));
    const seen = new Set<string>();
    const updatedBlocks: Block[] = [];
    const now = deps.clock.now().getTime();

    for (const change of input.changes) {
      if (seen.has(change.blockId)) throw new DomainError('INVALID_INPUT', 'The reflow lists the same block twice.');
      seen.add(change.blockId);

      const block = byId.get(change.blockId);
      if (!block) throw new DomainError('BLOCK_NOT_FOUND', 'That block no longer exists.');
      if (block.status === 'done') throw new DomainError('BLOCK_DONE', 'A completed block cannot be reflowed.');
      if (block.anchor) throw new DomainError('INVALID_INPUT', 'An anchored block cannot be reflowed.');
      if (!Number.isInteger(change.toStartMin) || change.toStartMin < 0) {
        throw new DomainError('INVALID_INPUT', 'Choose a valid start time.');
      }
      if (!Number.isInteger(change.toDurationMin) || change.toDurationMin < 5) {
        throw new DomainError('INVALID_INPUT', 'Choose a duration of at least 5 minutes.');
      }
      // A change written against an older version of the day must not be
      // applied on top of newer data.
      if (block.startMin !== change.fromStartMin || block.durationMin !== change.fromDurationMin) {
        throw new DomainError('INVALID_INPUT', STALE_MESSAGE);
      }
      if (change.toStartMin + change.toDurationMin > MINUTES_PER_DAY) {
        throw new DomainError('INVALID_INPUT', 'A block cannot cross midnight.');
      }

      const updated = { ...block, startMin: change.toStartMin, durationMin: change.toDurationMin, updatedAt: now };
      byId.set(block.id, updated);
      updatedBlocks.push(updated);
    }

    // Validation runs once, on the finished day. Checking each change in
    // isolation would miss two shifted blocks landing on each other.
    const next = [...byId.values()].sort((a, b) => a.startMin - b.startMin);
    for (let index = 1; index < next.length; index += 1) {
      const previous = next[index - 1];
      const current = next[index];
      if (previous && current && blocksOverlap(previous, current)) {
        throw new DomainError('BLOCK_OVERLAP', STALE_MESSAGE);
      }
    }

    await deps.uow.run(['blocks'], async () => {
      await deps.blocks.bulkPut(updatedBlocks);
    });
    return updatedBlocks.length;
  };
}
