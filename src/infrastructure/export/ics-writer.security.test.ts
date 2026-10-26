import { buildIcs } from './ics-writer';
import type { Block } from '../../domain/entities/block';

const block = (extra: Partial<Block> = {}): Block => ({
  id: 'b1', date: '2026-10-25', startMin: 540, durationMin: 30, kind: 'focus', status: 'planned', title: 'Deep work', anchor: false, createdAt: 0, updatedAt: 0, ...extra,
});

it('neutralises CRLF, control characters, commas, and semicolons', () => {
  const ics = buildIcs([block({ title: 'A\r\nBEGIN:VEVENT\u0000, B; C\\D' })], '2026-10-25', 0, new Date('2026-10-25T12:00:00.000Z'));
  expect(ics.split('\r\n').filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(1);
  expect(ics).toContain('SUMMARY:A\\nBEGIN:VEVENT\\, B\\; C\\\\D');
});

it('sanitises an untrusted block id in UID', () => {
  const ics = buildIcs([block({ id: 'x\r\nBEGIN:VEVENT' })], '2026-10-25', 0, new Date('2026-10-25T12:00:00.000Z'));
  expect(ics).toContain('UID:xBEGINVEVENT@tempo.local');
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
});
