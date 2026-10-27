import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBlock } from '../../domain/entities/block';
import { createTask } from '../../domain/entities/task';
import { TaskDetail } from './TaskDetail';

const block = createBlock({
  id: 'b1',
  date: '2026-10-26',
  startMin: 540,
  durationMin: 30,
  kind: 'task',
  title: 'Draft the plan',
  taskId: 't1',
  now: 1,
});

const task = createTask({ id: 't1', title: 'Draft the plan', now: 1, carriedFrom: '2026-10-25' });

function props(overrides: Partial<Parameters<typeof TaskDetail>[0]> = {}) {
  return {
    open: true,
    block,
    task,
    timeFormat: '24h' as const,
    onClose: vi.fn(),
    onComplete: vi.fn(),
    onReopen: vi.fn(),
    onResize: vi.fn(),
    onMove: vi.fn(),
    onDelete: vi.fn(),
    onArchive: vi.fn(),
    ...overrides,
  };
}

it('shows the block, carried badge, and calls each action', async () => {
  const onResize = vi.fn();
  const onMove = vi.fn();
  const onComplete = vi.fn();
  const onDelete = vi.fn();
  const onArchive = vi.fn();
  render(<TaskDetail {...props({ onResize, onMove, onComplete, onDelete, onArchive })} />);

  expect(screen.getByRole('heading', { name: 'Draft the plan' })).toBeInTheDocument();
  expect(screen.getByText('09:00 · 30 min')).toBeInTheDocument();
  expect(screen.getByText('Carried over')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '1h' }));
  expect(onResize).toHaveBeenCalledWith(60);

  const start = screen.getByLabelText('Start time');
  await userEvent.clear(start);
  await userEvent.type(start, '10:15');
  expect(onMove).toHaveBeenCalledWith(615);

  await userEvent.click(screen.getByRole('button', { name: 'Complete' }));
  expect(onComplete).toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Delete block' }));
  expect(onDelete).toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Archive task' }));
  expect(onArchive).toHaveBeenCalled();
});

it('offers Reopen for a done block and no archive for a standalone block', async () => {
  const onReopen = vi.fn();
  render(
    <TaskDetail
      {...props({ block: { ...block, status: 'done' }, task: null, onReopen })}
    />,
  );

  expect(screen.queryByText('Carried over')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Archive task' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Reopen' }));
  expect(onReopen).toHaveBeenCalled();
});
