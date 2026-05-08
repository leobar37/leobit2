/**
 * Calendar / business period utilities for Avileo.
 *
 * All functions use UTC month boundaries. This is intentional:
 * - Subscription usage periods are aligned to UTC calendar months so
 *   server-side calculations are deterministic regardless of client TZ.
 * - Display formatting (es-PE) is handled by presentation-layer helpers.
 */

export interface CalendarMonthPeriod {
  periodStart: Date;
  periodEnd: Date;
}

export type CalendarPeriod = CalendarMonthPeriod;

export function getCalendarDayPeriod(date?: Date): CalendarPeriod {
  const d = date ?? new Date();
  const periodStart = new Date(d);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(d);
  periodEnd.setHours(23, 59, 59, 999);

  return { periodStart, periodEnd };
}

export function getCalendarWeekPeriod(date?: Date): CalendarPeriod {
  const d = date ?? new Date();
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const periodStart = new Date(d);
  periodStart.setDate(diff);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(d);
  periodEnd.setHours(23, 59, 59, 999);

  return { periodStart, periodEnd };
}

/**
 * Returns the inclusive UTC calendar-month bounds for the given date.
 * - periodStart: first day of the month at 00:00:00.000 UTC
 * - periodEnd:   last day of the month at 23:59:59.999 UTC
 */
export function getCalendarMonthPeriod(date?: Date): CalendarMonthPeriod {
  const d = date ?? new Date();
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();

  const periodStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  return { periodStart, periodEnd };
}

/**
 * Checks whether a date falls inside a period (inclusive on both ends).
 */
export function isDateInPeriod(
  date: Date,
  period: CalendarMonthPeriod
): boolean {
  const t = date.getTime();
  return t >= period.periodStart.getTime() && t <= period.periodEnd.getTime();
}

/**
 * Returns an ISO-8601 string pair for the period.
 * Useful when serializing to JSON or storing in timestamp columns.
 */
export function periodToISOStrings(
  period: CalendarMonthPeriod
): { periodStart: string; periodEnd: string } {
  return {
    periodStart: period.periodStart.toISOString(),
    periodEnd: period.periodEnd.toISOString(),
  };
}
