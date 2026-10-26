import type { Block } from '../entities/block';
import type { Task, TaskStatus } from '../entities/task';

export function taskStatusAfterBlockDone(task: Task, blocks: Block[]): TaskStatus {
  if (task.status === 'archived') return 'archived';
  const own = blocks.filter((block) => block.taskId === task.id);
  return own.length > 0 && own.every((block) => block.status === 'done') ? 'done' : 'planned';
}

export function taskStatusAfterBlockChange(task: Task, blocks: Block[]): TaskStatus {
  if (task.status === 'archived') return 'archived';
  const own = blocks.filter((block) => block.taskId === task.id);
  if (own.some((block) => block.status === 'planned')) return 'planned';
  if (task.status === 'done') return 'done';
  return 'inbox';
}
