import type { AppServices } from '../application/services';
import { makeAddTask } from '../application/use-cases/add-task';
import { makeUpdateTask } from '../application/use-cases/update-task';
import { makePlaceTask } from '../application/use-cases/place-task';
import { makeMoveBlock } from '../application/use-cases/move-block';
import { makeResizeBlock } from '../application/use-cases/resize-block';
import { makeCompleteBlock } from '../application/use-cases/complete-block';
import { makeDeleteBlock } from '../application/use-cases/delete-block';
import { makeAddBreak } from '../application/use-cases/add-break';
import { makeAddFocus } from '../application/use-cases/add-focus';
import { makeAddRoutine } from '../application/use-cases/add-routine';
import { makeUpdateRoutine } from '../application/use-cases/update-routine';
import { makeDeleteRoutine } from '../application/use-cases/delete-routine';
import { makePlaceRoutine } from '../application/use-cases/place-routine';
import { makeSkipRoutine } from '../application/use-cases/skip-routine';
import { makePreviewReflow } from '../application/use-cases/preview-reflow';
import { makeApplyReflow } from '../application/use-cases/apply-reflow';
import { makeCloseDay } from '../application/use-cases/close-day';
import { makeCarryOver } from '../application/use-cases/carry-over';
import { makeRestoreCloseDay } from '../application/use-cases/restore-close-day';
import { makeRestoreCarryOver } from '../application/use-cases/restore-carry-over';
import { makeExportBackup } from '../application/use-cases/export-backup';
import { makeImportBackup } from '../application/use-cases/import-backup';
import { makeExportIcs } from '../application/use-cases/export-ics';
import { makeUpdateSettings } from '../application/use-cases/update-settings';
import { createTempoDb } from '../infrastructure/db/tempo-db';
import { DexieUnitOfWork } from '../infrastructure/db/unit-of-work';
import { backupCodec } from '../infrastructure/export/backup-codec';
import { BrowserCalendarExportGateway } from '../infrastructure/export/browser-calendar-export-gateway';
import { DexieBackupGateway } from '../infrastructure/export/dexie-backup-gateway';
import { BrowserShareGateway } from '../infrastructure/platform/browser-share-gateway';
import { BrowserStorageGateway } from '../infrastructure/platform/browser-storage-gateway';
import { isStandalone } from '../infrastructure/platform/standalone';
import { DexieBlockRepository } from '../infrastructure/repositories/dexie-block-repository';
import { DexieDayPlanReader } from '../infrastructure/repositories/dexie-day-plan-reader';
import { DexieMetaRepository } from '../infrastructure/repositories/dexie-meta-repository';
import { DexieRoutineExceptionRepository } from '../infrastructure/repositories/dexie-routine-exception-repository';
import { DexieRoutineRepository } from '../infrastructure/repositories/dexie-routine-repository';
import { DexieSettingsRepository } from '../infrastructure/repositories/dexie-settings-repository';
import { DexieTaskRepository } from '../infrastructure/repositories/dexie-task-repository';
import { SystemClock } from '../infrastructure/time/system-clock';

export function createContainer(): AppServices {
  const db = createTempoDb();
  const uow = new DexieUnitOfWork(db);
  const tasks = new DexieTaskRepository(db);
  const blocks = new DexieBlockRepository(db);
  const routines = new DexieRoutineRepository(db);
  const exceptions = new DexieRoutineExceptionRepository(db);
  const settings = new DexieSettingsRepository(db);
  const meta = new DexieMetaRepository(db);
  const clock = new SystemClock();
  const createId = () => crypto.randomUUID();
  const backup = new DexieBackupGateway(db, uow);
  const calendar = new BrowserCalendarExportGateway();
  const share = new BrowserShareGateway();
  const storage = new BrowserStorageGateway();

  return {
    clock,
    dayPlan: new DexieDayPlanReader(db),
    storage,
    isStandalone,
    addTask: makeAddTask({ tasks, clock, createId }),
    updateTask: makeUpdateTask({ tasks, clock }),
    placeTask: makePlaceTask({ tasks, blocks, uow, clock, createId }),
    moveBlock: makeMoveBlock({ blocks, uow, clock }),
    resizeBlock: makeResizeBlock({ blocks, clock }),
    completeBlock: makeCompleteBlock({ blocks, tasks, uow, clock }),
    deleteBlock: makeDeleteBlock({ blocks, tasks, uow, clock }),
    addBreak: makeAddBreak({ blocks, clock, createId }),
    addFocus: makeAddFocus({ blocks, clock, createId }),
    addRoutine: makeAddRoutine({ routines, clock, createId }),
    updateRoutine: makeUpdateRoutine({ routines, clock }),
    deleteRoutine: makeDeleteRoutine({ routines, blocks, exceptions, uow, clock }),
    placeRoutine: makePlaceRoutine({ routines, blocks, exceptions, uow, clock, createId }),
    skipRoutine: makeSkipRoutine({ routines, exceptions, clock, createId }),
    previewReflow: makePreviewReflow({ blocks }),
    applyReflow: makeApplyReflow({ blocks, uow, clock }),
    closeDay: makeCloseDay({ tasks, blocks, uow, clock }),
    carryOver: makeCarryOver({ tasks, blocks, meta, uow, clock }),
    restoreCloseDay: makeRestoreCloseDay({ tasks, blocks, uow }),
    restoreCarryOver: makeRestoreCarryOver({ tasks, blocks, uow }),
    exportBackup: makeExportBackup({ backup, codec: backupCodec, share, meta, clock }),
    importBackup: makeImportBackup({ backup, codec: backupCodec }),
    exportIcs: makeExportIcs({ blocks, settings, calendar, share, clock }),
    updateSettings: makeUpdateSettings({ settings, clock }),
  };
}
