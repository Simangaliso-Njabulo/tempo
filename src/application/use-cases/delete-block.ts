import { DomainError } from '../../domain/errors';
import { taskStatusAfterBlockChange } from '../../domain/services/task-status';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { TaskRepository } from '../ports/task-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export function makeDeleteBlock(deps: { blocks: BlockRepository; tasks: TaskRepository; uow: UnitOfWork; clock: Clock }) {
  return async (blockId: string) => {
    const block = await deps.blocks.get(blockId);
    if (!block) throw new DomainError('BLOCK_NOT_FOUND', 'That block no longer exists.');
    await deps.uow.run(['blocks', 'tasks'], async () => {
      await deps.blocks.delete(blockId);
      if (!block.taskId) return;
      const task = await deps.tasks.get(block.taskId);
      if (!task) return;
      const remaining = await deps.blocks.listByTask(block.taskId);
      await deps.tasks.put({ ...task, status: taskStatusAfterBlockChange(task, remaining), updatedAt: deps.clock.now().getTime() });
    });
  };
}
