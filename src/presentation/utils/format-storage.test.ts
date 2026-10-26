import { formatBackupDate, formatBytes, formatStorageUsage } from './format-storage';

it('formats bytes without noisy precision', () => {
  expect(formatBytes(0)).toBe('0 MB');
  expect(formatBytes(512)).toBe('1 KB');
  expect(formatBytes(1024 * 20)).toBe('20 KB');
  expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
});

it('describes storage usage and unavailable storage', () => {
  expect(formatStorageUsage(undefined)).toBe('Storage status unavailable.');
  expect(formatStorageUsage({ persisted: true, usage: 0, quota: 0 })).toBe('Storage status unavailable.');
  expect(formatStorageUsage({ persisted: true, usage: 1024 * 1024, quota: 10 * 1024 * 1024 })).toBe(
    '1.0 MB of 10.0 MB used',
  );
});

it('shows a backup date or Never', () => {
  expect(formatBackupDate(undefined)).toBe('Never');
  expect(formatBackupDate(new Date(2026, 9, 26).getTime())).toBe(new Date(2026, 9, 26).toLocaleDateString());
});
