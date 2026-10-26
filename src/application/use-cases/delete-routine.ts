import { DomainError } from '../../domain/errors';
import type { Block } from '../../domain/entities/block';
import { toLocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { RoutineExceptionRepository } from '../ports/routine-exception-repository';
import type { RoutineRepository } from '../ports/routine-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

function withoutRoutineLink(block: Block): Block {
  const copy = { ...block };
  delete copy.routineId;
  return copy;
}

export function makeDeleteRoutine(deps: {
  routines: RoutineRepository;
  blocks: BlockRepository;
  exceptions: RoutineExceptionRepository;
  uow: UnitOfWork;
  clock: Clock;
}) {
  return async (routineId: string) => {
    const routine = await deps.routines.get(routineId);
    if (!routine) throw new DomainError('ROUTINE_NOT_FOUND', 'That routine no longer exists.');
    const today = toLocalDate(deps.clock.now());

    const blocks = await deps.blocks.listByRoutine(routineId);
    // Today's and future uncompleted blocks go. Completed blocks and past days
    // stay as history, with the routine link removed so no backup carries a
    // dangling reference.
    const removed = blocks.filter((block) => block.status === 'planned' && block.date >= today);
    const removedIds = new Set(removed.map((block) => block.id));
    const retained = blocks.filter((block) => !removedIds.has(block.id)).map(withoutRoutineLink);
    const exceptions = await deps.exceptions.listByRoutine(routineId);

    await deps.uow.run(['routines', 'blocks', 'routineExceptions'], async () => {
      if (retained.length > 0) await deps.blocks.bulkPut(retained);
      if (removed.length > 0) await deps.blocks.bulkDelete([...removedIds]);
      if (exceptions.length > 0) await deps.exceptions.bulkDelete(exceptions.map((exception) => exception.id));
      await deps.routines.delete(routineId);
    });

    return { deletedBlocks: removed.length, retainedBlocks: retained.length, deletedExceptions: exceptions.length };
  };
}
