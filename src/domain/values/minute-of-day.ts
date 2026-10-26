export type MinuteOfDay = number;

export const MINUTES_PER_DAY = 1440;
export const MIN_BLOCK_MINUTES = 5;

export function isMinuteOfDay(value: number): value is MinuteOfDay {
  return Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

export function snapTo5(value: number): number {
  return Math.min(MINUTES_PER_DAY, Math.max(0, Math.round(value / 5) * 5));
}

export function ceilTo5(value: number): number {
  return Math.min(MINUTES_PER_DAY, Math.max(0, Math.ceil(value / 5) * 5));
}

export function clampBlock(startMin: number, durationMin: number): { startMin: number; durationMin: number } {
  const start = Math.min(MINUTES_PER_DAY - MIN_BLOCK_MINUTES, Math.max(0, Math.round(startMin)));
  const duration = Math.max(MIN_BLOCK_MINUTES, Math.min(MINUTES_PER_DAY - start, Math.round(durationMin)));
  return { startMin: start, durationMin: duration };
}
