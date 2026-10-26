import type { Block } from '../../domain/entities/block';
import type { Task } from '../../domain/entities/task';
import { planCarryOver, type CarryOverPlan } from '../../domain/services/carry-over';
import { isLocalDate, toLocalDate, type LocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';
import type { Clock } from '../ports/clock';
import type { MetaRepository } from '../ports/meta-repository';
import type { TaskRepository } from '../ports/task-repository';
import type { UnitOfWork } from '../ports/unit-of-work';

export interface CarryOverUndo {
  blocks: Block[];
  tasks: Task[];
}

export interface CarryOverResult extends CarryOverPlan {
  undo: CarryOverUndo;
}

function emptyResult(): CarryOverResult {
  return {
    deleteBlockIds: [],
    taskUpdates: [],
    carriedTaskIds: [],
    undo: { blocks: [], tasks: [] },
  };
}

export function makeCarryOver(deps: {
  tasks: TaskRepository;
  blocks: BlockRepository;
  meta: MetaRepository;
  uow: UnitOfWork;
  clock: Clock;
}) {
  return async (today: LocalDate = toLocalDate(deps.clock.now())): Promise<CarryOverResult> => {
    const [tasks, blocks, activeMeta, planMeta] = await Promise.all([
      deps.tasks.listAll(),
      deps.blocks.listAll(),
      deps.meta.get('lastActiveDate'),
      deps.meta.get('realPlanDates'),
    ]);

    const lastActiveDate =
      typeof activeMeta?.value === 'string' && isLocalDate(activeMeta.value) ? activeMeta.value : null;
    const realPlanDates = Array.isArray(planMeta?.value)
      ? planMeta.value.filter((value): value is string => typeof value === 'string' && isLocalDate(value))
      : [];
    const hasPlanToday = blocks.filter((block) => block.date === today).length >= 3;
    const nextRealPlanDates =
      hasPlanToday && !realPlanDates.includes(today) ? [...realPlanDates, today].sort() : realPlanDates;

    if (!lastActiveDate) {
      await deps.uow.run(['meta'], async () => {
        await deps.meta.put({ key: 'lastActiveDate', value: today });
        await deps.meta.put({ key: 'realPlanDates', value: nextRealPlanDates });
      });
      return emptyResult();
    }

    // The rollover runs once per calendar day. A backwards clock or a repeated
    // call must never carry the same blocks twice.
    if (today < lastActiveDate) return emptyResult();
    if (today === lastActiveDate) {
      if (hasPlanToday && !realPlanDates.includes(today)) {
        await deps.uow.run(['meta'], async () => {
          await deps.meta.put({ key: 'realPlanDates', value: nextRealPlanDates });
        });
      }
      return emptyResult();
    }

    const now = deps.clock.now().getTime();
    const plan = planCarryOver({ today, tasks, blocks, now });
    const changedTaskIds = new Set(plan.taskUpdates.map((task) => task.id));
    const deletedIds = new Set(plan.deleteBlockIds);
    const undo = {
      blocks: blocks.filter((block) => deletedIds.has(block.id)),
      tasks: tasks.filter((task) => changedTaskIds.has(task.id)),
    };

    await deps.uow.run(['tasks', 'blocks', 'meta'], async () => {
      if (plan.deleteBlockIds.length) await deps.blocks.bulkDelete(plan.deleteBlockIds);
      if (plan.taskUpdates.length) await deps.tasks.bulkPut(plan.taskUpdates);
      await deps.meta.put({ key: 'lastActiveDate', value: today });
      await deps.meta.put({ key: 'realPlanDates', value: nextRealPlanDates });
    });
    return { ...plan, undo };
  };
}
