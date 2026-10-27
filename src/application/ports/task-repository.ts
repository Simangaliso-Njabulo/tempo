import type { Task } from '../../domain/entities';

export interface TaskRepository {
  listAll(): Promise<Task[]>;
  get(id: string): Promise<Task | undefined>;
  put(task: Task): Promise<void>;
  bulkPut(tasks: Task[]): Promise<void>;
  delete(id: string): Promise<void>;
}
