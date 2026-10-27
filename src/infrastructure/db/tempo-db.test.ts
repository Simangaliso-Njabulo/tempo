import { createTask } from '../../domain/entities/task';
import { createTempoDb } from './tempo-db';

it('stores tasks and closes cleanly', async () => {
  const db = createTempoDb(`tempo-test-${crypto.randomUUID()}`);
  const task = createTask({ id: 't1', title: 'Draft', now: 100 });
  await db.tasks.put(task);
  expect(await db.tasks.get('t1')).toMatchObject({ title: 'Draft' });
  db.close();
  await db.delete();
});
