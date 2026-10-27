import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTask } from '../../domain/entities/task';
import { TaskSheet } from './TaskSheet';

it('shows a carried inbox task, places it, and archives it', async () => {
  const task = createTask({ id: 't1', title: 'Draft', now: 1, carriedFrom: '2026-10-25' });
  const onPlace = vi.fn();
  const onArchive = vi.fn();
  render(<TaskSheet open task={task} onClose={vi.fn()} onPlace={onPlace} onArchive={onArchive} />);

  expect(screen.getByRole('heading', { name: 'Draft' })).toBeInTheDocument();
  expect(screen.getByText('Carried over')).toBeInTheDocument();
  expect(screen.getByText(/not on the timeline yet/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  expect(onPlace).toHaveBeenCalledWith(task);
  await userEvent.click(screen.getByRole('button', { name: 'Archive task' }));
  expect(onArchive).toHaveBeenCalledWith(task);
});
