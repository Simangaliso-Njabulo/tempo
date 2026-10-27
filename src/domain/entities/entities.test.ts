import { createBlock, blockEnd } from './block';
import { createTask } from './task';
import { defaultSettings } from './settings';

describe('entities', () => {
  it('creates a task with inbox defaults', () => {
    const task = createTask({ id: 't1', title: 'Draft', now: 100 });
    expect(task).toMatchObject({ id: 't1', title: 'Draft', status: 'inbox', sortOrder: 0 });
  });

  it('creates a block and computes its end', () => {
    const block = createBlock({ id: 'b1', date: '2026-10-25', startMin: 540, durationMin: 45, kind: 'task', title: 'Draft', taskId: 't1', now: 100 });
    expect(block.status).toBe('planned');
    expect(blockEnd(block)).toBe(585);
  });

  it('provides deterministic default settings', () => {
    expect(defaultSettings(123)).toMatchObject({ id: 'app', theme: 'system', reflowAutoApply: false, inAppReminders: true, icsAlarmMinutes: 10 });
  });
});
