import { DomainError } from '../../domain/errors';
import type { LocalDate } from '../../domain/values/local-date';
import type { Clock } from '../ports/clock';
import type { RoutineExceptionRepository } from '../ports/routine-exception-repository';
import type { RoutineRepository } from '../ports/routine-repository';

export function makeSkipRoutine(deps: {
  routines: RoutineRepository;
  exceptions: RoutineExceptionRepository;
  clock: Clock;
  createId: () => string;
}) {
  return async (input: { routineId: string; date: LocalDate }) => {
    const routine = await deps.routines.get(input.routineId);
    if (!routine) throw new DomainError('ROUTINE_NOT_FOUND', 'That routine no longer exists.');
    const existing = await deps.exceptions.listByDate(input.date);
    const alreadySkipped = existing.find((exception) => exception.routineId === routine.id);
    if (alreadySkipped) return alreadySkipped;

    const exception = {
      id: deps.createId(),
      routineId: routine.id,
      date: input.date,
      type: 'skip' as const,
      createdAt: deps.clock.now().getTime(),
    };
    await deps.exceptions.put(exception);
    return exception;
  };
}
