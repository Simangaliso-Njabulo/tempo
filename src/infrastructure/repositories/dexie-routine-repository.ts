import type { RoutineRepository } from '../../application/ports/routine-repository';
import type { Routine } from '../../domain/entities';
import type { TempoDb } from '../db/tempo-db';

export class DexieRoutineRepository implements RoutineRepository {
  constructor(private readonly db: TempoDb) {}
  listAll() { return this.db.routines.toArray(); }
  get(id: string) { return this.db.routines.get(id); }
  async put(routine: Routine) { await this.db.routines.put(routine); }
  async bulkPut(routines: Routine[]) { await this.db.routines.bulkPut(routines); }
  async delete(id: string) { await this.db.routines.delete(id); }
}
