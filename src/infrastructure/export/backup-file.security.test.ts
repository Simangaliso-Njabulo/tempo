import { defaultSettings } from '../../domain/entities/settings';
import { BackupValidationError, MAX_IMPORT_BYTES, parseBackupText, validateBackupFile } from './backup-file';

function validBackup() {
  return {
    app: 'tempo',
    schemaVersion: 1,
    exportedAt: '2026-10-25T12:00:00.000Z',
    data: {
      tasks: [], blocks: [], routines: [], routineExceptions: [], settings: defaultSettings(1), meta: [],
    },
  };
}

it('rejects a huge file before parsing', () => {
  expect(() => parseBackupText('x'.repeat(MAX_IMPORT_BYTES + 1))).toThrow('too large');
});

it('rejects prototype-pollution keys at any depth', () => {
  const file = validBackup();
  (file.data.tasks as unknown[]).push({ id: 't1', __proto__: { polluted: true } });
  expect(() => validateBackupFile(file)).toThrow(BackupValidationError);
});

it('rejects unknown top-level and collection fields', () => {
  expect(() => validateBackupFile({ ...validBackup(), extra: true })).toThrow('unknown field');
  const file = validBackup();
  (file.data.tasks as unknown[]).push({ id: 't1', title: 'x', status: 'inbox', sortOrder: 0, createdAt: 1, updatedAt: 1, evil: true });
  expect(() => validateBackupFile(file)).toThrow('unknown field');
});

it('rejects oversized arrays and titles before a write', () => {
  const huge = validBackup();
  huge.data.tasks = Array.from({ length: 10_001 }, (_, index) => ({
    id: `t${index}`, title: 'x', status: 'inbox', sortOrder: 0, createdAt: 1, updatedAt: 1,
  })) as typeof huge.data.tasks;
  expect(() => validateBackupFile(huge)).toThrow('import limit');

  const longTitle = validBackup();
  longTitle.data.tasks.push({
    id: 't1', title: 'x'.repeat(201), status: 'inbox', sortOrder: 0, createdAt: 1, updatedAt: 1,
  } as never);
  expect(() => validateBackupFile(longTitle)).toThrow(BackupValidationError);
});
