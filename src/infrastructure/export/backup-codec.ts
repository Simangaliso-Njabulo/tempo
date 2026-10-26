import type { BackupCodec, BackupFile } from '../../application/ports/backup-gateway';
import { parseBackupText, validateBackupFile } from './backup-file';
import { decryptBackup, encryptBackup, isEncryptedBackup } from './encrypted-backup';

export const backupCodec: BackupCodec = {
  async parseText(text: string, passphrase?: string): Promise<BackupFile> {
    const raw = parseBackupText(text);
    return isEncryptedBackup(raw) ? decryptBackup(raw, passphrase ?? '') : validateBackupFile(raw);
  },
  encrypt(file: BackupFile, passphrase: string): Promise<unknown> {
    return encryptBackup(file, passphrase);
  },
};
