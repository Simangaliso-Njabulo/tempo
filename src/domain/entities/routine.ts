import type { LocalDate } from '../values/local-date';
import type { MinuteOfDay } from '../values/minute-of-day';

export type RoutineKind = 'routine' | 'break';

export interface Routine {
  id: string;
  title: string;
  kind: RoutineKind;
  daysOfWeek: number[];
  preferredStartMin: MinuteOfDay;
  durationMin: number;
  anchor: boolean;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RoutineException {
  id: string;
  routineId: string;
  date: LocalDate;
  type: 'skip';
  createdAt: number;
}
