import type { BlockRepository } from '../../application/ports/block-repository';
import type { Block } from '../../domain/entities';
import type { LocalDate } from '../../domain/values/local-date';
import type { TempoDb } from '../db/tempo-db';

export class DexieBlockRepository implements BlockRepository {
  constructor(private readonly db: TempoDb) {}
  listByDate(date: LocalDate) { return this.db.blocks.where('date').equals(date).sortBy('startMin'); }
  listByTask(taskId: string) { return this.db.blocks.where('taskId').equals(taskId).toArray(); }
  listByRoutine(routineId: string) { return this.db.blocks.where('routineId').equals(routineId).toArray(); }
  listAll() { return this.db.blocks.toArray(); }
  get(id: string) { return this.db.blocks.get(id); }
  async put(block: Block) { await this.db.blocks.put(block); }
  async bulkPut(blocks: Block[]) { await this.db.blocks.bulkPut(blocks); }
  async delete(id: string) { await this.db.blocks.delete(id); }
  async bulkDelete(ids: string[]) { await this.db.blocks.bulkDelete(ids); }
  async deleteByDateAndTask(date: LocalDate, taskId: string) {
    const ids = await this.db.blocks.where('date').equals(date).and((block) => block.taskId === taskId).primaryKeys();
    await this.db.blocks.bulkDelete(ids);
  }
}
