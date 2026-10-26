import type { BackupFile } from '../../application/ports/backup-gateway';
import type { Block, MetaRecord, Routine, RoutineException, Settings, Task, TaskStatus } from '../../domain/entities';
import { blocksOverlap } from '../../domain/services/overlap';
import { isLocalDate } from '../../domain/values/local-date';
import { isMinuteOfDay, MIN_BLOCK_MINUTES, MINUTES_PER_DAY } from '../../domain/values/minute-of-day';
import { BACKUP_SCHEMA_VERSION } from '../db/migrations';

const TASK_STATUSES: TaskStatus[] = ['inbox', 'planned', 'done', 'archived'];
const BLOCK_KINDS = ['task', 'focus', 'routine', 'break'] as const;
const BLOCK_STATUSES = ['planned', 'done'] as const;
const ROUTINE_KINDS = ['routine', 'break'] as const;
const THEMES = ['system', 'dark', 'light'] as const;
const TIME_FORMATS = ['system', '12h', '24h'] as const;
const SAFE_META_KEYS = new Set(['lastActiveDate', 'realPlanDates', 'lastBackupAt', 'backupReminderSnoozedUntil']);

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_ITEMS_PER_COLLECTION = 10_000;
export const MAX_TITLE_LENGTH = 200;

const TASK_KEYS = new Set(['id', 'title', 'status', 'carriedFrom', 'sortOrder', 'createdAt', 'updatedAt', 'completedAt', 'archivedAt']);
const BLOCK_KEYS = new Set(['id', 'date', 'startMin', 'durationMin', 'kind', 'status', 'title', 'taskId', 'routineId', 'anchor', 'createdAt', 'updatedAt', 'completedAt']);
const ROUTINE_KEYS = new Set(['id', 'title', 'kind', 'daysOfWeek', 'preferredStartMin', 'durationMin', 'anchor', 'active', 'createdAt', 'updatedAt']);
const EXCEPTION_KEYS = new Set(['id', 'routineId', 'date', 'type', 'createdAt']);
const SETTINGS_KEYS = new Set(['id', 'theme', 'timeFormat', 'reflowAutoApply', 'inAppReminders', 'icsAlarmMinutes', 'installCardDismissed', 'updatedAt']);
const META_KEYS = new Set(['key', 'value']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isTimestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isOptionalTimestamp = (value: unknown): value is number | undefined => value === undefined || isTimestamp(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

function fail(errors: string[]): never {
  throw new BackupValidationError(errors.slice(0, 8).join(' '));
}

function rejectUnsafeKeys(value: unknown, path: string, errors: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectUnsafeKeys(item, `${path}[${index}]`, errors));
    return;
  }
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`${path} contains a forbidden key.`);
    rejectUnsafeKeys(value[key], `${path}.${key}`, errors);
  }
}

