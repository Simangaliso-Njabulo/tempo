import type { RoutineExceptionRepository } from '../../application/ports/routine-exception-repository';
import type { RoutineException } from '../../domain/entities';
import type { LocalDate } from '../../domain/values/local-date';
import type { TempoDb } from '../db/tempo-db';

export class DexieRoutineExceptionRepository implements RoutineExceptionRepository {
  constructor(private readonly db: TempoDb) {}
  listByDate(date: LocalDate) { return this.db.routineExceptions.where('date').equals(date).toArray(); }
  get(id: string) { return this.db.routineExceptions.get(id); }
  async put(exception: RoutineException) { await this.db.routineExceptions.put(exception); }
  async bulkPut(exceptions: RoutineException[]) { await this.db.routineExceptions.bulkPut(exceptions); }
  async delete(id: string) { await this.db.routineExceptions.delete(id); }
}
