import { ceilTo5, clampBlock, isMinuteOfDay, MINUTES_PER_DAY, snapTo5 } from './minute-of-day';

describe('minute-of-day', () => {
  it('accepts only integers in the day', () => {
    expect(isMinuteOfDay(0)).toBe(true);
    expect(isMinuteOfDay(1439)).toBe(true);
    expect(isMinuteOfDay(1440)).toBe(false);
    expect(isMinuteOfDay(-1)).toBe(false);
    expect(isMinuteOfDay(12.5)).toBe(false);
  });

  it('snaps and ceils to five minutes without leaving the day', () => {
    expect(snapTo5(0)).toBe(0);
    expect(snapTo5(7)).toBe(5);
    expect(snapTo5(8)).toBe(10);
    expect(ceilTo5(0)).toBe(0);
    expect(ceilTo5(1)).toBe(5);
    expect(ceilTo5(1439)).toBe(MINUTES_PER_DAY);
  });

  it('clamps a block to the day and a five-minute minimum', () => {
    expect(clampBlock(-10, 30)).toEqual({ startMin: 0, durationMin: 30 });
    expect(clampBlock(1430, 30)).toEqual({ startMin: 1430, durationMin: 10 });
    expect(clampBlock(600, 2)).toEqual({ startMin: 600, durationMin: 5 });
    expect(clampBlock(600, 10)).toEqual({ startMin: 600, durationMin: 10 });
  });
});
