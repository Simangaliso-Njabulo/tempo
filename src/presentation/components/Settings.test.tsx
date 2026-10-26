import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Routine } from '../../domain/entities/routine';
import { defaultSettings } from '../../domain/entities/settings';
import { Settings } from './Settings';

const routine: Routine = {
  id: 'r1',
  title: 'Morning walk',
  kind: 'routine',
  daysOfWeek: [1, 3],
  preferredStartMin: 480,
  durationMin: 30,
  anchor: true,
  active: true,
  createdAt: 1,
  updatedAt: 1,
};

function props(overrides: Partial<Parameters<typeof Settings>[0]> = {}) {
  return {
    open: true,
    settings: defaultSettings(1),
    routines: [routine],
    storage: { persisted: true, usage: 1024 * 1024, quota: 10 * 1024 * 1024 },
    lastBackupAt: new Date(2026, 9, 25).getTime(),
    standalone: false,
    version: '0.1.0',
    onClose: vi.fn(),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onOpenData: vi.fn(),
    onAddRoutine: vi.fn(),
    onEditRoutine: vi.fn(),
    onToggleRoutine: vi.fn().mockResolvedValue(undefined),
    onExportIcs: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

it('previews and saves the theme immediately', async () => {
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  render(<Settings {...props({ onUpdate })} />);

  await userEvent.click(screen.getByRole('button', { name: 'Dark' }));
  expect(onUpdate).toHaveBeenCalledWith({ theme: 'dark' });
  expect(document.documentElement.dataset.theme).toBe('dark');

  await userEvent.click(screen.getByRole('button', { name: 'Light' }));
  expect(onUpdate).toHaveBeenCalledWith({ theme: 'light' });
  expect(document.documentElement.dataset.theme).toBe('light');
});

it('saves the time format, alarm, and planning toggles', async () => {
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  render(<Settings {...props({ onUpdate })} />);

  await userEvent.click(screen.getByRole('button', { name: '24h' }));
  expect(onUpdate).toHaveBeenCalledWith({ timeFormat: '24h' });

  await userEvent.selectOptions(screen.getByLabelText('Calendar reminder'), '15');
  expect(onUpdate).toHaveBeenCalledWith({ icsAlarmMinutes: 15 });

  await userEvent.click(screen.getByRole('checkbox', { name: 'Auto-apply reflow' }));
  expect(onUpdate).toHaveBeenCalledWith({ reflowAutoApply: true });

  await userEvent.click(screen.getByRole('checkbox', { name: 'In-app reminders' }));
  expect(onUpdate).toHaveBeenCalledWith({ inAppReminders: false });
});

it('opens the data sheet, edits routines, and exports the calendar', async () => {
  const onOpenData = vi.fn();
  const onAddRoutine = vi.fn();
  const onEditRoutine = vi.fn();
  const onToggleRoutine = vi.fn().mockResolvedValue(undefined);
  const onExportIcs = vi.fn().mockResolvedValue(undefined);
  render(
    <Settings
      {...props({ onOpenData, onAddRoutine, onEditRoutine, onToggleRoutine, onExportIcs })}
    />,
  );

  expect(screen.getByText('Mon Wed')).toBeInTheDocument();
  expect(screen.getByText('1.0 MB of 10.0 MB used')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Add routine' }));
  expect(onAddRoutine).toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Edit Morning walk' }));
  expect(onEditRoutine).toHaveBeenCalledWith(routine);

  await userEvent.click(screen.getByRole('checkbox', { name: 'Active Morning walk' }));
  expect(onToggleRoutine).toHaveBeenCalledWith(routine);

  await userEvent.click(screen.getByRole('button', { name: 'Data and backup' }));
  expect(onOpenData).toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Export .ics' }));
  expect(onExportIcs).toHaveBeenCalled();
  expect(await screen.findByText('Calendar file ready.')).toBeInTheDocument();
});

it('shows install instructions until the app is on the Home Screen', () => {
  const { rerender } = render(<Settings {...props()} />);
  expect(screen.getByText('Open TEMPO in Safari.')).toBeInTheDocument();
  expect(screen.getByText('Tap Add to Home Screen.')).toBeInTheDocument();

  rerender(<Settings {...props({ standalone: true })} />);
  expect(screen.getByText('TEMPO is installed on your Home Screen.')).toBeInTheDocument();
  expect(screen.queryByText('Open TEMPO in Safari.')).not.toBeInTheDocument();
});

it('shows a plain error when a setting cannot be saved', async () => {
  const onUpdate = vi.fn().mockRejectedValue(new Error('That setting could not be saved.'));
  render(<Settings {...props({ onUpdate })} />);

  await userEvent.click(screen.getByRole('button', { name: 'Dark' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('That setting could not be saved.');
});
