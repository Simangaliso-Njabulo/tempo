import type { BackupFile, BackupGateway, ImportSummary } from '../../application/ports/backup-gateway';
import type { UnitOfWork } from '../../application/ports/unit-of-work';
import type { MetaRecord } from '../../domain/entities';
import { defaultSettings } from '../../domain/entities/settings';
import { blocksOverlap } from '../../domain/services/overlap';
import type { TempoDb } from '../db/tempo-db';
import { validateBackupFile } from './backup-file';

const SAFE_META_KEYS = new Set(['lastActiveDate', 'realPlanDates', 'lastBackupAt', 'backupReminderSnoozedUntil']);

function safeMeta(meta: MetaRecord[]): MetaRecord[] {
  return meta.filter((record) => SAFE_META_KEYS.has(record.key));
}

async function putNewer<T extends { id: string; updatedAt: number }>(
  table: { get: (id: string) => Promise<T | undefined>; put: (value: T) => Promise<unknown> },
  incoming: T,
  summary: ImportSummary,
): Promise<void> {
  const local = await table.get(incoming.id);
  if (local && local.updatedAt >= incoming.updatedAt) {
    summary.skipped += 1;
    return;
  }
  await table.put(incoming);
  if (local) summary.updated += 1;
  else summary.added += 1;
}

export class DexieBackupGateway implements BackupGateway {
  constructor(private readonly db: TempoDb, private readonly uow: UnitOfWork) {}

  async exportAll(): Promise<BackupFile> {
    const [tasks, blocks, routines, routineExceptions, settings, meta] = await Promise.all([
      this.db.tasks.toArray(), this.db.blocks.toArray(), this.db.routines.toArray(),
      this.db.routineExceptions.toArray(), this.db.settings.get('app'), this.db.meta.toArray(),
    ]);

    const settingsRecord = settings ?? defaultSettings(Date.now());
    if (!settings) await this.db.settings.put(settingsRecord);

    return {
      app: 'tempo', schemaVersion: 1, exportedAt: new Date().toISOString(),
      data: { tasks, blocks, routines, routineExceptions, settings: settingsRecord, meta: safeMeta(meta) },
    };
  }

  async importAll(raw: BackupFile, mode: 'replace' | 'merge'): Promise<ImportSummary> {
    const file = validateBackupFile(raw);
    if (mode === 'replace') {
      return this.uow.run(['tasks', 'blocks', 'routines', 'routineExceptions', 'settings', 'meta'], async () => {
        await Promise.all([this.db.tasks.clear(), this.db.blocks.clear(), this.db.routines.clear(), this.db.routineExceptions.clear(), this.db.settings.clear(), this.db.meta.clear()]);
        await this.db.tasks.bulkPut(file.data.tasks);
        await this.db.blocks.bulkPut(file.data.blocks);
        await this.db.routines.bulkPut(file.data.routines);
        await this.db.routineExceptions.bulkPut(file.data.routineExceptions);
        await this.db.settings.put(file.data.settings);
        await this.db.meta.bulkPut(safeMeta(file.data.meta));
        return { added: file.data.tasks.length + file.data.blocks.length + file.data.routines.length + file.data.routineExceptions.length, updated: 0, skipped: 0 };
      });
    }

    return this.uow.run(['tasks', 'blocks', 'routines', 'routineExceptions'], async () => {
      const localTasks = await this.db.tasks.toArray();
      const localBlocks = await this.db.blocks.toArray();
      const localRoutines = await this.db.routines.toArray();
      const localExceptions = await this.db.routineExceptions.toArray();
      const tasks = new Map(localTasks.map((task) => [task.id, task]));
      const routines = new Map(localRoutines.map((routine) => [routine.id, routine]));
      const blocks = new Map(localBlocks.map((block) => [block.id, block]));

      for (const task of file.data.tasks) tasks.set(task.id, task);
      for (const routine of file.data.routines) routines.set(routine.id, routine);
      for (const block of file.data.blocks) blocks.set(block.id, block);
      for (const block of file.data.blocks) {
        if (block.taskId && !tasks.has(block.taskId)) throw new Error(`Block ${block.id} references a missing task.`);
        if (block.routineId && !routines.has(block.routineId)) throw new Error(`Block ${block.id} references a missing routine.`);
        for (const local of localBlocks.filter((item) => item.date === block.date && item.id !== block.id)) {
          if (blocksOverlap(local, block)) throw new Error(`Blocks overlap on ${block.date}.`);
        }
      }

      const summary: ImportSummary = { added: 0, updated: 0, skipped: 0 };
      for (const task of file.data.tasks) await putNewer(this.db.tasks, task, summary);
      for (const block of file.data.blocks) await putNewer(this.db.blocks, block, summary);
      for (const routine of file.data.routines) await putNewer(this.db.routines, routine, summary);
      for (const exception of file.data.routineExceptions) {
        const local = localExceptions.find((item) => item.id === exception.id);
        if (local && local.createdAt >= exception.createdAt) { summary.skipped += 1; continue; }
        await this.db.routineExceptions.put(exception);
        if (local) summary.updated += 1; else summary.added += 1;
      }
      return summary;
    });
  }
}
