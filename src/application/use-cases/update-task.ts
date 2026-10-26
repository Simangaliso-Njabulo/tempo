import { DomainError } from '../../domain/errors';
import type { Task } from '../../domain/entities/task';
import type { Clock } from '../ports/clock';
import type { TaskRepository } from '../ports/task-repository';

export interface UpdateTaskInput {
  id: string;
  title?: string;
  archive?: boolean;
}

export function makeUpdateTask(deps: { tasks: TaskRepository; clock: Clock }) {
  return async (input: UpdateTaskInput): Promise<Task> => {
    const task = await deps.tasks.get(input.id);
    if (!task) throw new DomainError('TASK_NOT_FOUND', 'That task no longer exists.');
    const now = deps.clock.now().getTime();
    if (input.archive) {
      const archived: Task = { ...task, status: 'archived', archivedAt: now, updatedAt: now };
      await deps.tasks.put(archived);
      return archived;
    }
    const title = input.title?.trim() ?? task.title;
    if (!title) throw new DomainError('EMPTY_TITLE', 'Give the task a name.');
    if (title.length > 200) throw new DomainError('TITLE_TOO_LONG', 'Keep the title under 200 characters.');
    const updated: Task = { ...task, title, updatedAt: now };
    await deps.tasks.put(updated);
    return updated;
  };
}
