import type { BackupCodec, BackupGateway } from '../ports/backup-gateway';
import type { Clock } from '../ports/clock';
import type { MetaRepository } from '../ports/meta-repository';
import type { ShareGateway } from '../ports/share-gateway';

export function makeExportBackup(deps: {
  backup: BackupGateway;
  codec: BackupCodec;
  share: ShareGateway;
  meta: MetaRepository;
  clock: Clock;
}) {
  return async (options?: { passphrase?: string }) => {
    const backup = await deps.backup.exportAll();
    const passphrase = options?.passphrase;
    // An empty passphrase means a plain backup, never an encrypted file with
    // no key.
    const payload = passphrase ? await deps.codec.encrypt(backup, passphrase) : backup;
    const encrypted = Boolean(passphrase);
    const date = backup.exportedAt.slice(0, 10);
    const fileName = encrypted ? `tempo-backup-${date}.enc.json` : `tempo-backup-${date}.json`;
    const file = new File([JSON.stringify(payload, null, 2)], fileName, { type: 'application/json' });
    const method = await deps.share.shareFile(file, encrypted ? 'TEMPO encrypted backup' : 'TEMPO backup');
    await deps.meta.put({ key: 'lastBackupAt', value: deps.clock.now().getTime() });
    return { fileName, method, encrypted };
  };
}
