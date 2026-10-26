import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Routine } from '../../domain/entities/routine';
import { RoutineEditor } from './RoutineEditor';

const routine: Routine = {
  id: 'r1',
  title: 'Morning walk',
  kind: 'routine',
  daysOfWeek: [1],
  preferredStartMin: 480,
  durationMin: 30,
  anchor: true,
  active: true,
  createdAt: 1,
  updatedAt: 1,
};

function props(overrides: Partial<Parameters<typeof RoutineEditor>[0]> = {}) {
  return {
    open: true,
    routine: null,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

it('edits a routine without touching existing blocks', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<RoutineEditor {...props({ routine, onSave, onClose })} />);

  expect(screen.getByLabelText('Title')).toHaveValue('Morning walk');
  expect(screen.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Tuesday' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByLabelText('Preferred start')).toHaveValue('08:00');

  await userEvent.click(screen.getByRole('button', { name: 'Tuesday' }));
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(onSave).toHaveBeenCalledWith({
    title: 'Morning walk',
    kind: 'routine',
    daysOfWeek: [1, 2],
    preferredStartMin: 480,
    durationMin: 30,
    anchor: true,
    active: true,
  });
  expect(onClose).toHaveBeenCalled();
});

it('creates a routine with all days selected by default', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<RoutineEditor {...props({ onSave })} />);

  await userEvent.type(screen.getByLabelText('Title'), 'Evening review');
  fireEvent.change(screen.getByLabelText('Preferred start'), { target: { value: '20:30' } });
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(onSave).toHaveBeenCalledWith({
    title: 'Evening review',
    kind: 'routine',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    preferredStartMin: 1230,
    durationMin: 30,
    anchor: true,
    active: true,
  });
});

it('requires a title and at least one day', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const empty = { ...routine, title: '', daysOfWeek: [] };
  render(<RoutineEditor {...props({ routine: empty, onSave })} />);

  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Give it a name.');

  await userEvent.type(screen.getByLabelText('Title'), 'Walk');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one day.');
  expect(onSave).not.toHaveBeenCalled();
});

it('deletes only after the destructive confirmation', async () => {
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<RoutineEditor {...props({ routine, onDelete, onClose })} />);

  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(screen.getByRole('dialog', { name: 'Delete routine?' })).toBeInTheDocument();
  expect(onDelete).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Delete routine' }));
  expect(onDelete).toHaveBeenCalledWith('r1');
  expect(onClose).toHaveBeenCalled();
});
