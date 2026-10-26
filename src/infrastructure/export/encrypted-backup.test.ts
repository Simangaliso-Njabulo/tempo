import { decryptBackup, encryptBackup, EncryptedBackupError } from './encrypted-backup';
import { defaultSettings } from '../../domain/entities/settings';
import { createTask } from '../../domain/entities/task';

const file = {
  app: 'tempo' as const,
  schemaVersion: 1 as const,
  exportedAt: '2026-10-25T12:00:00.000Z',
  data: { tasks: [], blocks: [], routines: [], routineExceptions: [], settings: defaultSettings(1), meta: [] },
};

it('round-trips a backup', async () => {
  const envelope = await encryptBackup(file, 'correct horse battery staple');
  await expect(decryptBackup(envelope, 'correct horse battery staple')).resolves.toEqual(file);
});

it('fails a wrong passphrase and a tampered file with the same message', async () => {
  const envelope = await encryptBackup(file, 'correct horse battery staple');
  await expect(decryptBackup(envelope, 'wrong passphrase')).rejects.toThrow(EncryptedBackupError);
  const tampered = { ...envelope, ciphertext: `${envelope.ciphertext.slice(0, -1)}A` };
  await expect(decryptBackup(tampered, 'correct horse battery staple')).rejects.toThrow(EncryptedBackupError);
  const reheadered = { ...envelope, iterations: 1 as never };
  await expect(decryptBackup(reheadered, 'correct horse battery staple')).rejects.toThrow(EncryptedBackupError);
  const resalted = { ...envelope, salt: `${envelope.salt.slice(0, -4)}AAAA` };
  await expect(decryptBackup(resalted, 'correct horse battery staple')).rejects.toThrow(EncryptedBackupError);
});

it('rejects a short passphrase', async () => {
  await expect(encryptBackup(file, 'short')).rejects.toThrow('at least 12');
});

it('never stores the passphrase or plaintext in the envelope', async () => {
  const titled = {
    ...file,
    data: { ...file.data, tasks: [createTask({ id: 't1', title: 'Private plan detail', now: 1 })] },
  };
  const envelope = await encryptBackup(titled, 'correct horse battery staple');
  const serialised = JSON.stringify(envelope);
  expect(serialised).not.toContain('Private plan detail');
  expect(serialised).not.toContain('correct horse battery staple');
});

it('rejects a plain file and a malformed envelope', async () => {
  await expect(decryptBackup(file, 'correct horse battery staple')).rejects.toThrow(EncryptedBackupError);
  await expect(decryptBackup({ format: 'tempo-encrypted-backup' }, 'correct horse battery staple')).rejects.toThrow(
    EncryptedBackupError,
  );
  await expect(decryptBackup([], 'correct horse battery staple')).rejects.toThrow(EncryptedBackupError);
});
