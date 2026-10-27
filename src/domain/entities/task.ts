import type { LocalDate } from '../values/local-date';

export type TaskStatus = 'inbox' | 'planned' | 'done' | 'archived';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  carriedFrom?: LocalDate;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  archivedAt?: number;
}

export function createTask(input: {
  id: string;
  title: string;
  now: number;
  sortOrder?: number;
  carriedFrom?: LocalDate;
}): Task {
  return {
    id: input.id,
    title: input.title.trim(),
    status: 'inbox',
    carriedFrom: input.carriedFrom,
    sortOrder: input.sortOrder ?? 0,
    createdAt: input.now,
    updatedAt: input.now,
  };
}