function rejectUnknownKeys(value: unknown, allowed: Set<string>, path: string, errors: string[]): void {
  if (!isRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${path} has an unknown field.`);
  }
}

function taskFrom(raw: unknown, index: number, errors: string[]): Task | undefined {
  if (!isRecord(raw)) { errors.push(`Task ${index} is not an object.`); return undefined; }
  if (!isString(raw.id) || !isString(raw.title) || raw.title.length > MAX_TITLE_LENGTH || !TASK_STATUSES.includes(raw.status as TaskStatus) || !isTimestamp(raw.createdAt) || !isTimestamp(raw.updatedAt)) {
    errors.push(`Task ${index} has an invalid shape.`);
    return undefined;
  }
  if (raw.carriedFrom !== undefined && !isLocalDate(raw.carriedFrom as string)) {
    errors.push(`Task ${index} has an invalid carriedFrom.`);
    return undefined;
  }
  if (!isOptionalTimestamp(raw.completedAt) || !isOptionalTimestamp(raw.archivedAt)) {
    errors.push(`Task ${index} has an invalid timestamp.`);
    return undefined;
  }
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status as TaskStatus,
    carriedFrom: raw.carriedFrom as string | undefined,
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    completedAt: raw.completedAt,
    archivedAt: raw.archivedAt,
  };
}

function blockFrom(raw: unknown, index: number, errors: string[]): Block | undefined {
  if (!isRecord(raw)) { errors.push(`Block ${index} is not an object.`); return undefined; }
  const start = raw.startMin;
  const duration = raw.durationMin;
  if (
    !isString(raw.id) || !isLocalDate(raw.date as string) ||
    typeof start !== 'number' || !isMinuteOfDay(start) ||
    typeof duration !== 'number' || !Number.isInteger(duration) || duration < MIN_BLOCK_MINUTES ||
    !BLOCK_KINDS.includes(raw.kind as never) || !BLOCK_STATUSES.includes(raw.status as never) ||
    !isString(raw.title) || raw.title.length > MAX_TITLE_LENGTH || !isBoolean(raw.anchor) || !isTimestamp(raw.createdAt) || !isTimestamp(raw.updatedAt) ||
    !isOptionalTimestamp(raw.completedAt)
  ) {
    errors.push(`Block ${index} has an invalid shape.`);
    return undefined;
  }
  if (raw.taskId !== undefined && !isString(raw.taskId)) { errors.push(`Block ${index} has an invalid taskId.`); return undefined; }
  if (raw.routineId !== undefined && !isString(raw.routineId)) { errors.push(`Block ${index} has an invalid routineId.`); return undefined; }
  return {
    id: raw.id, date: raw.date as string, startMin: start, durationMin: duration, kind: raw.kind as Block['kind'], status: raw.status as Block['status'],
    title: raw.title, taskId: raw.taskId, routineId: raw.routineId, anchor: raw.anchor,
    createdAt: raw.createdAt, updatedAt: raw.updatedAt, completedAt: raw.completedAt,
  };
}

function routineFrom(raw: unknown, index: number, errors: string[]): Routine | undefined {
  if (!isRecord(raw)) { errors.push(`Routine ${index} is not an object.`); return undefined; }
  const days = raw.daysOfWeek;
  if (
    !isString(raw.id) || !isString(raw.title) || raw.title.length > MAX_TITLE_LENGTH || !ROUTINE_KINDS.includes(raw.kind as never) ||
    !Array.isArray(days) || days.length === 0 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    new Set(days).size !== days.length || !isMinuteOfDay(raw.preferredStartMin as number) ||
    typeof raw.durationMin !== 'number' || !Number.isInteger(raw.durationMin) || raw.durationMin < MIN_BLOCK_MINUTES || raw.durationMin > MINUTES_PER_DAY ||
    !isBoolean(raw.anchor) || !isBoolean(raw.active) || !isTimestamp(raw.createdAt) || !isTimestamp(raw.updatedAt)
  ) {
    errors.push(`Routine ${index} has an invalid shape.`);
    return undefined;
  }
  return {
    id: raw.id, title: raw.title, kind: raw.kind as Routine['kind'], daysOfWeek: days as number[],
    preferredStartMin: raw.preferredStartMin as number, durationMin: raw.durationMin, anchor: raw.anchor, active: raw.active,
    createdAt: raw.createdAt, updatedAt: raw.updatedAt,
  };
}

function exceptionFrom(raw: unknown, index: number, errors: string[]): RoutineException | undefined {
  if (!isRecord(raw)) { errors.push(`Routine exception ${index} is not an object.`); return undefined; }
  if (!isString(raw.id) || !isString(raw.routineId) || !isLocalDate(raw.date as string) || raw.type !== 'skip' || !isTimestamp(raw.createdAt)) {
    errors.push(`Routine exception ${index} has an invalid shape.`);
    return undefined;
  }
  return { id: raw.id, routineId: raw.routineId, date: raw.date as string, type: 'skip', createdAt: raw.createdAt };
}

function settingsFrom(raw: unknown, errors: string[]): Settings | undefined {
  if (!isRecord(raw)) { errors.push('Settings are not an object.'); return undefined; }
  if (
    raw.id !== 'app' || !THEMES.includes(raw.theme as never) || !TIME_FORMATS.includes(raw.timeFormat as never) ||
    !isBoolean(raw.reflowAutoApply) || !isBoolean(raw.inAppReminders) || !isBoolean(raw.installCardDismissed) ||
    typeof raw.icsAlarmMinutes !== 'number' || ![0, 5, 10, 15, 30, 60].includes(raw.icsAlarmMinutes) ||
    !isTimestamp(raw.updatedAt)
  ) {
    errors.push('Settings have an invalid shape.');
    return undefined;
  }
  return {
    id: 'app', theme: raw.theme as Settings['theme'], timeFormat: raw.timeFormat as Settings['timeFormat'],
    reflowAutoApply: raw.reflowAutoApply, inAppReminders: raw.inAppReminders, icsAlarmMinutes: raw.icsAlarmMinutes,
    installCardDismissed: raw.installCardDismissed, updatedAt: raw.updatedAt,
  };
}

function metaFrom(raw: unknown, errors: string[]): MetaRecord[] {
  if (!Array.isArray(raw)) { errors.push('Meta is not an array.'); return []; }
  const records: MetaRecord[] = [];
  for (const item of raw) {
    if (!isRecord(item) || !isString(item.key)) { errors.push('A meta record is invalid.'); continue; }
    if (!SAFE_META_KEYS.has(item.key)) continue;
    const value = item.value;
    const validPrimitive = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    const validPlanDates = item.key === 'realPlanDates' && Array.isArray(value) && value.every((entry) => isLocalDate(entry as string));
    if (!validPrimitive && !validPlanDates) { errors.push(`Meta ${item.key} has an invalid value.`); continue; }
    records.push({ key: item.key, value });
  }
  return records;
}

export function validateBackupFile(raw: unknown): BackupFile {
  const errors: string[] = [];
  if (!isRecord(raw)) fail(['The backup is not an object.']);
  if (raw.app !== 'tempo') fail(['This is not a TEMPO backup.']);
  if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1) {
    fail(['The backup schema version is invalid.']);
  }
  if (raw.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupValidationError('This backup was made by a newer version of TEMPO.');
  }
  if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) fail(['The backup schema version is not supported.']);
  if (typeof raw.exportedAt !== 'string' || Number.isNaN(Date.parse(raw.exportedAt))) fail(['The backup export date is invalid.']);
  if (!isRecord(raw.data)) fail(['The backup data is invalid.']);

  rejectUnsafeKeys(raw, 'backup', errors);
  rejectUnknownKeys(raw, new Set(['app', 'schemaVersion', 'exportedAt', 'data']), 'Backup', errors);

  const data = raw.data;
  if (!Array.isArray(data.tasks) || !Array.isArray(data.blocks) || !Array.isArray(data.routines) || !Array.isArray(data.routineExceptions) || !Array.isArray(data.meta)) {
    fail(['The backup collections are invalid.']);
  }

  for (const [name, collection] of Object.entries({
    tasks: data.tasks,
    blocks: data.blocks,
    routines: data.routines,
    routineExceptions: data.routineExceptions,
    meta: data.meta,
  })) {
    if (collection.length > MAX_ITEMS_PER_COLLECTION) errors.push(`${name} exceeds the import limit.`);
  }
  data.tasks.forEach((item, index) => rejectUnknownKeys(item, TASK_KEYS, `Task ${index}`, errors));
  data.blocks.forEach((item, index) => rejectUnknownKeys(item, BLOCK_KEYS, `Block ${index}`, errors));
  data.routines.forEach((item, index) => rejectUnknownKeys(item, ROUTINE_KEYS, `Routine ${index}`, errors));
  data.routineExceptions.forEach((item, index) => rejectUnknownKeys(item, EXCEPTION_KEYS, `Routine exception ${index}`, errors));
  rejectUnknownKeys(data.settings, SETTINGS_KEYS, 'Settings', errors);
  data.meta.forEach((item, index) => rejectUnknownKeys(item, META_KEYS, `Meta ${index}`, errors));

  const tasks = data.tasks.map((item, index) => taskFrom(item, index, errors)).filter((item): item is Task => Boolean(item));
  const blocks = data.blocks.map((item, index) => blockFrom(item, index, errors)).filter((item): item is Block => Boolean(item));
  const routines = data.routines.map((item, index) => routineFrom(item, index, errors)).filter((item): item is Routine => Boolean(item));
  const routineExceptions = data.routineExceptions.map((item, index) => exceptionFrom(item, index, errors)).filter((item): item is RoutineException => Boolean(item));
  const settings = settingsFrom(data.settings, errors);
  const meta = metaFrom(data.meta, errors);

  if (errors.length) fail(errors);
  if (!settings) fail(['Settings are missing.']);

  const ids = new Set<string>();
  for (const item of [...tasks, ...blocks, ...routines, ...routineExceptions]) {
    if (ids.has(item.id)) errors.push(`Duplicate id ${item.id}.`);
    ids.add(item.id);
  }
  const taskIds = new Set(tasks.map((task) => task.id));
  const routineIds = new Set(routines.map((routine) => routine.id));
  for (const block of blocks) {
    if (block.taskId && !taskIds.has(block.taskId)) errors.push(`Block ${block.id} references a missing task.`);
    if (block.routineId && !routineIds.has(block.routineId)) errors.push(`Block ${block.id} references a missing routine.`);
    if (block.startMin + block.durationMin > MINUTES_PER_DAY) errors.push(`Block ${block.id} crosses midnight.`);
  }
  for (const exception of routineExceptions) {
    if (!routineIds.has(exception.routineId)) errors.push(`Routine exception ${exception.id} references a missing routine.`);
  }
  const byDate = new Map<string, Block[]>();
  for (const block of blocks) byDate.set(block.date, [...(byDate.get(block.date) ?? []), block]);
  for (const [date, dayBlocks] of byDate) {
    const sorted = [...dayBlocks].sort((a, b) => a.startMin - b.startMin);
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (previous && current && blocksOverlap(previous, current)) errors.push(`Blocks overlap on ${date}.`);
    }
  }
  if (errors.length) fail(errors);

  return { app: 'tempo', schemaVersion: 1, exportedAt: raw.exportedAt, data: { tasks, blocks, routines, routineExceptions, settings, meta } };
}

export function parseBackupText(text: string): unknown {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new BackupValidationError('That backup is too large. The limit is 10 MB.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new BackupValidationError('That file is not valid JSON.');
  }
}
