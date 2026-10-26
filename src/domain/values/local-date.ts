export type LocalDate = string;

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isLocalDate(value: string): value is LocalDate {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;

  const [yearText, monthText, dayText] = value.split('-');
  if (yearText === undefined || monthText === undefined || dayText === undefined) return false;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12) return false;

  const daysInMonth = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
  return daysInMonth !== undefined && day >= 1 && day <= daysInMonth;
}

export function toLocalDate(date: Date): LocalDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromLocalDate(value: LocalDate): Date {
  const [yearText, monthText, dayText] = value.split('-');
  const date = new Date(2000, 0, 1, 12);
  date.setFullYear(Number(yearText), Number(monthText) - 1, Number(dayText));
  return date;
}

export function addLocalDays(value: LocalDate, days: number): LocalDate {
  const date = fromLocalDate(value);
  date.setDate(date.getDate() + days);
  return toLocalDate(date);
}

export function compareLocalDates(a: LocalDate, b: LocalDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function dayOfWeek(value: LocalDate): number {
  return fromLocalDate(value).getDay();
}

export function eachLocalDate(from: LocalDate, to: LocalDate): LocalDate[] {
  const dates: LocalDate[] = [];
  let cursor = from;
  while (compareLocalDates(cursor, to) <= 0) {
    dates.push(cursor);
    cursor = addLocalDays(cursor, 1);
  }
  return dates;
}
