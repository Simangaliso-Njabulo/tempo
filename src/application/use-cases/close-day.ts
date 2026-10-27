import type { Block } from '../../domain/entities/block';
import type { Task } from '../../domain/entities/task';
import { DomainError } from '../../domain/errors';
import { toLocalDate, type LocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { TaskRepository } from '../ports/task-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export interface CloseDayUndo {
  task: Task;
  blocks: Block[];
}

export interface CloseDayResult {
  deletedBlocks: number;
  futureDeletedBlocks: number;
  archived: boolean;
  returnedToInbox: boolean;
  undo: CloseDayUndo | null;
}

function emptyResult(): CloseDayResult {
  return { deletedBlocks: 0, futureDeletedBlocks: 0, archived: false, returnedToInbox: false, undo: null };
}

function isMovableWork(block: Block): boolean {
  return block.kind === 'task' || block.kind === 'focus';
}

export function makeCloseDay(deps: { tasks: TaskRepository; blocks: BlockRepository; uow: UnitOfWork; clock: Clock }) {
  return async (input: { date: LocalDate; taskId: string; action: 'keep' | 'let-go' }): Promise<CloseDayResult> => {
    if (input.date > toLocalDate(deps.clock.now())) {
      throw new DomainError('INVALID_INPUT', 'You can close only today or a past day.');
    }

    const task = await deps.tasks.get(input.taskId);
    if (!task) throw new DomainError('TASK_NOT_FOUND', 'That task no longer exists.');
    if (task.status === 'archived') return emptyResult();

    const blocks = await deps.blocks.listByDate(input.date);
    const unfinished = blocks.filter(
      (block) => block.taskId === task.id && isMovableWork(block) && block.status === 'planned',
    );
    if (unfinished.length === 0) return emptyResult();

    let deletedBlocks = 0;
    let futureDeletedBlocks = 0;
    let archived = false;
    let returnedToInbox = false;
    let futureBlocks: Block[] = [];
    const now = deps.clock.now().getTime();

    await deps.uow.run(['tasks', 'blocks'], async () => {
      await deps.blocks.bulkDelete(unfinished.map((block) => block.id));
      deletedBlocks = unfinished.length;

      if (input.action === 'let-go') {
        const remaining = await deps.blocks.listByTask(task.id);
        futureBlocks = remaining.filter(
          (block) => block.date > input.date && block.status === 'planned' && isMovableWork(block),
        );
        if (futureBlocks.length) await deps.blocks.bulkDelete(futureBlocks.map((block) => block.id));
        futureDeletedBlocks = futureBlocks.length;
        await deps.tasks.put({ ...task, status: 'archived', completedAt: undefined, updatedAt: now });
        archived = true;
        return;
      }

      const remaining = await deps.blocks.listByTask(task.id);
      const hasFuture = remaining.some(
        (block) => block.date > input.date && block.status === 'planned' && isMovableWork(block),
      );
      await deps.tasks.put({
        ...task,
        status: hasFuture ? 'planned' : 'inbox',
        carriedFrom: hasFuture ? undefined : input.date,
        completedAt: undefined,
        updatedAt: now,
      });
      returnedToInbox = !hasFuture;
    });

    return {
      deletedBlocks,
      futureDeletedBlocks,
      archived,
      returnedToInbox,
      undo: { task, blocks: [...unfinished, ...futureBlocks] },
    };
  };
}
