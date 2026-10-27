import { configure } from '@testing-library/dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Clock } from '../../application/ports/clock';
import type { ShareGateway } from '../../application/ports/share-gateway';
import { makeExportBackup } from '../../application/use-cases/export-backup';
import { makeImportBackup } from '../../application/use-cases/import-backup';
import { createBlock } from '../../domain/entities/block';
import { createTask } from '../../domain/entities/task';
import { DexieResetGateway } from '../../infrastructure/db/dexie-reset-gateway';
import { createTempoDb } from '../../infrastructure/db/tempo-db';
import { DexieUnitOfWork } from '../../infrastructure/db/unit-of-work';
import { backupCodec } from '../../infrastructure/export/backup-codec';
import { DexieBackupGateway } from '../../infrastructure/export/dexie-backup-gateway';
import { DexieMetaRepository } from '../../infrastructure/repositories/dexie-meta-repository';
import { ImportExport } from './ImportExport';

// PBKDF2 derivation for the encrypted round-trip is deliberately slow. Under a
// parallel run it can outlast the one-second default, so give the crypto path a
// real budget instead of asserting less.
configure({ asyncUtilTimeout: 10_000 });

it(
  'round-trips an encrypted backup through the sheet and fails closed on a wrong passphrase',
  async () => {
    const db = createTempoDb(`tempo-import-export-${crypto.randomUUID()}`);
    const uow = new DexieUnitOfWork(db);
    const backup = new DexieBackupGateway(db, uow);
    const reset = new DexieResetGateway(db, uow);
    const shared: File[] = [];
    const share: ShareGateway = {
      canShareFile: () => false,
      shareFile: (file) => {
        shared.push(file);
        return Promise.resolve('downloaded');
      },
    };
    const clock: Clock = { now: () => new Date('2026-10-26T12:00:00') };
    const exportBackup = makeExportBackup({
      backup,
      codec: backupCodec,
      share,
      meta: new DexieMetaRepository(db),
      clock,
    });
    const importBackup = makeImportBackup({ backup, codec: backupCodec });

    try {
      await db.tasks.put(createTask({ id: 't1', title: 'Draft', now: 1 }));
      await db.blocks.put(
        createBlock({
          id: 'b1',
          date: '2026-10-26',
          startMin: 540,
          durationMin: 30,
          kind: 'task',
          title: 'Draft',
          taskId: 't1',
          now: 1,
        }),
      );

      render(
        <ImportExport
          open
          onClose={() => undefined}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
          onExportIcs={() => Promise.resolve()}
          onReset={() => reset.resetAll()}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: 'Encrypted JSON' }));
      await userEvent.type(screen.getByLabelText('Passphrase'), 'correct horse battery staple');
      await userEvent.type(screen.getByLabelText('Confirm passphrase'), 'correct horse battery staple');
      await userEvent.click(screen.getByRole('button', { name: 'Make encrypted backup' }));
      expect(await screen.findByText(/Encrypted backup ready/)).toBeInTheDocument();

      const exported = shared[0];
      expect(exported).toBeDefined();
      if (!exported) return;
      const text = await exported.text();
      expect(text).toContain('tempo-encrypted-backup');

      await reset.resetAll();
      await db.tasks.put(createTask({ id: 'keep', title: 'Keep me', now: 5 }));

      const upload = screen.getByLabelText('Import backup');
      await userEvent.upload(upload, new File([text], 'backup.enc.json', { type: 'application/json' }));
      await userEvent.type(screen.getByLabelText('Passphrase'), 'wrong passphrase');
      await userEvent.click(screen.getByRole('button', { name: 'Import' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('That file could not be opened.');
      expect(await db.tasks.get('keep')).toMatchObject({ title: 'Keep me' });
      expect(await db.tasks.get('t1')).toBeUndefined();
      expect(await db.blocks.get('b1')).toBeUndefined();

      await userEvent.clear(screen.getByLabelText('Passphrase'));
      await userEvent.type(screen.getByLabelText('Passphrase'), 'correct horse battery staple');
      await userEvent.click(screen.getByRole('button', { name: 'Import' }));

      expect(await screen.findByText(/Imported/)).toBeInTheDocument();
      expect(await db.tasks.get('t1')).toMatchObject({ title: 'Draft' });
      expect(await db.blocks.get('b1')).toMatchObject({ title: 'Draft' });
      expect(await db.tasks.get('keep')).toMatchObject({ title: 'Keep me' });
    } finally {
      db.close();
      await db.delete();
    }
  },
  20_000,
);
