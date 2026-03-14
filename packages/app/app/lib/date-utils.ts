import dayjs from "dayjs";
import "dayjs/locale/es";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";

/**
 * Date utilities for frontend
 * Centralizes all date handling to ensure consistency
 * Uses local timezone (Peru) for all date operations
 */

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.locale("es");
dayjs.updateLocale("es", {
  relativeTime: {
    future: "en %s",
    past: "hace %s",
    s: "unos segundos",
    m: "1 min",
    mm: "%d min",
    h: "1 h",
    hh: "%d h",
    d: "1 día",
    dd: "%d días",
    M: "1 mes",
    MM: "%d meses",
    y: "1 año",
    yy: "%d años",
  },
});

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeDateInput(date: Date | string): Date {
  if (date instanceof Date) {
    return date;
  }

  if (DATE_ONLY_PATTERN.test(date)) {
    return parseDateString(date);
  }

  return new Date(date);
}

function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDisplayDateTime(date: Date | string): string {
  const normalizedDate = normalizeDateInput(date);

  if (Number.isNaN(normalizedDate.getTime())) {
    return "Sin fecha";
  }

  return normalizedDate.toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
 * Used for date inputs and API calls
 */
export function toDateString(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

/**
 * Gets today's date as YYYY-MM-DD string (local timezone)
 * Used for date inputs
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
export function parseISODate(isoString: string | Date): Date {
  if (isoString instanceof Date) {
    return isoString;
  }
  return normalizeDateInput(isoString);
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
 * Example: "25 de feb, 2026"
 */
export function formatDisplayDate(date: Date | string): string {
  const d = normalizeDateInput(date);
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats a date as short string (DD/MM/YYYY)
 * Example: "25/02/2026"
 */
export function formatShortDate(date: Date | string): string {
  const d = normalizeDateInput(date);
  return d.toLocaleDateString('es-PE');
}

/**
 * Formats a date with full month name
 * Example: "25 de febrero de 2026"
 */
export function formatLongDate(date: Date | string): string {
  const d = normalizeDateInput(date);
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Gets relative time string (hoy, ayer, hace 2 días)
 */
export function formatRelativeDate(date: Date | string): string {
  const d = normalizeDateInput(date);
  const today = startOfDay(now());
  const inputDate = startOfDay(d);
  
  const diffTime = today.getTime() - inputDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  
  return formatDisplayDate(d);
}

/**
 * Formats a recent date with relative text for the last 48 hours.
 * Older dates fall back to an absolute date-time string.
 */
export function formatRecentDateTime(date: Date | string | null | undefined): string {
  if (!date) {
    return "Sin fecha";
  }

  const targetDate = date instanceof Date ? date : normalizeDateInput(date);

  if (Number.isNaN(targetDate.getTime())) {
    return "Sin fecha";
  }

  const target = dayjs(targetDate);
  const current = dayjs();

  if (target.isAfter(current)) {
    return formatDisplayDateTime(targetDate);
  }

  const diffInHours = current.diff(target, "hour", true);

  if (diffInHours < 24) {
    return target.fromNow();
  }

  if (
    diffInHours <= 48 &&
    target.isSame(current.subtract(1, "day"), "day")
  ) {
    return `Ayer, ${formatDisplayTime(targetDate)}`;
  }

  return formatDisplayDateTime(targetDate);
}

/**
 * Formats a timestamp for sync operations
 */
export function getSyncTimestamp(): number {
  return getTimestamp();
}

/**
 * Creates a sync ID based on timestamp
 */
export function createSyncId(): string {
  return `${getTimestamp()}-${Math.random().toString(16).slice(2)}`;
}
