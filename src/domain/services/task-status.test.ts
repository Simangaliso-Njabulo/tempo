import type { Block } from '../entities/block';
import { createTask } from '../entities/task';
import { taskStatusAfterBlockChange, taskStatusAfterBlockDone } from './task-status';

const task = createTask({ id: 't1', title: 'Draft', now: 0 });
const block = (status: Block['status']): Block => ({
  id: 'b1', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'task', status, title: 'Draft', taskId: 't1', anchor: false, createdAt: 0, updatedAt: 0,
});

describe('task status', () => {
  it('marks the task done when every block is done', () => {
    expect(taskStatusAfterBlockDone(task, [block('done')])).toBe('done');
    expect(taskStatusAfterBlockDone(task, [block('done'), { ...block('done'), id: 'b2' }])).toBe('done');
  });

  it('keeps the task planned when a planned block remains', () => {
    expect(taskStatusAfterBlockDone(task, [block('done'), { ...block('planned'), id: 'b2' }])).toBe('planned');
  });

  it('returns to inbox when the last planned block is removed or reopened', () => {
    expect(taskStatusAfterBlockChange(task, [block('planned')])).toBe('planned');
    expect(taskStatusAfterBlockChange(task, [])).toBe('inbox');
    expect(taskStatusAfterBlockChange(task, [block('done')])).toBe('inbox');
  });

  it('keeps a done task done when a historical block is reopened without a planned block', () => {
    expect(taskStatusAfterBlockChange({ ...task, status: 'done' }, [block('done')])).toBe('done');
  });

  it('never changes an archived task', () => {
    expect(taskStatusAfterBlockDone({ ...task, status: 'archived' }, [])).toBe('archived');
    expect(taskStatusAfterBlockChange({ ...task, status: 'archived' }, [])).toBe('archived');
  });
});
