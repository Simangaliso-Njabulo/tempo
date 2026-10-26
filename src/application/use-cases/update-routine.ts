import { DomainError } from '../../domain/errors';
import type { Routine } from '../../domain/entities/routine';
import type { Clock } from '../ports/clock';
import type { RoutineRepository } from '../ports/routine-repository';
import { validateRoutineInput, type RoutineInput } from './add-routine';

export function makeUpdateRoutine(deps: { routines: RoutineRepository; clock: Clock }) {
  return async (input: { id: string; patch: Partial<RoutineInput> & { active?: boolean } }): Promise<Routine> => {
    const routine = await deps.routines.get(input.id);
    if (!routine) throw new DomainError('ROUTINE_NOT_FOUND', 'That routine no longer exists.');
    const clean = validateRoutineInput({ ...routine, ...input.patch });
    const updated: Routine = { ...routine, ...clean, active: input.patch.active ?? routine.active, updatedAt: deps.clock.now().getTime() };
    await deps.routines.put(updated);
    return updated;
  };
}
