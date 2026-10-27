import { buildIcs } from './ics-writer';
import type { Block } from '../../domain/entities/block';

const block = (extra: Partial<Block> = {}): Block => ({
  id: 'b1', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'focus', status: 'planned', title: 'Deep work', anchor: false, createdAt: 0, updatedAt: 0, ...extra,
});

it('writes a floating local event with an alarm', () => {
  const ics = buildIcs([block()], '2026-10-25', 10, new Date('2026-10-25T12:00:00.000Z'));
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).toContain('DTSTART:20261025T090000');
  expect(ics).toContain('DTEND:20261025T093000');
  expect(ics).toContain('TRIGGER:-PT10M');
  expect(ics).toContain('UID:b1@tempo.local');
  expect(ics).toContain('DTSTAMP:20261025T120000Z');
});

it('escapes text and folds long lines', () => {
  const ics = buildIcs([block({ title: 'A, B; C\\D\nE' })], '2026-10-25', 0, new Date('2026-10-25T12:00:00.000Z'));
  expect(ics).toContain('SUMMARY:A\\, B\\; C\\\\D\\nE');
  expect(ics).toContain('TRIGGER:PT0M');
  const long = buildIcs([block({ title: 'x'.repeat(120) })], '2026-10-25', 0, new Date('2026-10-25T12:00:00.000Z'));
  for (const line of long.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
});

it('rolls a block ending at midnight to the next day', () => {
  const ics = buildIcs([block({ startMin: 1410, durationMin: 30 })], '2026-10-25', 0, new Date('2026-10-25T12:00:00.000Z'));
  expect(ics).toContain('DTSTART:20261025T233000');
  expect(ics).toContain('DTEND:20261026T000000');
  expect(ics).not.toContain('T240000');
});
