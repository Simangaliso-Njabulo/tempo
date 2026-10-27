import { addLocalDays, compareLocalDates, dayOfWeek, eachLocalDate, fromLocalDate, isLocalDate, toLocalDate } from './local-date';

describe('local-date', () => {
  it('formats local calendar components, not UTC', () => {
    expect(toLocalDate(new Date(2026, 9, 25, 23, 30))).toBe('2026-10-25');
    expect(toLocalDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('validates real local dates', () => {
    expect(isLocalDate('2026-10-25')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2024-02-29')).toBe(true);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('2026-1-1')).toBe(false);
  });

  it('adds days across DST without losing the date', () => {
    expect(addLocalDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addLocalDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addLocalDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addLocalDays('2026-10-25', -1)).toBe('2026-10-24');
  });

  it('enumerates inclusive date ranges', () => {
    expect(eachLocalDate('2026-10-24', '2026-10-26')).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
    expect(eachLocalDate('2026-10-25', '2026-10-25')).toEqual(['2026-10-25']);
  });

  it('reports the local weekday and compares lexicographically', () => {
    expect(dayOfWeek('2026-10-25')).toBe(0);
    expect(compareLocalDates('2026-10-24', '2026-10-25')).toBe(-1);
    expect(compareLocalDates('2026-10-25', '2026-10-25')).toBe(0);
    expect(compareLocalDates('2026-10-26', '2026-10-25')).toBe(1);
  });

  it('creates a noon anchor for local date math', () => {
    expect(fromLocalDate('2026-10-25').getHours()).toBe(12);
  });
});
