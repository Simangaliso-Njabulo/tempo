import { formatDuration, parseTimeInput, toTimeInput } from './format-time';

it('formats durations in a compact, readable form', () => {
  expect(formatDuration(5)).toBe('5 min');
  expect(formatDuration(45)).toBe('45 min');
  expect(formatDuration(60)).toBe('1h');
  expect(formatDuration(90)).toBe('1h 30m');
});

it('turns a minute of day into a time input value', () => {
  expect(toTimeInput(0)).toBe('00:00');
  expect(toTimeInput(9 * 60 + 5)).toBe('09:05');
  expect(toTimeInput(23 * 60 + 59)).toBe('23:59');
});

it('parses a time input and rejects malformed or out-of-range values', () => {
  expect(parseTimeInput('00:00')).toBe(0);
  expect(parseTimeInput('09:05')).toBe(545);
  expect(parseTimeInput('23:59')).toBe(1439);
  expect(parseTimeInput('9:05')).toBeUndefined();
  expect(parseTimeInput('24:00')).toBeUndefined();
  expect(parseTimeInput('12:60')).toBeUndefined();
  expect(parseTimeInput('')).toBeUndefined();
  expect(parseTimeInput('noon')).toBeUndefined();
});
