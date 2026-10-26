import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createTask } from '../../domain/entities/task';
import type { Routine } from '../../domain/entities/routine';
import { useTrayDrag } from '../hooks/use-tray-drag';
import { Tray } from './Tray';

const carried = createTask({ id: 't1', title: 'Carried', now: 1, carriedFrom: '2026-10-24' });

const routine: Routine = {
  id: 'r1',
  title: 'Morning walk',
  kind: 'routine',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  preferredStartMin: 420,
  durationMin: 30,
  anchor: false,
  active: true,
  createdAt: 1,
  updatedAt: 1,
};

function props(overrides: Partial<Parameters<typeof Tray>[0]> = {}) {
  return {
    date: '2026-10-25',
    tasks: [carried],
    blocks: [],
    routines: [],
    exceptions: [],
    timeFormat: '24h' as const,
    onAddTask: () => Promise.resolve(),
    onOpenTask: vi.fn(),
    onPlaceTask: vi.fn(),
    onPlaceRoutine: vi.fn(),
    onSkipRoutine: vi.fn(),
    onOpenRoutine: vi.fn(),
    onStartDrag: vi.fn(),
    onOpenPlan: vi.fn(),
    ...overrides,
  };
}

it('adds a brain-dump task and shows carried-over work', async () => {
  const onAddTask = vi.fn().mockResolvedValue(undefined);
  render(<Tray {...props({ onAddTask })} />);

  expect(screen.getByRole('list', { name: 'Tasks to place' })).toBeInTheDocument();
  expect(screen.getByText('Carried over')).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Brain dump'), 'New task');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(onAddTask).toHaveBeenCalledWith('New task');
  expect(screen.getByLabelText('Brain dump')).toHaveValue('');
});

it('keeps the empty message out of the list role', () => {
  render(<Tray {...props({ tasks: [] })} />);

  expect(screen.getByText('Nothing waiting. Add a thought above.')).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Tasks to place' })).not.toBeInTheDocument();
});

it('shows a plain error and keeps the title when adding fails', async () => {
  const onAddTask = vi.fn().mockRejectedValue(new Error('Could not save.'));
  render(<Tray {...props({ onAddTask })} />);

  await userEvent.type(screen.getByLabelText('Brain dump'), 'New task');
  await userEvent.click(screen.getByRole('button', { name: 'Add' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save.');
  expect(screen.getByLabelText('Brain dump')).toHaveValue('New task');
});

it('places a task and expands routines with place and skip actions', async () => {
  const onPlaceTask = vi.fn();
  const onPlaceRoutine = vi.fn();
  const onSkipRoutine = vi.fn();
  render(
    <Tray
      {...props({
        routines: [routine],
        onPlaceTask,
        onPlaceRoutine,
        onSkipRoutine,
      })}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: 'Place Carried' }));
  expect(onPlaceTask).toHaveBeenCalledWith(carried);

  await userEvent.click(screen.getByRole('button', { name: 'Plan' }));
  expect(screen.getByText('Morning walk')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Place' }));
  await userEvent.click(screen.getByRole('button', { name: 'Skip Morning walk' }));
  expect(onPlaceRoutine).toHaveBeenCalledWith(routine);
  expect(onSkipRoutine).toHaveBeenCalledWith(routine);
});

it('opens the task editor on a tap but not after a drag', () => {
  const onOpenTask = vi.fn();
  render(<Tray {...props({ onOpenTask })} />);
  const chip = screen.getByRole('button', { name: /^Carried/ });

  fireEvent.pointerDown(chip, { clientX: 10, clientY: 100 });
  fireEvent.pointerMove(window, { clientX: 10, clientY: 120 });
  fireEvent.pointerUp(window, { clientX: 10, clientY: 120 });
  fireEvent.click(chip);
  expect(onOpenTask).not.toHaveBeenCalled();
});

it('opens the task editor on a tap that does not move', () => {
  const onOpenTask = vi.fn();
  render(<Tray {...props({ onOpenTask })} />);
  const chip = screen.getByRole('button', { name: /^Carried/ });

  fireEvent.pointerDown(chip, { clientX: 10, clientY: 100 });
  fireEvent.pointerUp(window, { clientX: 10, clientY: 100 });
  fireEvent.click(chip);
  expect(onOpenTask).toHaveBeenCalledWith(carried);
});

it('commits a tray drag only after the pointer moves past the threshold', () => {
  const onCommit = vi.fn();
  const { result } = renderHook(() => useTrayDrag({ yToMinute: (y) => y, onCommit }));

  act(() => {
    result.current.start({ clientY: 100 } as ReactPointerEvent, 't1');
  });
  expect(result.current.drag).toBeNull();

  act(() => {
    fireEvent.pointerMove(window, { clientY: 130 });
  });
  expect(result.current.drag).toEqual({ taskId: 't1', startMin: 130 });

  act(() => {
    fireEvent.pointerMove(window, { clientY: 145 });
    fireEvent.pointerUp(window, { clientY: 145 });
  });
  expect(onCommit).toHaveBeenCalledWith('t1', 145);
  expect(result.current.drag).toBeNull();
});

it('does not commit a tray drag that stays inside the threshold', () => {
  const onCommit = vi.fn();
  const { result } = renderHook(() => useTrayDrag({ yToMinute: (y) => y, onCommit }));

  act(() => {
    result.current.start({ clientY: 100 } as ReactPointerEvent, 't1');
    fireEvent.pointerMove(window, { clientY: 105 });
    fireEvent.pointerUp(window, { clientY: 105 });
  });
  expect(onCommit).not.toHaveBeenCalled();
  expect(result.current.drag).toBeNull();
});
