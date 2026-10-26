import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createBlock, type Block } from '../../domain/entities/block';
import { createTask } from '../../domain/entities/task';
import { CloseDay } from './CloseDay';

const date = '2026-10-26' as const;

const doneTask: Block = {
  ...createBlock({ id: 'b1', date, startMin: 540, durationMin: 30, kind: 'task', title: 'Done task', taskId: 't1', now: 1 }),
  status: 'done',
  completedAt: 2,
};
const doneFocus: Block = {
  ...createBlock({ id: 'b2', date, startMin: 600, durationMin: 45, kind: 'focus', title: 'Focus', now: 1 }),
  status: 'done',
  completedAt: 2,
};
const planned: Block = createBlock({
  id: 'b3',
  date,
  startMin: 660,
  durationMin: 30,
  kind: 'task',
  title: 'Draft',
  taskId: 't2',
  now: 1,
});
const plannedReview: Block = createBlock({
  id: 'b4',
  date,
  startMin: 720,
  durationMin: 30,
  kind: 'task',
  title: 'Review',
  taskId: 't3',
  now: 1,
});
const standalone: Block = createBlock({
  id: 'b5',
  date,
  startMin: 780,
  durationMin: 30,
  kind: 'focus',
  title: 'Deep focus',
  now: 1,
});

const tasks = [
  createTask({ id: 't2', title: 'Draft', now: 1, carriedFrom: '2026-10-25' }),
  createTask({ id: 't3', title: 'Review', now: 1 }),
];

function props(overrides: Partial<Parameters<typeof CloseDay>[0]> = {}) {
  return {
    open: true,
    date,
    blocks: [doneTask, doneFocus, planned, plannedReview, standalone],
    tasks,
    timeFormat: '24h' as const,
    onClose: vi.fn(),
    onKeep: vi.fn().mockResolvedValue(undefined),
    onLetGo: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

it('shows the quiet summary and updates the moved count after a keep', async () => {
  const onKeep = vi.fn().mockResolvedValue(undefined);
  render(<CloseDay {...props({ onKeep })} />);

  expect(screen.getByText('2 done · 0 moved · 45 min focus')).toBeInTheDocument();
  expect(screen.getByText('3 planned')).toBeInTheDocument();
  expect(screen.getByText('1 carried over')).toBeInTheDocument();
  expect(screen.getByText('Carried over')).toBeInTheDocument();
  expect(screen.getByText('Standalone focus time stays in the day.')).toBeInTheDocument();

  const draft = screen.getByText('Draft').closest('article');
  expect(draft).not.toBeNull();
  if (!draft) return;

  await userEvent.click(within(draft).getByRole('button', { name: 'Keep for tomorrow' }));
  expect(onKeep).toHaveBeenCalledWith('t2');
  expect(await screen.findByText('2 done · 1 moved · 45 min focus')).toBeInTheDocument();
  expect(screen.getByText('Moved to tomorrow.')).toBeInTheDocument();
});

it('lets go only after the destructive confirmation', async () => {
  const onLetGo = vi.fn().mockResolvedValue(undefined);
  render(<CloseDay {...props({ onLetGo })} />);

  const review = screen.getByText('Review').closest('article');
  expect(review).not.toBeNull();
  if (!review) return;

  await userEvent.click(within(review).getByRole('button', { name: 'Let go' }));
  expect(screen.getByRole('dialog', { name: 'Let go?' })).toBeInTheDocument();
  expect(onLetGo).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onLetGo).not.toHaveBeenCalled();

  await userEvent.click(within(review).getByRole('button', { name: 'Let go' }));
  await userEvent.click(screen.getByRole('button', { name: 'Archive task' }));
  expect(onLetGo).toHaveBeenCalledWith('t3');
});

it('settles quietly when everything is done', () => {
  render(<CloseDay {...props({ blocks: [doneTask, doneFocus] })} />);
  expect(screen.getByText('Everything is settled. Close the day.')).toBeInTheDocument();
});
