import Dexie, { type Table } from 'dexie';
import type { Block, MetaRecord, Routine, RoutineException, Settings, Task } from '../../domain/entities';

export const DB_NAME = 'tempo';

export class TempoDb extends Dexie {
  tasks!: Table<Task, string>;
  blocks!: Table<Block, string>;
  routines!: Table<Routine, string>;
  routineExceptions!: Table<RoutineException, string>;
  settings!: Table<Settings, string>;
  meta!: Table<MetaRecord, string>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(1).stores({
      tasks: 'id, status, carriedFrom, sortOrder, updatedAt',
      blocks: 'id, date, [date+startMin], taskId, routineId, status, updatedAt',
      routines: 'id, active, updatedAt',
      routineExceptions: 'id, [routineId+date], routineId, date',
      settings: 'id',
      meta: 'key',
    });
  }
}

export function createTempoDb(name?: string): TempoDb {
  return new TempoDb(name);
}
