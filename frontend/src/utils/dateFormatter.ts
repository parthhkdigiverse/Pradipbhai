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
