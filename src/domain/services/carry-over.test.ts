import type { Block } from '../entities/block';
import { createTask } from '../entities/task';
import { planCarryOver } from './carry-over';

const task = (id: string, extra = {}) => ({ ...createTask({ id, title: id, now: 0 }), ...extra });
const block = (id: string, date: string, taskId: string | undefined, extra: Partial<Block> = {}): Block => ({
  id, date, startMin: 540, durationMin: 30, kind: 'task', status: 'planned', title: id, taskId, anchor: false, createdAt: 0, updatedAt: 0, ...extra,
});

describe('planCarryOver', () => {
  it('returns unfinished past work to the inbox with a carried date', () => {
    const plan = planCarryOver({ today: '2026-10-25', tasks: [task('t1')], blocks: [block('b1', '2026-10-24', 't1')], now: 100 });
    expect(plan.deleteBlockIds).toEqual(['b1']);
    expect(plan.carriedTaskIds).toEqual(['t1']);
    expect(plan.taskUpdates[0]).toMatchObject({ id: 't1', status: 'inbox', carriedFrom: '2026-10-24' });
  });

  it('uses the latest source date across multiple days', () => {
    const plan = planCarryOver({ today: '2026-10-25', tasks: [task('t1', { carriedFrom: '2026-10-23' })], blocks: [block('b1', '2026-10-24', 't1')], now: 100 });
    expect(plan.taskUpdates[0]?.carriedFrom).toBe('2026-10-24');
  });

  it('uses the latest source date when past blocks arrive out of order', () => {
    const plan = planCarryOver({
      today: '2026-10-25',
      tasks: [task('t1')],
      blocks: [block('late', '2026-10-24', 't1'), block('early', '2026-10-23', 't1')],
      now: 100,
    });
    expect(plan.taskUpdates[0]?.carriedFrom).toBe('2026-10-24');
  });

  it('does not duplicate a task that already has a future planned block', () => {
    const plan = planCarryOver({
      today: '2026-10-25',
      tasks: [task('t1')],
      blocks: [block('old', '2026-10-24', 't1'), block('future', '2026-10-26', 't1')],
      now: 100,
    });
    expect(plan.deleteBlockIds).toEqual(['old']);
    expect(plan.carriedTaskIds).toEqual([]);
    expect(plan.taskUpdates[0]).toMatchObject({ id: 't1', status: 'planned', carriedFrom: undefined });
  });

  it('does not duplicate a task that already has a planned block today', () => {
    const plan = planCarryOver({
      today: '2026-10-25',
      tasks: [task('t1')],
      blocks: [block('old', '2026-10-24', 't1'), block('today', '2026-10-25', 't1')],
      now: 100,
    });
    expect(plan.deleteBlockIds).toEqual(['old']);
    expect(plan.carriedTaskIds).toEqual([]);
    expect(plan.taskUpdates[0]).toMatchObject({ id: 't1', status: 'planned', carriedFrom: undefined });
  });

  it('never touches routines or breaks', () => {
    const plan = planCarryOver({
      today: '2026-10-25',
      tasks: [],
      blocks: [block('r', '2026-10-24', undefined, { kind: 'routine', routineId: 'r1' }), block('br', '2026-10-24', undefined, { kind: 'break' })],
      now: 100,
    });
    expect(plan.deleteBlockIds).toEqual([]);
    expect(plan.taskUpdates).toEqual([]);
    expect(plan.carriedTaskIds).toEqual([]);
  });

  it('leaves done blocks alone and skips archived tasks', () => {
    const plan = planCarryOver({
      today: '2026-10-25',
      tasks: [task('t1', { status: 'archived' })],
      blocks: [block('done', '2026-10-24', 't1', { status: 'done' }), block('open', '2026-10-24', 't1')],
      now: 100,
    });
    expect(plan.deleteBlockIds).toEqual(['open']);
    expect(plan.taskUpdates).toEqual([]);
  });

  it('is idempotent when there is nothing unfinished', () => {
    const plan = planCarryOver({ today: '2026-10-25', tasks: [task('t1')], blocks: [block('b1', '2026-10-24', 't1', { status: 'done' })], now: 100 });
    expect(plan).toEqual({ deleteBlockIds: [], taskUpdates: [], carriedTaskIds: [] });
  });
});
