import { makeAddTask } from './add-task';
import type { Task } from '../../domain/entities/task';
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

it('adds a trimmed task and rejects an empty title', async () => {
  const tasks = repo();
  const add = makeAddTask({ tasks, clock, createId: () => 't1' });
  const task = await add({ title: '  Draft  ' });
  expect(task).toMatchObject({ id: 't1', title: 'Draft', status: 'inbox', createdAt: 1000, updatedAt: 1000 });
  await expect(add({ title: '   ' })).rejects.toMatchObject({ code: 'EMPTY_TITLE' });
  await expect(add({ title: 'x'.repeat(201) })).rejects.toMatchObject({ code: 'TITLE_TOO_LONG' });
  expect(tasks.values.size).toBe(1);
});

it('records where a carried task came from', async () => {
  const tasks = repo();
  const add = makeAddTask({ tasks, clock, createId: () => 't1' });
  const task = await add({ title: 'Carried', carriedFrom: '2026-10-24' });
  expect(task.carriedFrom).toBe('2026-10-24');
});
