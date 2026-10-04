/**
 * Returns today's date as YYYY-MM-DD string using LOCAL timezone (not UTC).
 * This avoids date-shift issues on VPS servers where Date.toISOString() returns UTC.
 */
export function localDateStr(date?: Date | number): string {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns YYYY-MM-DD for N days ago using LOCAL timezone.
 */
export function localDateStrDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateStr(d);
}
