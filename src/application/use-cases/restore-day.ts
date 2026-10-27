import type { Block } from '../../domain/entities/block';
import type { Task } from '../../domain/entities/task';
import type { LocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';
import type { TaskRepository } from '../ports/task-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export interface DaySnapshot {
  date: LocalDate;
  blocks: Block[];
  tasks: Task[];
}

export function makeRestoreDay(deps: { blocks: BlockRepository; tasks: TaskRepository; uow: UnitOfWork }) {
  return async (snapshot: DaySnapshot) => {
    const current = await deps.blocks.listByDate(snapshot.date);
    // Only blocks that belong to the restored day are removed; work on other
    // days is never touched by an undo.
    const remove = current
      .filter((block) => !snapshot.blocks.some((item) => item.id === block.id))
      .map((block) => block.id);
    await deps.uow.run(['blocks', 'tasks'], async () => {
      if (remove.length) await deps.blocks.bulkDelete(remove);
      if (snapshot.blocks.length) await deps.blocks.bulkPut(snapshot.blocks);
      if (snapshot.tasks.length) await deps.tasks.bulkPut(snapshot.tasks);
    });
  };
}
