import type { BackupCodec, BackupGateway } from '../ports/backup-gateway';

export function makeImportBackup(deps: { backup: BackupGateway; codec: BackupCodec }) {
  return async (input: { text: string; mode: 'replace' | 'merge'; passphrase?: string }) => {
    // Parsing and validation happen before the gateway sees the file, so an
    // invalid import can never clear or write data.
    const file = await deps.codec.parseText(input.text, input.passphrase);
    return deps.backup.importAll(file, input.mode);
  };
}
