import { DomainError } from '../../domain/errors';
import type { Routine } from '../../domain/entities/routine';
import type { Clock } from '../ports/clock';
import type { RoutineRepository } from '../ports/routine-repository';

export interface RoutineInput {
  title: string;
  kind: 'routine' | 'break';
  daysOfWeek: number[];
  preferredStartMin: number;
  durationMin: number;
  anchor: boolean;
}

export function validateRoutineInput(input: RoutineInput): RoutineInput {
  const title = input.title.trim();
  if (!title) throw new DomainError('EMPTY_TITLE', 'Give the routine a name.');
  if (title.length > 200) throw new DomainError('TITLE_TOO_LONG', 'Keep the title under 200 characters.');
  if (input.daysOfWeek.length === 0 || input.daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new DomainError('INVALID_INPUT', 'Choose at least one valid day.');
  }
  if (new Set(input.daysOfWeek).size !== input.daysOfWeek.length) throw new DomainError('INVALID_INPUT', 'Choose each day once.');
  if (!Number.isInteger(input.preferredStartMin) || input.preferredStartMin < 0 || input.preferredStartMin >= 1440) {
    throw new DomainError('INVALID_INPUT', 'Choose a valid start time.');
  }
  if (!Number.isInteger(input.durationMin) || input.durationMin < 5 || input.durationMin > 1440 - input.preferredStartMin) {
    throw new DomainError('INVALID_INPUT', 'Choose a valid duration.');
  }
  return { ...input, title, daysOfWeek: [...input.daysOfWeek].sort((a, b) => a - b) };
}

export function makeAddRoutine(deps: { routines: RoutineRepository; clock: Clock; createId: () => string }) {
  return async (input: RoutineInput): Promise<Routine> => {
    const clean = validateRoutineInput(input);
    const now = deps.clock.now().getTime();
    const routine: Routine = { id: deps.createId(), ...clean, active: true, createdAt: now, updatedAt: now };
    await deps.routines.put(routine);
    return routine;
  };
}
