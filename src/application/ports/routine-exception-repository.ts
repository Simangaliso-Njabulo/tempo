import type { RoutineException } from '../../domain/entities';
import type { LocalDate } from '../../domain/values/local-date';

export interface RoutineExceptionRepository {
  listByDate(date: LocalDate): Promise<RoutineException[]>;
  get(id: string): Promise<RoutineException | undefined>;
  put(exception: RoutineException): Promise<void>;
  bulkPut(exceptions: RoutineException[]): Promise<void>;
  delete(id: string): Promise<void>;
}
