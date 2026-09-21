import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'MMM DD, YYYY';
export type TimeFormat = '12h' | '24h';

interface SettingsContextType {
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (format: TimeFormat) => void;
  overtimeAlerts: boolean;
  setOvertimeAlerts: (val: boolean) => void;
  overtimeHoursLimit: number;
  setOvertimeHoursLimit: (val: number) => void;
  autoPunchOut: boolean;
  setAutoPunchOut: (val: boolean) => void;
  autoPunchOutHoursLimit: number;
  setAutoPunchOutHoursLimit: (val: number) => void;
  emailNotifications: boolean;
  setEmailNotifications: (val: boolean) => void;
  slackIntegration: boolean;
  setSlackIntegration: (val: boolean) => void;
  autoConvertLeads: boolean;
  setAutoConvertLeads: (val: boolean) => void;
  inactivityTimeoutEnabled: boolean;
  setInactivityTimeoutEnabled: (val: boolean) => void;
  inactivityTimeoutMinutes: number;
  setInactivityTimeoutMinutes: (val: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [dateFormat, setDateFormat] = useState<DateFormat>('DD/MM/YYYY');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [overtimeAlerts, setOvertimeAlerts] = useState<boolean>(true);
  const [overtimeHoursLimit, setOvertimeHoursLimit] = useState<number>(40);
  const [autoPunchOut, setAutoPunchOut] = useState<boolean>(false);
  const [autoPunchOutHoursLimit, setAutoPunchOutHoursLimit] = useState<number>(12);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [slackIntegration, setSlackIntegration] = useState<boolean>(false);
  const [autoConvertLeads, setAutoConvertLeads] = useState<boolean>(true);

  // Inactivity Timeout Settings (with localStorage persistence)
  const [inactivityTimeoutEnabled, setInactivityTimeoutEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('inactivityTimeoutEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('inactivityTimeoutMinutes');
    return saved !== null ? Number(saved) : 15;
  });

  useEffect(() => {
    localStorage.setItem('inactivityTimeoutEnabled', String(inactivityTimeoutEnabled));
  }, [inactivityTimeoutEnabled]);

  useEffect(() => {
    localStorage.setItem('inactivityTimeoutMinutes', String(inactivityTimeoutMinutes));
  }, [inactivityTimeoutMinutes]);

  return (
    <SettingsContext.Provider value={{ 
      dateFormat, setDateFormat, 
      timeFormat, setTimeFormat,
      overtimeAlerts, setOvertimeAlerts,
      overtimeHoursLimit, setOvertimeHoursLimit,
      autoPunchOut, setAutoPunchOut,
      autoPunchOutHoursLimit, setAutoPunchOutHoursLimit,
      emailNotifications, setEmailNotifications,
      slackIntegration, setSlackIntegration,
      autoConvertLeads, setAutoConvertLeads,
      inactivityTimeoutEnabled, setInactivityTimeoutEnabled,
      inactivityTimeoutMinutes, setInactivityTimeoutMinutes
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
