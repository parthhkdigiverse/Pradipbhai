import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, X, Sparkles, AlertTriangle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatDate } from '../utils/dateFormatter';

interface SmartDatePickerProps {
  value: string; // ISO date string 'YYYY-MM-DD' or empty string ''
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  showShortcuts?: boolean;
  id?: string;
  disablePastDates?: boolean;
  errorMessage?: string;
}

/**
 * Returns today's ISO date string 'YYYY-MM-DD' in local time
 */
export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses smart date input:
 * - Day + Month only: '15/10', '15-10', '15.10', '15 10', '8/5' -> auto-fills current year (e.g. 2026)
 * - 2-digit year: '15/10/26' -> '2026-10-15'
 * - 4-digit year: '15/10/2026' -> '2026-10-15'
 * - Single number: '25' -> 25th of current month
 * - Keywords: 'today', 'tomorrow', '+1', '+2', '+3', '+7', '+1w'
 */
export function parseSmartDate(rawInput: string, dateFormatSetting: string = 'DD/MM/YYYY'): { iso: string; display: string; isPast: boolean } | null {
  const text = rawInput.trim().toLowerCase();
  if (!text) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const today = now.getDate();
  const todayIso = getTodayIso();

  // Helper to format Date instance to ISO 'YYYY-MM-DD'
  const toIso = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 1. Natural keywords
  if (text === 'today' || text === 'tod') {
    const iso = toIso(now);
    return { iso, display: formatDate(iso, dateFormatSetting as any), isPast: false };
  }
  if (text === 'tomorrow' || text === 'tom') {
    const tm = new Date(now);
    tm.setDate(today + 1);
    const iso = toIso(tm);
    return { iso, display: formatDate(iso, dateFormatSetting as any), isPast: false };
  }

  // 2. Relative offsets like +1, +3, +7, +1w
  const relativeMatch = text.match(/^\+(\d+)\s*(d|day|days|w|week|weeks)?$/);
  if (relativeMatch) {
    const num = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2] || 'd';
    const daysToAdd = unit.startsWith('w') ? num * 7 : num;
    const futureDate = new Date(now);
    futureDate.setDate(today + daysToAdd);
    const iso = toIso(futureDate);
    return { iso, display: formatDate(iso, dateFormatSetting as any), isPast: false };
  }

  // 3. Extract all numeric tokens (separated by /, -, ., comma or space)
  const tokens = text.split(/[/,\-.\s]+/).filter(Boolean);

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  if (tokens.length === 1 && /^\d{1,2}$/.test(tokens[0])) {
    // Single number (1-31) -> day in current month & year
    day = parseInt(tokens[0], 10);
    month = currentMonth;
    year = currentYear;
  } else if (tokens.length === 2 && /^\d{1,2}$/.test(tokens[0]) && /^\d{1,2}$/.test(tokens[1])) {
    // Two numbers: Date and Month!
    const n1 = parseInt(tokens[0], 10);
    const n2 = parseInt(tokens[1], 10);

    if (dateFormatSetting === 'MM/DD/YYYY') {
      if (n1 > 12 && n2 <= 12) {
        day = n1;
        month = n2;
      } else {
        month = n1;
        day = n2;
      }
    } else {
      // Default DD/MM/YYYY
      if (n2 > 12 && n1 <= 12) {
        month = n1;
        day = n2;
      } else {
        day = n1;
        month = n2;
      }
    }
    // Auto-fill current year!
    year = currentYear;
  } else if (tokens.length === 3) {
    // Three numbers: Day, Month, Year OR Year, Month, Day
    if (tokens[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(tokens[0], 10);
      month = parseInt(tokens[1], 10);
      day = parseInt(tokens[2], 10);
    } else {
      const n1 = parseInt(tokens[0], 10);
      const n2 = parseInt(tokens[1], 10);
      let rawYear = parseInt(tokens[2], 10);

      // Handle 2-digit year (e.g. 26 -> 2026)
      if (rawYear < 100) {
        rawYear += 2000;
      }
      year = rawYear;

      if (dateFormatSetting === 'MM/DD/YYYY') {
        if (n1 > 12 && n2 <= 12) {
          day = n1;
          month = n2;
        } else {
          month = n1;
          day = n2;
        }
      } else {
        if (n2 > 12 && n1 <= 12) {
          month = n1;
          day = n2;
        } else {
          day = n1;
          month = n2;
        }
      }
    }
  }

  // Validate extracted date
  if (day !== null && month !== null && year !== null) {
    if (year < 2000 || year > 2099) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    // Check month overflow (e.g. Feb 30)
    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
      return null;
    }

    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      iso,
      display: formatDate(iso, dateFormatSetting as any),
      isPast: iso < todayIso
    };
  }

  return null;
}

