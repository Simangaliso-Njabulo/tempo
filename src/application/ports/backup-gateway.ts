import type { Block, MetaRecord, Routine, RoutineException, Settings, Task } from '../../domain/entities';

export interface BackupFile {
  app: 'tempo';
  schemaVersion: 1;
  exportedAt: string;
  data: {
    tasks: Task[];
    blocks: Block[];
    routines: Routine[];
    routineExceptions: RoutineException[];
    settings: Settings;
    meta: MetaRecord[];
  };
}

export interface ImportSummary {
  added: number;
  updated: number;
  skipped: number;
}

export interface BackupGateway {
  exportAll(): Promise<BackupFile>;
  importAll(file: BackupFile, mode: 'replace' | 'merge'): Promise<ImportSummary>;
}

export interface BackupCodec {
  parseText(text: string, passphrase?: string): Promise<BackupFile>;
  encrypt(file: BackupFile, passphrase: string): Promise<unknown>;
}
