import type { CarryOverUndo } from './carry-over';
import type { BlockRepository } from '../ports/block-repository';
import type { TaskRepository } from '../ports/task-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export function makeRestoreCarryOver(deps: { tasks: TaskRepository; blocks: BlockRepository; uow: UnitOfWork }) {
  return async (snapshot: CarryOverUndo) => {
    await deps.uow.run(['tasks', 'blocks'], async () => {
      if (snapshot.blocks.length) await deps.blocks.bulkPut(snapshot.blocks);
      if (snapshot.tasks.length) await deps.tasks.bulkPut(snapshot.tasks);
    });
  };
}
