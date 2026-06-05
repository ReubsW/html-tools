/**
 * DateUtils.js
 * Shared date helpers. Import in any tool:
 *   import { addDays, workdaysBetween } from '../../utils/DateUtils.js';
 */

/**
 * Parse a date string (YYYY-MM-DD) or Date object into a local Date
 * with no time-zone shift surprises.
 */
export function parseDate(value) {
  if (value instanceof Date) return value;
  // YYYY-MM-DD: construct with explicit parts to avoid UTC midnight issue
  const [y, m, d] = String(value).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD. */
export function toISODate(date) {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a Date for display: "Jun 4, 2026". */
export function formatDisplay(date) {
  return date.toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

/** Add N calendar days to a Date. Returns a new Date. */
export function addDays(date, n) {
  const result = new Date(date);
  result.setDate(result.getDate() + n);
  return result;
}

/** Is a Date a weekend? */
export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Count workdays (Mon–Fri) between two dates, inclusive.
 * Optionally exclude a list of holiday date strings (YYYY-MM-DD).
 */
export function workdaysBetween(start, end, holidays = []) {
  const holidaySet = new Set(holidays);
  let count = 0;
  let cur   = new Date(start);
  cur.setHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (cur <= endDate) {
    if (!isWeekend(cur) && !holidaySet.has(toISODate(cur))) {
      count++;
    }
    cur = addDays(cur, 1);
  }

  return count;
}

/**
 * Calendar days between two dates (inclusive).
 */
export function calendarDaysBetween(start, end) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const a        = new Date(start); a.setHours(0, 0, 0, 0);
  const b        = new Date(end);   b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / msPerDay) + 1;
}

/** Returns today as a Date (midnight local). */
export function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
