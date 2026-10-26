import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExport } from './ImportExport';

function backupFile(name: string, text: string) {
  return new File([text], name, { type: 'application/json' });
}

function props(overrides: Partial<Parameters<typeof ImportExport>[0]> = {}) {
  return {
    open: true,
    storage: { persisted: true, usage: 1024 * 1024, quota: 10 * 1024 * 1024 },
    lastBackupAt: new Date(2026, 9, 25).getTime(),
    onClose: vi.fn(),
    onExportBackup: vi.fn().mockImplementation((options?: { passphrase?: string }) =>
      Promise.resolve({
        fileName: options?.passphrase ? 'tempo-backup.enc.json' : 'tempo-backup.json',
        method: 'downloaded' as const,
        encrypted: Boolean(options?.passphrase),
      }),
    ),
    onImportBackup: vi.fn().mockResolvedValue({ added: 2, updated: 1, skipped: 3 }),
    onExportIcs: vi.fn().mockResolvedValue(undefined),
    onReset: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

it('exports a plain backup and requires a long, confirmed passphrase for encryption', async () => {
  const onExportBackup = vi.fn(
    (
      options?: { passphrase?: string },
    ): Promise<{ fileName: string; method: 'shared' | 'downloaded'; encrypted: boolean }> =>
      Promise.resolve({
        fileName: options?.passphrase ? 'tempo-backup.enc.json' : 'tempo-backup.json',
        method: 'downloaded',
        encrypted: Boolean(options?.passphrase),
      }),
  );
  render(<ImportExport {...props({ onExportBackup })} />);

  await userEvent.click(screen.getByRole('button', { name: 'Plain JSON' }));
  expect(onExportBackup).toHaveBeenCalledWith(undefined);
  expect(await screen.findByText(/Backup ready/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Encrypted JSON' }));
  fireEvent.change(screen.getByLabelText('Passphrase'), { target: { value: 'short' } });
  fireEvent.change(screen.getByLabelText('Confirm passphrase'), { target: { value: 'short' } });
  await userEvent.click(screen.getByRole('button', { name: 'Make encrypted backup' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Use at least 12 characters.');
  expect(onExportBackup).toHaveBeenCalledTimes(1);

  fireEvent.change(screen.getByLabelText('Passphrase'), {
    target: { value: 'correct horse battery staple' },
  });
  fireEvent.change(screen.getByLabelText('Confirm passphrase'), {
    target: { value: 'correct horse battery staple' },
  });
  await userEvent.click(screen.getByRole('button', { name: 'Make encrypted backup' }));

  expect(onExportBackup).toHaveBeenLastCalledWith({ passphrase: 'correct horse battery staple' });
  expect(await screen.findByText(/Encrypted backup ready/)).toBeInTheDocument();
});

it('shows a plain error and no counts when a file cannot be imported', async () => {
  const onImportBackup = vi.fn().mockRejectedValue(new Error('That file is not valid JSON.'));
  render(<ImportExport {...props({ onImportBackup })} />);

  await userEvent.upload(screen.getByLabelText('Import backup'), backupFile('broken.json', 'not json'));
  await userEvent.click(screen.getByRole('button', { name: 'Import' }));

  expect(onImportBackup).toHaveBeenCalledWith({ text: 'not json', mode: 'merge' });
  expect(await screen.findByRole('alert')).toHaveTextContent('That file is not valid JSON.');
  expect(screen.queryByText(/Imported/)).not.toBeInTheDocument();
});

it('shows added, updated, and skipped counts after a merge', async () => {
  const onImportBackup = vi.fn().mockResolvedValue({ added: 2, updated: 1, skipped: 3 });
  render(<ImportExport {...props({ onImportBackup })} />);

  await userEvent.upload(screen.getByLabelText('Import backup'), backupFile('backup.json', '{"app":"tempo"}'));
  await userEvent.click(screen.getByRole('button', { name: 'Import' }));

  expect(await screen.findByText('Imported 2 new records, updated 1. 3 records skipped.')).toBeInTheDocument();
});

it('asks for a passphrase for an encrypted file and passes it to the use case', async () => {
  const onImportBackup = vi.fn().mockResolvedValue({ added: 1, updated: 0, skipped: 0 });
  render(<ImportExport {...props({ onImportBackup })} />);

  const text = '{"format":"tempo-encrypted-backup"}';
  await userEvent.upload(screen.getByLabelText('Import backup'), backupFile('backup.enc.json', text));
  await userEvent.click(screen.getByRole('button', { name: 'Import' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter the backup passphrase.');

  await userEvent.type(screen.getByLabelText('Passphrase'), 'correct horse battery staple');
  await userEvent.click(screen.getByRole('button', { name: 'Import' }));

  expect(onImportBackup).toHaveBeenCalledWith({
    text,
    mode: 'merge',
    passphrase: 'correct horse battery staple',
  });
});

it('confirms a replace and offers to export current data first', async () => {
  const onImportBackup = vi.fn().mockResolvedValue({ added: 1, updated: 0, skipped: 0 });
  const onExportBackup = vi.fn().mockResolvedValue({
    fileName: 'tempo-backup.json',
    method: 'downloaded',
    encrypted: false,
  });
  render(<ImportExport {...props({ onImportBackup, onExportBackup })} />);

  await userEvent.upload(screen.getByLabelText('Import backup'), backupFile('backup.json', '{"app":"tempo"}'));
  await userEvent.click(screen.getByRole('button', { name: 'Replace' }));
  await userEvent.click(screen.getByRole('button', { name: 'Import' }));

  expect(screen.getByRole('dialog', { name: 'Replace all data?' })).toBeInTheDocument();
  expect(onImportBackup).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Export current data first' }));
  expect(onExportBackup).toHaveBeenCalledWith(undefined);

  await userEvent.click(screen.getByRole('button', { name: 'Replace data' }));
  expect(onImportBackup).toHaveBeenCalledWith({ text: '{"app":"tempo"}', mode: 'replace' });
});

it('confirms a full reset and calls the reset gateway', async () => {
  const onReset = vi.fn().mockResolvedValue(undefined);
  render(<ImportExport {...props({ onReset })} />);

  await userEvent.click(screen.getByRole('button', { name: 'Reset all data' }));
  expect(screen.getByRole('dialog', { name: 'Reset all data?' })).toBeInTheDocument();
  expect(onReset).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
  expect(onReset).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Everything on this device was cleared.')).toBeInTheDocument();
});

it('shows storage status and exports the calendar file', async () => {
  const onExportIcs = vi.fn().mockResolvedValue(undefined);
  render(<ImportExport {...props({ onExportIcs })} />);

  expect(screen.getByText('1.0 MB of 10.0 MB used')).toBeInTheDocument();
  expect(screen.getByText('Persistent storage is on.')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Export .ics' }));
  expect(onExportIcs).toHaveBeenCalled();
  expect(await screen.findByText('Calendar file ready.')).toBeInTheDocument();
});

it('renders nothing while closed', () => {
  render(<ImportExport {...props({ open: false })} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
