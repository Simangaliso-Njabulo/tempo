import type { Block, MetaRecord, Routine, RoutineException, Settings, Task } from '../../domain/entities';
import type { LocalDate } from '../../domain/values/local-date';

export interface DayPlan {
  date: LocalDate;
  blocks: Block[];
  tasks: Task[];
  routines: Routine[];
  routineExceptions: RoutineException[];
  settings: Settings;
  meta: MetaRecord[];
}

export interface DayPlanReader {
  read(date: LocalDate): Promise<DayPlan>;
}
