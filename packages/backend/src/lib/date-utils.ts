/**
 * Date utilities for backend
 * Centralizes all date handling to ensure consistency
 * Uses local timezone (Peru) for all date operations
 */

/**
 * Gets current timestamp in milliseconds
 */
export function getTimestamp(): number {
  return Date.now();
}

/**
 * Gets current date as Date object
 */
export function now(): Date {
  return new Date();
}

/**
 * Converts a Date to YYYY-MM-DD string (local timezone)
 */
export function toDateString(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

/**
 * Gets today's date as YYYY-MM-DD string (local timezone)
 */
export function getToday(): string {
  return toDateString(now());
}

/**
 * Parses a YYYY-MM-DD string to Date object
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Month is 0-indexed in JavaScript Date
  return new Date(year, month - 1, day);
}

/**
 * Parses an ISO string to Date object
 */
export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Converts a Date to ISO string
 */
export function toISODate(date: Date): string {
  return date.toISOString();
}

/**
 * Gets date portion of ISO string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Adds days to a date
 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? parseDateString(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Subtracts days from a date
 */
export function subDays(date: Date | string, days: number): Date {
  return addDays(date, -days);
}

/**
 * Checks if two dates are the same day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseDateString(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDateString(date2) : date2;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Checks if a date is today
 */
export function isToday(date: Date | string): boolean {
  return isSameDay(date, now());
}

/**
 * Gets start of day (00:00:00)
 */
export function startOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? parseDateString(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets end of day (23:59:59)
 */
export function endOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? parseDateString(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Formats a date for display in Spanish (Peru)
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateString(date) : date;
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date as short string (DD/MM/YYYY)
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateString(date) : date;
  return d.toLocaleDateString('es-PE');
}
