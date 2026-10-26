import { defaultSettings } from '../../domain/entities/settings';
import { BackupValidationError, validateBackupFile } from './backup-file';

const valid = {
  app: 'tempo',
  schemaVersion: 1,
  exportedAt: '2026-10-25T12:00:00.000Z',
  data: {
    tasks: [{ id: 't1', title: 'Draft', status: 'inbox', sortOrder: 0, createdAt: 1, updatedAt: 1 }],
    blocks: [{ id: 'b1', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'task', status: 'planned', title: 'Draft', taskId: 't1', anchor: false, createdAt: 1, updatedAt: 1 }],
    routines: [],
    routineExceptions: [],
    settings: defaultSettings(1),
    meta: [{ key: 'lastActiveDate', value: '2026-10-25' }, { key: 'unknown', value: { nested: true } }],
  },
};

it('accepts a valid backup and ignores unknown meta', () => {
  const file = validateBackupFile(valid);
  expect(file.data.meta).toEqual([{ key: 'lastActiveDate', value: '2026-10-25' }]);
});

it('rejects a newer schema with a plain message', () => {
  expect(() => validateBackupFile({ ...valid, schemaVersion: 2 })).toThrow('newer version of TEMPO');
});

it('rejects overlapping blocks', () => {
  const overlap = {
    ...valid,
    data: {
      ...valid.data,
      blocks: [
        valid.data.blocks[0],
        { ...valid.data.blocks[0], id: 'b2', startMin: 555 },
      ],
    },
  };
  expect(() => validateBackupFile(overlap)).toThrow(BackupValidationError);
});

it('rejects a broken reference and a midnight crossing', () => {
  expect(() => validateBackupFile({ ...valid, data: { ...valid.data, tasks: [] } })).toThrow('references a missing task');
  expect(() => validateBackupFile({ ...valid, data: { ...valid.data, blocks: [{ ...valid.data.blocks[0], startMin: 1430, durationMin: 30 }] } })).toThrow('crosses midnight');
});
