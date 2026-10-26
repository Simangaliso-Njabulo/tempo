import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTask } from '../../domain/entities/task';
import { AddSheet } from './AddSheet';

function props(overrides: Partial<Parameters<typeof AddSheet>[0]> = {}) {
  return {
    open: true,
    date: '2026-10-26' as const,
    onClose: vi.fn(),
    onAddTask: vi.fn().mockResolvedValue(undefined),
    onAddFocus: vi.fn().mockResolvedValue(undefined),
    onAddBreak: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

it('keeps the sheet open and explains an empty title', async () => {
  const onAddTask = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<AddSheet {...props({ onAddTask, onClose })} />);

  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Give it a name.');
  expect(onAddTask).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

it('adds a focus block from the Focus tab', async () => {
  const onAddFocus = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<AddSheet {...props({ onAddFocus, onClose })} />);

  await userEvent.click(screen.getByRole('tab', { name: 'Focus' }));
  await userEvent.type(screen.getByLabelText('Title'), 'Deep work');
  fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '10:00' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-27' } });
  await userEvent.click(screen.getByRole('button', { name: '45 min' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAddFocus).toHaveBeenCalledWith({
    title: 'Deep work',
    date: '2026-10-27',
    startMin: 600,
    durationMin: 45,
  });
  expect(onClose).toHaveBeenCalled();
});

it('defaults the Break title and adds a break', async () => {
  const onAddBreak = vi.fn().mockResolvedValue(undefined);
  render(<AddSheet {...props({ onAddBreak })} />);

  await userEvent.click(screen.getByRole('tab', { name: 'Break' }));
  expect(screen.getByLabelText('Title')).toHaveValue('Break');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(onAddBreak).toHaveBeenCalledWith({
    title: 'Break',
    date: '2026-10-26',
    startMin: 540,
    durationMin: 30,
  });
});

it('places an existing task without creating a duplicate', async () => {
  const task = createTask({ id: 't1', title: 'Draft', now: 1 });
  const onAddTask = vi.fn().mockResolvedValue(undefined);
  render(<AddSheet {...props({ task, onAddTask })} />);

  expect(screen.getByRole('dialog', { name: 'Place task' })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Focus' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toHaveValue('Draft');
  expect(screen.getByLabelText('Title')).toHaveAttribute('readOnly');

  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAddTask).toHaveBeenCalledWith({
    title: 'Draft',
    date: '2026-10-26',
    startMin: 540,
    durationMin: 30,
    taskId: 't1',
  });
});

it('shows the use-case error and stays open when adding fails', async () => {
  const onAddTask = vi.fn().mockRejectedValue(new Error('That time is already taken.'));
  const onClose = vi.fn();
  render(<AddSheet {...props({ onAddTask, onClose })} />);

  await userEvent.type(screen.getByLabelText('Title'), 'Draft');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('That time is already taken.');
  expect(onClose).not.toHaveBeenCalled();
});
