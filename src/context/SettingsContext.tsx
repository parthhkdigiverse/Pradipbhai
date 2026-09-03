import { createContext, useContext, useState } from 'react';
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
      autoConvertLeads, setAutoConvertLeads
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
