export interface StorageSummary {
  persisted: boolean;
  usage: number;
  quota: number;
}

const MEGABYTE = 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  if (bytes < MEGABYTE) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / MEGABYTE).toFixed(1)} MB`;
}

export function formatStorageUsage(storage: StorageSummary | undefined): string {
  if (!storage || storage.quota <= 0) return 'Storage status unavailable.';
  return `${formatBytes(storage.usage)} of ${formatBytes(storage.quota)} used`;
}

export function formatBackupDate(timestamp: number | undefined): string {
  if (timestamp === undefined) return 'Never';
  return new Date(timestamp).toLocaleDateString();
}
