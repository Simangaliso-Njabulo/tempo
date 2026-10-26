import { createBlock } from '../../domain/entities/block';
import { DomainError } from '../../domain/errors';
import { resolvePlacement } from '../../domain/services/placement';
import { isRoutineDue, isRoutinePlaced } from '../../domain/services/routine-occurrence';
import type { LocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { RoutineExceptionRepository } from '../ports/routine-exception-repository';
import type { RoutineRepository } from '../ports/routine-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export function makePlaceRoutine(deps: {
  routines: RoutineRepository;
  blocks: BlockRepository;
  exceptions: RoutineExceptionRepository;
  uow: UnitOfWork;
  clock: Clock;
  createId: () => string;
}) {
  return async (input: { routineId: string; date: LocalDate; startMin?: number; minStartMin?: number }) => {
    const routine = await deps.routines.get(input.routineId);
    if (!routine) throw new DomainError('ROUTINE_NOT_FOUND', 'That routine no longer exists.');
    const exceptions = await deps.exceptions.listByDate(input.date);
    if (!isRoutineDue(routine, input.date, exceptions)) throw new DomainError('ROUTINE_NOT_DUE', 'That routine is not due today.');
    const blocks = await deps.blocks.listByDate(input.date);
    if (isRoutinePlaced(blocks, routine.id, input.date)) {
      throw new DomainError('ROUTINE_ALREADY_PLACED', 'That routine is already on the timeline.');
    }

    const now = deps.clock.now().getTime();
    const draft = createBlock({
      id: deps.createId(),
      date: input.date,
      startMin: input.startMin ?? routine.preferredStartMin,
      durationMin: routine.durationMin,
      kind: routine.kind,
      title: routine.title,
      routineId: routine.id,
      anchor: routine.anchor,
      now,
    });
    const result = resolvePlacement({
      blocks: [...blocks, draft],
      movingBlockId: draft.id,
      targetStartMin: draft.startMin,
      minStartMin: input.minStartMin ?? 0,
    });
    if (!result.ok) throw new DomainError('NO_SLOT', 'No open slot today.');

    await deps.uow.run(['blocks'], async () => {
      const byId = new Map(blocks.map((block) => [block.id, block]));
      byId.set(draft.id, { ...draft, startMin: result.movingStartMin, updatedAt: now });
      for (const change of result.changes) {
        const block = byId.get(change.blockId);
        if (block) {
          byId.set(block.id, { ...block, startMin: change.toStartMin, durationMin: change.toDurationMin, updatedAt: now });
        }
      }
      await deps.blocks.bulkPut([...byId.values()]);
    });

    return { blockId: draft.id, startMin: result.movingStartMin, changes: result.changes };
  };
}
