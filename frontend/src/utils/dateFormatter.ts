import type { DateFormat } from '../context/SettingsContext';

export function formatDate(dateString: string, format: DateFormat): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MMM DD, YYYY':
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      default:
        return `${day}/${month}/${year}`;
    }
  } catch (e) {
    return dateString;
  }
}

/**
 * Safely parses job startedAt or timestamps into epoch milliseconds.
 * If an ISO string was produced on a UTC cloud server without timezone offset (e.g. "2026-11-22T07:00:00"),
 * it normalizes it with 'Z' so local browsers in India (+05:30) do not treat it as 7:00 AM local time,
 * which would otherwise cause an artificial 5.5 hour time jump!
 */
export function parseJobStartTimeMs(val: string | number | null | undefined): number | null {
  if (!val) return null;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str) return null;
  let normalizedStr = str;
  if (normalizedStr.includes('T') && !normalizedStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(normalizedStr)) {
    normalizedStr += 'Z';
  }
  const ms = new Date(normalizedStr).getTime();
  return isNaN(ms) ? null : ms;
}

/**
 * Formats elapsed tracking seconds into Days for Print jobs.
 * Examples:
 *   0 seconds -> "0 Days"
 *   < 1 hour -> "< 1 Day"
 *   3 hours -> "1 Day"
 *   24 hours -> "1 Day"
 *   36 hours -> "1.5 Days"
 *   48 hours -> "2 Days"
 *   72 hours -> "3 Days"
 *   192 hours -> "8 Days"
 */
export function formatPrintDays(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds || 0));
  if (sec === 0) return '0 Days';
  if (sec < 86400) {
    const hrs = Math.floor(sec / 3600);
    return hrs < 1 ? '< 1 Day' : '1 Day';
  }
  const days = sec / 86400;
  const rounded = Math.round(days * 10) / 10;
  if (rounded % 1 === 0) {
    return `${rounded} ${rounded === 1 ? 'Day' : 'Days'}`;
  }
  return `${rounded} Days`;
}

/**
 * Formats timeline delay difference cleanly:
 * For print jobs (or Day units): returns "1 Day", "2 Days", etc.
 * For design jobs (Hours/Minutes): returns "X hrs" or "X mins"
 */
export function formatTimelineDiff(diffSecs: number, isPrint: boolean = false): string {
  if (diffSecs <= 0) return '';
  if (isPrint) {
    const days = Math.max(1, Math.ceil(diffSecs / 86400));
    return `${days} ${days === 1 ? 'Day' : 'Days'}`;
  }
  return diffSecs >= 3600 ? `${(diffSecs / 3600).toFixed(1)} hrs` : `${Math.ceil(diffSecs / 60)} mins`;
}
