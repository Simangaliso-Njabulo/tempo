import type { Block } from '../../domain/entities';
import type { LocalDate } from '../../domain/values/local-date';

export interface BlockRepository {
  listByDate(date: LocalDate): Promise<Block[]>;
  listByTask(taskId: string): Promise<Block[]>;
  listByRoutine(routineId: string): Promise<Block[]>;
  listAll(): Promise<Block[]>;
  get(id: string): Promise<Block | undefined>;
  put(block: Block): Promise<void>;
  bulkPut(blocks: Block[]): Promise<void>;
  delete(id: string): Promise<void>;
  bulkDelete(ids: string[]): Promise<void>;
  deleteByDateAndTask(date: LocalDate, taskId: string): Promise<void>;
}
