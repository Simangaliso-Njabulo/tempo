import { createBlock } from '../../domain/entities/block';
import type { ThemeSetting, TimeFormatSetting } from '../../domain/entities/settings';
import { createTempoDb } from '../../infrastructure/db/tempo-db';
import { DexieUnitOfWork } from '../../infrastructure/db/unit-of-work';
import { backupCodec } from '../../infrastructure/export/backup-codec';
import { BrowserCalendarExportGateway } from '../../infrastructure/export/browser-calendar-export-gateway';
import { DexieBackupGateway } from '../../infrastructure/export/dexie-backup-gateway';
import { DexieBlockRepository } from '../../infrastructure/repositories/dexie-block-repository';
import { DexieMetaRepository } from '../../infrastructure/repositories/dexie-meta-repository';
import { DexieSettingsRepository } from '../../infrastructure/repositories/dexie-settings-repository';
import type { ShareGateway } from '../ports/share-gateway';
import { makeExportBackup } from './export-backup';
import { makeExportIcs } from './export-ics';
import { makeImportBackup } from './import-backup';
import { makeUpdateSettings } from './update-settings';

function harness(now = new Date('2026-10-25T12:00:00Z')) {
  const db = createTempoDb(`tempo-settings-${crypto.randomUUID()}`);
  const uow = new DexieUnitOfWork(db);
  const settings = new DexieSettingsRepository(db);
  const meta = new DexieMetaRepository(db);
  const blocks = new DexieBlockRepository(db);
  const clock = { now: () => now };
  const shared: File[] = [];
  const share: ShareGateway = {
    canShareFile: () => false,
    shareFile: (file) => {
      shared.push(file);
      return Promise.resolve('downloaded' as const);
    },
  };
  return {
    db,
    blocks,
    meta,
    clock,
    shared,
    updateSettings: makeUpdateSettings({ settings, clock }),
    exportBackup: makeExportBackup({ backup: new DexieBackupGateway(db, uow), codec: backupCodec, meta, clock, share }),
    importBackup: makeImportBackup({ backup: new DexieBackupGateway(db, uow), codec: backupCodec }),
    exportIcs: makeExportIcs({ blocks, settings, calendar: new BrowserCalendarExportGateway(), share, clock }),
  };
}

async function close(db: ReturnType<typeof createTempoDb>) {
  db.close();
  await db.delete();
}

const sampleBlock = () =>
  createBlock({ id: 'b1', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'task', title: 'Draft', now: 1 });

it('defaults settings, validates them, and saves the change', async () => {
  const h = harness();
  try {
    const saved = await h.updateSettings({ theme: 'dark', icsAlarmMinutes: 15 });
    expect(saved).toMatchObject({
      id: 'app',
      theme: 'dark',
      icsAlarmMinutes: 15,
      timeFormat: 'system',
      reflowAutoApply: false,
      inAppReminders: true,
      updatedAt: h.clock.now().getTime(),
    });

    await expect(h.updateSettings({ theme: 'neon' as unknown as ThemeSetting })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.updateSettings({ timeFormat: 'military' as unknown as TimeFormatSetting })).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(h.updateSettings({ icsAlarmMinutes: 7 })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      h.updateSettings({ inAppReminders: 'yes' as unknown as boolean }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  } finally {
    await close(h.db);
  }
});

it('exports a plain backup, records the date, and imports it back', async () => {
  const h = harness();
  try {
    await h.blocks.put(sampleBlock());
    const result = await h.exportBackup();
    expect(result.fileName).toMatch(/^tempo-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(result).toMatchObject({ method: 'downloaded', encrypted: false });
    expect(await h.meta.get('lastBackupAt')).toMatchObject({
      key: 'lastBackupAt',
      value: h.clock.now().getTime(),
    });

    const file = h.shared[0];
    expect(file).toBeDefined();
    if (!file) return;
    const text = await file.text();
    expect(JSON.parse(text)).toMatchObject({ app: 'tempo', data: { blocks: [{ id: 'b1' }] } });

    await h.blocks.delete('b1');
    const summary = await h.importBackup({ text, mode: 'replace' });
    expect(summary.added).toBeGreaterThan(0);
    expect(await h.blocks.get('b1')).toMatchObject({ title: 'Draft' });
  } finally {
    await close(h.db);
  }
});

it('round-trips an encrypted backup and refuses a wrong passphrase', async () => {
  const h = harness();
  try {
    await h.blocks.put(sampleBlock());
    const result = await h.exportBackup({ passphrase: 'correct horse battery staple' });
    expect(result.encrypted).toBe(true);
    expect(result.fileName).toMatch(/\.enc\.json$/);

    const file = h.shared[0];
    expect(file).toBeDefined();
    if (!file) return;
    const text = await file.text();
    expect(JSON.parse(text)).toMatchObject({ format: 'tempo-encrypted-backup', cipher: 'AES-256-GCM' });

    await h.blocks.delete('b1');
    await expect(h.importBackup({ text, mode: 'merge' })).rejects.toThrow('could not be opened');
    await h.importBackup({ text, mode: 'merge', passphrase: 'correct horse battery staple' });
    expect(await h.blocks.get('b1')).toMatchObject({ title: 'Draft' });
  } finally {
    await close(h.db);
  }
});

it('exports the requested day to an .ics file with the saved alarm', async () => {
  const h = harness();
  try {
    await h.updateSettings({ icsAlarmMinutes: 15 });
    await h.blocks.put(sampleBlock());

    const result = await h.exportIcs();
    expect(result).toEqual({ fileName: 'tempo-2026-10-25.ics', method: 'downloaded' });

    const file = h.shared[0];
    expect(file).toBeDefined();
    if (!file) return;
    const text = await file.text();
    expect(text).toContain('SUMMARY:Draft');
    expect(text).toContain('TRIGGER:-PT15M');

    const other = await h.exportIcs('2026-10-26');
    expect(other.fileName).toBe('tempo-2026-10-26.ics');
  } finally {
    await close(h.db);
  }
});
