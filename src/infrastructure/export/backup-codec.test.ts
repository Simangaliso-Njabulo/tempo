import { defaultSettings } from '../../domain/entities/settings';
import { MAX_IMPORT_BYTES } from './backup-file';
import { backupCodec } from './backup-codec';
import { EncryptedBackupError } from './encrypted-backup';

const file = {
  app: 'tempo' as const,
  schemaVersion: 1 as const,
  exportedAt: '2026-10-25T12:00:00.000Z',
  data: { tasks: [], blocks: [], routines: [], routineExceptions: [], settings: defaultSettings(1), meta: [] },
};

it('parses a plain backup without a passphrase', async () => {
  await expect(backupCodec.parseText(JSON.stringify(file))).resolves.toEqual(file);
});

it('parses an encrypted backup with the passphrase', async () => {
  const envelope = await backupCodec.encrypt(file, 'correct horse battery staple');
  await expect(backupCodec.parseText(JSON.stringify(envelope), 'correct horse battery staple')).resolves.toEqual(file);
  await expect(backupCodec.parseText(JSON.stringify(envelope), 'wrong passphrase')).rejects.toThrow(EncryptedBackupError);
  await expect(backupCodec.parseText(JSON.stringify(envelope))).rejects.toThrow(EncryptedBackupError);
});

it('rejects oversized input before parsing', async () => {
  await expect(backupCodec.parseText('x'.repeat(MAX_IMPORT_BYTES + 1))).rejects.toThrow('too large');
});

it('rejects malformed JSON and an invalid plain backup', async () => {
  await expect(backupCodec.parseText('{')).rejects.toThrow('not valid JSON');
  await expect(backupCodec.parseText('{"app":"other"}')).rejects.toThrow('not a TEMPO backup');
});
