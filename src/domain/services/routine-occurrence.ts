import type { Block } from '../entities/block';
import type { Routine, RoutineException } from '../entities/routine';
import { dayOfWeek } from '../values/local-date';

export function isRoutineDue(routine: Routine, date: string, exceptions: RoutineException[]): boolean {
  if (!routine.active) return false;
  if (!routine.daysOfWeek.includes(dayOfWeek(date))) return false;
  return !exceptions.some((exception) => exception.routineId === routine.id && exception.date === date && exception.type === 'skip');
}

export function isRoutinePlaced(blocks: Block[], routineId: string, date: string): boolean {
  return blocks.some((block) => block.routineId === routineId && block.date === date);
}
