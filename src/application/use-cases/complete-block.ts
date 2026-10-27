import { DomainError } from '../../domain/errors';
import { taskStatusAfterBlockChange, taskStatusAfterBlockDone } from '../../domain/services/task-status';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { TaskRepository } from '../ports/task-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export function makeCompleteBlock(deps: { blocks: BlockRepository; tasks: TaskRepository; uow: UnitOfWork; clock: Clock }) {
  return async (input: { blockId: string; done: boolean }) => {
    const block = await deps.blocks.get(input.blockId);
    if (!block) throw new DomainError('BLOCK_NOT_FOUND', 'That block no longer exists.');
    const now = deps.clock.now().getTime();
    const updated = {
      ...block,
      status: input.done ? ('done' as const) : ('planned' as const),
      completedAt: input.done ? now : undefined,
      updatedAt: now,
    };
    await deps.uow.run(['blocks', 'tasks'], async () => {
      await deps.blocks.put(updated);
      if (!block.taskId) return;
      const task = await deps.tasks.get(block.taskId);
      if (!task) return;
      const all = await deps.blocks.listByTask(block.taskId);
      const nextBlocks = all.map((item) => (item.id === block.id ? updated : item));
      const status = input.done ? taskStatusAfterBlockDone(task, nextBlocks) : taskStatusAfterBlockChange(task, nextBlocks);
      await deps.tasks.put({ ...task, status, completedAt: status === 'done' ? now : undefined, updatedAt: now });
    });
    return updated;
  };
}