export function SmartDatePicker({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  min,
  max = '2099-12-31',
  showShortcuts = true,
  id,
  disablePastDates = true,
  errorMessage,
}: SmartDatePickerProps) {
  const { dateFormat } = useSettings();
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  const todayIso = useMemo(() => getTodayIso(), []);
  const effectiveMin = useMemo(() => {
    if (disablePastDates) {
      return min && min > todayIso ? min : todayIso;
    }
    return min || '2020-01-01';
  }, [disablePastDates, min, todayIso]);

  // User's text in the input field
  const [inputText, setInputText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [pastDateError, setPastDateError] = useState<string | null>(null);

  // Sync external value to display text when not actively typing
  useEffect(() => {
    if (!isFocused) {
      if (value) {
        setInputText(formatDate(value, dateFormat));
      } else {
        setInputText('');
      }
    }
  }, [value, dateFormat, isFocused]);

  // Check if current loaded value is in the past
  const isCurrentValueInPast = useMemo(() => {
    return Boolean(disablePastDates && value && value < todayIso);
  }, [disablePastDates, value, todayIso]);

  // Live parsed preview when user is typing (e.g. typing "15/10" shows live preview "15/10/2026")
  const livePreview = useMemo(() => {
    if (!isFocused || !inputText.trim()) return null;
    const parsed = parseSmartDate(inputText, dateFormat);
    if (parsed && parsed.iso !== value) {
      return parsed;
    }
    return null;
  }, [inputText, dateFormat, isFocused, value]);

  // Commit input on Enter or Blur
  const handleCommit = () => {
    setPastDateError(null);

    if (!inputText.trim()) {
      onChange('');
      setInputText('');
      return;
    }

    const parsed = parseSmartDate(inputText, dateFormat);
    if (parsed) {
      if (disablePastDates && parsed.isPast) {
        setPastDateError(`Deadline cannot be a past date (${parsed.display} has already passed).`);
        // Do not commit past date
        onChange('');
        return;
      }
      onChange(parsed.iso);
      setInputText(parsed.display);
    } else {
      // Revert if invalid format
      if (value) {
        setInputText(formatDate(value, dateFormat));
      } else {
        setInputText('');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
      (e.target as HTMLInputElement).blur();
    }
  };

  // Open native calendar picker on calendar icon click
  const handleOpenNativePicker = () => {
    if (disabled) return;
    try {
      hiddenDateInputRef.current?.showPicker();
    } catch {
      hiddenDateInputRef.current?.focus();
    }
  };

  // Quick shortcut helper
  const handleShortcutClick = (offsetDays: number) => {
    setPastDateError(null);
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    onChange(iso);
    setInputText(formatDate(iso, dateFormat));
  };

  const defaultPlaceholder = dateFormat === 'MM/DD/YYYY' ? 'MM/DD (Year auto-fills)' : 'DD/MM (Year auto-fills)';
  const hasError = isCurrentValueInPast || Boolean(pastDateError) || Boolean(errorMessage);

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`}>
      {/* Input container */}
      <div className="relative flex items-center group">
        <input
          id={id}
          type="text"
          disabled={disabled}
          value={inputText}
          placeholder={placeholder || defaultPlaceholder}
          onChange={(e) => {
            setInputText(e.target.value);
            if (pastDateError) setPastDateError(null);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            handleCommit();
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pl-3 pr-16 py-2 rounded-xl text-sm transition-all shadow-2xs font-medium placeholder:text-gray-400 ${
            hasError
              ? 'bg-rose-50/60 border border-rose-300 text-rose-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/50'
              : 'bg-white/60 hover:bg-white/80 focus:bg-white border border-white/80 text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50'
          }`}
        />

        {/* Action icons on right */}
        <div className="absolute right-2 flex items-center gap-1">
          {/* Clear button if has value */}
          {value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setPastDateError(null);
                onChange('');
                setInputText('');
              }}
              className="p-1 text-gray-400 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Native calendar trigger */}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={handleOpenNativePicker}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              hasError
                ? 'text-rose-500 hover:bg-rose-100'
                : 'text-gray-500 hover:text-primary hover:bg-primary/10'
            }`}
            title="Open calendar picker"
          >
            <Calendar className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden native date input for the browser's calendar popup (with strict min constraint!) */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          tabIndex={-1}
          min={effectiveMin}
          max={max}
          value={value || ''}
          onChange={(e) => {
            const val = e.target.value;
            setPastDateError(null);
            if (disablePastDates && val && val < todayIso) {
              setPastDateError('Deadline cannot be a past date.');
              return;
            }
            onChange(val);
            if (val) {
              setInputText(formatDate(val, dateFormat));
            } else {
              setInputText('');
            }
          }}
          className="sr-only"
          aria-hidden="true"
        />
      </div>

      {/* Live typing feedback */}
      {livePreview && (
        livePreview.isPast && disablePastDates ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span>Past date not allowed: <strong>{livePreview.display}</strong> has already passed. Deadlines must be today or future.</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary font-semibold animate-in fade-in slide-in-from-top-1 duration-150">
            <Sparkles className="w-3 h-3 shrink-0 text-primary animate-pulse" />
            <span>Auto-fill year: <strong>{livePreview.display}</strong> (press Enter or Tab to confirm)</span>
          </div>
        )
      )}

      {/* Persistent Past Date Warning if loaded value is in the past */}
      {isCurrentValueInPast && !isFocused && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>Deadline cannot be a past date ({formatDate(value, dateFormat)} has passed). Please choose today or a future date.</span>
        </div>
      )}

      {/* Past date error message on blur/commit */}
      {pastDateError && !livePreview && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold animate-in fade-in slide-in-from-top-1 duration-150">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>{pastDateError}</span>
        </div>
      )}

      {/* Custom external error message */}
      {errorMessage && !pastDateError && !isCurrentValueInPast && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick shortcut chips (Always today or future!) */}
      {showShortcuts && !disabled && (
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mr-1">Quick:</span>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleShortcutClick(0)}
            className="px-2 py-0.5 bg-gray-100 hover:bg-primary/10 hover:text-primary text-gray-600 rounded text-[11px] font-semibold transition-colors cursor-pointer border border-gray-200 hover:border-primary/30"
          >
            Today
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleShortcutClick(1)}
            className="px-2 py-0.5 bg-gray-100 hover:bg-primary/10 hover:text-primary text-gray-600 rounded text-[11px] font-semibold transition-colors cursor-pointer border border-gray-200 hover:border-primary/30"
          >
            Tomorrow
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleShortcutClick(3)}
            className="px-2 py-0.5 bg-gray-100 hover:bg-primary/10 hover:text-primary text-gray-600 rounded text-[11px] font-semibold transition-colors cursor-pointer border border-gray-200 hover:border-primary/30"
          >
            +3 Days
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleShortcutClick(7)}
            className="px-2 py-0.5 bg-gray-100 hover:bg-primary/10 hover:text-primary text-gray-600 rounded text-[11px] font-semibold transition-colors cursor-pointer border border-gray-200 hover:border-primary/30"
          >
            +1 Week
          </button>
        </div>
      )}
    </div>
  );
}
