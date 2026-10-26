export type TimeFormat = 'system' | '12h' | '24h';

export function formatTime(minuteOfDay: number, format: TimeFormat = 'system', locale = navigator.language): string {
  const date = new Date(2026, 0, 1, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
  if (format === '24h') {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  if (format === '12h') return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function toTimeInput(minuteOfDay: number): string {
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
}

export function parseTimeInput(value: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}
