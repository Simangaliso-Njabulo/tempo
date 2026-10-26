import type { TaskRepository } from '../../application/ports/task-repository';
import type { Task } from '../../domain/entities';
import type { TempoDb } from '../db/tempo-db';

export class DexieTaskRepository implements TaskRepository {
  constructor(private readonly db: TempoDb) {}
  listAll() { return this.db.tasks.orderBy('sortOrder').toArray(); }
  get(id: string) { return this.db.tasks.get(id); }
  async put(task: Task) { await this.db.tasks.put(task); }
  async bulkPut(tasks: Task[]) { await this.db.tasks.bulkPut(tasks); }
  async delete(id: string) { await this.db.tasks.delete(id); }
}
