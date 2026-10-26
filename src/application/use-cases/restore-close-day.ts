import type { CloseDayUndo } from './close-day';
import type { BlockRepository } from '../ports/block-repository';
import type { TaskRepository } from '../ports/task-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export function makeRestoreCloseDay(deps: { tasks: TaskRepository; blocks: BlockRepository; uow: UnitOfWork }) {
  return async (snapshot: CloseDayUndo) => {
    await deps.uow.run(['tasks', 'blocks'], async () => {
      await deps.tasks.put(snapshot.task);
      if (snapshot.blocks.length) await deps.blocks.bulkPut(snapshot.blocks);
    });
  };
}
