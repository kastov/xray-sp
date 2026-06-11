import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_DAY = 86_400;

/** Russian short month names, 1-indexed (index 0 is a placeholder). */
const RU_MONTHS = [
  '', 'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
] as const;

/** Current time as whole unix seconds. */
export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** Wall-clock parts of an instant, as observed in the given IANA timezone. */
function zonedParts(tz: string, date: Date): ZonedParts {
  const z = toZonedTime(date, tz);
  return {
    year: z.getFullYear(),
    month: z.getMonth() + 1,
    day: z.getDate(),
    hour: z.getHours(),
    minute: z.getMinutes(),
  };
}

/** `YYYY-MM-DD` for an instant in the given timezone. */
export function dayString(tz: string, date: Date = new Date()): string {
  const { year, month, day } = zonedParts(tz, date);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** `YYYY-MM-DD HH:MM` for an instant in the given timezone. */
export function dateTimeString(tz: string, date: Date): string {
  const { year, month, day, hour, minute } = zonedParts(tz, date);
  return `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}`;
}

/** Unix seconds at local midnight (in tz) for the day containing `date`. */
export function midnightTs(tz: string, date: Date = new Date()): number {
  const { year, month, day } = zonedParts(tz, date);
  return midnightTsForDate(tz, year, month, day);
}

/** Unix seconds at local midnight (in tz) for an explicit calendar date. */
export function midnightTsForDate(tz: string, year: number, month: number, day: number): number {
  const local = `${year}-${pad2(month)}-${pad2(day)}T00:00:00`;
  return Math.floor(fromZonedTime(local, tz).getTime() / 1000);
}

/** Ascending list of the last `days` calendar days as `YYYY-MM-DD` strings. */
export function dayList(tz: string, days: number, now: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(dayString(tz, new Date(now.getTime() - i * SECONDS_PER_DAY * 1000)));
  }
  return out;
}

/** Localized day label (e.g. `11 июн`) for a midnight unix-seconds value. */
export function dayLabelFromTs(tz: string, ds: number): string {
  const { day, month } = zonedParts(tz, new Date(ds * 1000));
  return `${pad2(day)} ${RU_MONTHS[month]}`;
}

/** Localized day label (e.g. `11 июн`) for a `YYYY-MM-DD` string. */
export function dayLabelFromString(day: string): string {
  const [, month, dd] = day.split('-');
  return `${dd} ${RU_MONTHS[Number.parseInt(month, 10)]}`;
}

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** Strictly parse a `YYYY-MM-DD` string; returns null on invalid input. */
export function parseDate(str: string): CalendarDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
  if (!m) return null;
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  const day = Number.parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}
