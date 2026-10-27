import type { Block } from '../entities/block';
import type { Routine, RoutineException } from '../entities/routine';
import { isRoutineDue, isRoutinePlaced } from './routine-occurrence';

const routine: Routine = {
  id: 'r1', title: 'Morning walk', kind: 'routine', daysOfWeek: [1, 2, 3, 4, 5], preferredStartMin: 480, durationMin: 30, anchor: true, active: true, createdAt: 0, updatedAt: 0,
};

const exception: RoutineException = { id: 'e1', routineId: 'r1', date: '2026-10-26', type: 'skip', createdAt: 0 };
const block: Block = { id: 'b1', date: '2026-10-26', startMin: 480, durationMin: 30, kind: 'routine', status: 'planned', title: 'Morning walk', routineId: 'r1', anchor: true, createdAt: 0, updatedAt: 0 };

describe('routine occurrence', () => {
  it('is due on a matching weekday and not on a skipped date', () => {
    expect(isRoutineDue(routine, '2026-10-26', [])).toBe(true);
    expect(isRoutineDue(routine, '2026-10-26', [exception])).toBe(false);
    expect(isRoutineDue(routine, '2026-10-25', [])).toBe(false);
  });

  it('is never due when inactive', () => {
    expect(isRoutineDue({ ...routine, active: false }, '2026-10-26', [])).toBe(false);
  });

  it('detects a placed occurrence by routine and date', () => {
    expect(isRoutinePlaced([block], 'r1', '2026-10-26')).toBe(true);
    expect(isRoutinePlaced([block], 'r1', '2026-10-27')).toBe(false);
    expect(isRoutinePlaced([block], 'r2', '2026-10-26')).toBe(false);
  });
});
