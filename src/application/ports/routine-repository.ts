import type { Routine } from '../../domain/entities';

export interface RoutineRepository {
  listAll(): Promise<Routine[]>;
  get(id: string): Promise<Routine | undefined>;
  put(routine: Routine): Promise<void>;
  bulkPut(routines: Routine[]): Promise<void>;
  delete(id: string): Promise<void>;
}
