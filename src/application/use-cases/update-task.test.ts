import { makeUpdateTask } from './update-task';
import { createTask, type Task } from '../../domain/entities/task';
import type { TaskRepository } from '../ports/task-repository';

const clock = { now: () => new Date(1000) };
const repo = (): TaskRepository & { values: Map<string, Task> } => {
  const values = new Map<string, Task>();
  return {
    values,
    listAll: () => Promise.resolve([...values.values()]),
    get: (id) => Promise.resolve(values.get(id)),
    put: (task) => {
      values.set(task.id, task);
      return Promise.resolve();
    },
    bulkPut: (tasks) => {
      tasks.forEach((task) => values.set(task.id, task));
      return Promise.resolve();
    },
    delete: (id) => {
      values.delete(id);
      return Promise.resolve();
    },
  };
};

it('renames and archives a task', async () => {
  const tasks = repo();
  await tasks.put(createTask({ id: 't1', title: 'Draft', now: 0 }));
  const update = makeUpdateTask({ tasks, clock });
  expect((await update({ id: 't1', title: '  Final  ' })).title).toBe('Final');
  expect((await update({ id: 't1', archive: true })).status).toBe('archived');
});

it('rejects an unknown task and an empty rename', async () => {
  const tasks = repo();
  await tasks.put(createTask({ id: 't1', title: 'Draft', now: 0 }));
  const update = makeUpdateTask({ tasks, clock });
  await expect(update({ id: 'missing' })).rejects.toMatchObject({ code: 'TASK_NOT_FOUND' });
  await expect(update({ id: 't1', title: '  ' })).rejects.toMatchObject({ code: 'EMPTY_TITLE' });
  await expect(update({ id: 't1', title: 'x'.repeat(201) })).rejects.toMatchObject({ code: 'TITLE_TOO_LONG' });
});
