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
