import { createTask, type Task } from '../../domain/entities/task';
import { DomainError } from '../../domain/errors';
import type { LocalDate } from '../../domain/values/local-date';
import type { Clock } from '../ports/clock';
import type { TaskRepository } from '../ports/task-repository';

export interface AddTaskInput {
  title: string;
  carriedFrom?: LocalDate;
}

export interface AddTaskDeps {
  tasks: TaskRepository;
  clock: Clock;
  createId: () => string;
}

export function makeAddTask(deps: AddTaskDeps) {
  return async (input: AddTaskInput): Promise<Task> => {
    const title = input.title.trim();
    if (!title) throw new DomainError('EMPTY_TITLE', 'Give the task a name.');
    if (title.length > 200) throw new DomainError('TITLE_TOO_LONG', 'Keep the title under 200 characters.');
    const now = deps.clock.now().getTime();
    const task = createTask({ id: deps.createId(), title, now, carriedFrom: input.carriedFrom });
    await deps.tasks.put(task);
    return task;
  };
}
