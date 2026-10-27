import { createBlock } from '../../domain/entities/block';
import { DomainError } from '../../domain/errors';
import { resolvePlacement } from '../../domain/services/placement';
import type { LocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { TaskRepository } from '../ports/task-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export interface PlaceTaskInput {
  taskId: string;
  date: LocalDate;
  startMin: number;
  durationMin?: number;
  minStartMin?: number;
}

export function makePlaceTask(deps: {
  tasks: TaskRepository;
  blocks: BlockRepository;
  uow: UnitOfWork;
  clock: Clock;
  createId: () => string;
}) {
  return async (input: PlaceTaskInput) => {
    const task = await deps.tasks.get(input.taskId);
    if (!task) throw new DomainError('TASK_NOT_FOUND', 'That task no longer exists.');
    if (task.status === 'archived') throw new DomainError('TASK_ARCHIVED', 'That task is archived.');
    const now = deps.clock.now().getTime();
    const existing = await deps.blocks.listByDate(input.date);
    const current = existing.find((block) => block.taskId === task.id);
    const durationMin = input.durationMin ?? current?.durationMin ?? 30;
    if (!Number.isInteger(durationMin) || durationMin < 5) {
      throw new DomainError('INVALID_INPUT', 'Choose a duration of at least 5 minutes.');
    }
    const draft = current
      ? { ...current, durationMin }
      : createBlock({ id: deps.createId(), date: input.date, startMin: input.startMin, durationMin, kind: 'task', title: task.title, taskId: task.id, now });
    // The draft carries the new duration, so a resize-and-place computes its
    // shifts against the block's real footprint instead of its old one.
    const movable = existing.filter((block) => block.id !== draft.id);
    const result = resolvePlacement({
      blocks: [...movable, draft],
      movingBlockId: draft.id,
      targetStartMin: input.startMin,
      minStartMin: input.minStartMin ?? 0,
    });
    if (!result.ok) throw new DomainError('NO_SLOT', 'There is no room for that block.');

    await deps.uow.run(['tasks', 'blocks'], async () => {
      const byId = new Map(existing.map((block) => [block.id, block]));
      byId.set(draft.id, { ...draft, startMin: result.movingStartMin, durationMin, updatedAt: now });
      for (const change of result.changes) {
        const block = byId.get(change.blockId);
        if (block) byId.set(block.id, { ...block, startMin: change.toStartMin, durationMin: change.toDurationMin, updatedAt: now });
      }
      await deps.blocks.bulkPut([...byId.values()]);
      await deps.tasks.put({ ...task, status: 'planned', completedAt: undefined, updatedAt: now });
    });

    return { blockId: draft.id, startMin: result.movingStartMin, changes: result.changes };
  };
}
