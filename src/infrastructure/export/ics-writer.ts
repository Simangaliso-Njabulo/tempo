import type { Block } from '../../domain/entities/block';
import { addLocalDays, type LocalDate } from '../../domain/values/local-date';
import { MINUTES_PER_DAY } from '../../domain/values/minute-of-day';

const KIND_LABEL: Record<Block['kind'], string> = { task: 'Task', focus: 'Focus', routine: 'Routine', break: 'Break' };

function stripControlCharacters(value: string): string {
  let result = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    // Keep printable characters and newlines; drop every other control byte.
    if ((code >= 0x20 && code !== 0x7f) || code === 0x0a) result += char;
  }
  return result;
}

function escapeText(value: string): string {
  return stripControlCharacters(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function safeUid(id: string): string {
  return id.replace(/[^A-Za-z0-9._-]/g, '') || 'block';
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function stamp(date: LocalDate, minuteOfDay: number): string {
  // A block may end exactly at midnight, which is a valid one-day range but an
  // invalid clock time. Roll that end to the next day's T000000.
  const endsAtMidnight = minuteOfDay === MINUTES_PER_DAY;
  const day = (endsAtMidnight ? addLocalDays(date, 1) : date).replaceAll('-', '');
  const withinDay = endsAtMidnight ? 0 : minuteOfDay;
  const hours = String(Math.floor(withinDay / 60)).padStart(2, '0');
  const minutes = String(withinDay % 60).padStart(2, '0');
  return `${day}T${hours}${minutes}00`;
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildIcs(blocks: Block[], date: LocalDate, alarmMinutes: number, now = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TEMPO//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:TEMPO — ${date}`,
  ];
  for (const block of [...blocks].sort((a, b) => a.startMin - b.startMin)) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${safeUid(block.id)}@tempo.local`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${stamp(date, block.startMin)}`,
      `DTEND:${stamp(date, block.startMin + block.durationMin)}`,
      `SUMMARY:${escapeText(block.title)}`,
      `DESCRIPTION:${escapeText(`Type: ${KIND_LABEL[block.kind]} | Duration: ${block.durationMin} min | Created by TEMPO.`)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Starting now',
      `TRIGGER:${alarmMinutes === 0 ? 'PT0M' : `-PT${alarmMinutes}M`}`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
