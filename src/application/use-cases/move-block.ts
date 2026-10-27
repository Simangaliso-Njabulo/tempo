import { DomainError } from '../../domain/errors';
import { resolvePlacement } from '../../domain/services/placement';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { UnitOfWork } from '../ports/unit-of-work';

export function makeMoveBlock(deps: { blocks: BlockRepository; uow: UnitOfWork; clock: Clock }) {
  return async (input: { blockId: string; targetStartMin: number; minStartMin?: number }) => {
    const block = await deps.blocks.get(input.blockId);
    if (!block) throw new DomainError('BLOCK_NOT_FOUND', 'That block no longer exists.');
    if (block.status === 'done') throw new DomainError('BLOCK_DONE', 'Reopen the block before moving it.');
    const blocks = await deps.blocks.listByDate(block.date);
    const result = resolvePlacement({ blocks, movingBlockId: block.id, targetStartMin: input.targetStartMin, minStartMin: input.minStartMin ?? 0 });
    if (!result.ok) throw new DomainError('NO_SLOT', 'There is no room for that block.');

    const now = deps.clock.now().getTime();
    await deps.uow.run(['blocks'], async () => {
      const byId = new Map(blocks.map((item) => [item.id, item]));
      byId.set(block.id, { ...block, startMin: result.movingStartMin, updatedAt: now });
      for (const change of result.changes) {
        const item = byId.get(change.blockId);
        if (item) byId.set(item.id, { ...item, startMin: change.toStartMin, durationMin: change.toDurationMin, updatedAt: now });
      }
      await deps.blocks.bulkPut([...byId.values()]);
    });
    return result;
  };
}
