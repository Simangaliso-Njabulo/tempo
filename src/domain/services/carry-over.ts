import type { Block } from '../entities/block';
import type { Task } from '../entities/task';

export interface CarryOverInput {
  today: string;
  tasks: Task[];
  blocks: Block[];
  now: number;
}

export interface CarryOverPlan {
  deleteBlockIds: string[];
  taskUpdates: Task[];
  carriedTaskIds: string[];
}

export function planCarryOver(input: CarryOverInput): CarryOverPlan {
  const pastUnfinished = input.blocks.filter(
    (block) =>
      block.date < input.today &&
      block.status === 'planned' &&
      (block.kind === 'task' || block.kind === 'focus') &&
      Boolean(block.taskId),
  );
  if (pastUnfinished.length === 0) return { deleteBlockIds: [], taskUpdates: [], carriedTaskIds: [] };

  const futureTaskIds = new Set(
    input.blocks
      .filter(
        (block) =>
          block.date >= input.today &&
          block.status === 'planned' &&
          (block.kind === 'task' || block.kind === 'focus') &&
          block.taskId,
      )
      .map((block) => block.taskId as string),
  );
  const latestSource = new Map<string, string>();
  for (const block of pastUnfinished) {
    if (!block.taskId) continue;
    const previous = latestSource.get(block.taskId);
    if (!previous || block.date > previous) latestSource.set(block.taskId, block.date);
  }

  const taskUpdates: Task[] = [];
  const carriedTaskIds: string[] = [];

  for (const task of input.tasks) {
    if (!latestSource.has(task.id) || task.status === 'archived') continue;
    if (futureTaskIds.has(task.id)) {
      taskUpdates.push({
        ...task,
        status: 'planned',
        carriedFrom: undefined,
        completedAt: undefined,
        updatedAt: input.now,
      });
      continue;
    }
    taskUpdates.push({
      ...task,
      status: 'inbox',
      carriedFrom: latestSource.get(task.id),
      updatedAt: input.now,
    });
    carriedTaskIds.push(task.id);
  }

  return { deleteBlockIds: pastUnfinished.map((block) => block.id), taskUpdates, carriedTaskIds };
}
