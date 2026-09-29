import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'MMM DD, YYYY';
export type TimeFormat = '12h' | '24h';
export type PenaltyAction = 'warning' | 'deduction' | 'half_day';

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
  officeStartTime: string;
  setOfficeStartTime: (val: string) => void;
  lateBufferMinutes: number;
  setLateBufferMinutes: (val: number) => void;
  enableLatePenalty: boolean;
  setEnableLatePenalty: (val: boolean) => void;
  latePenaltyAction: PenaltyAction;
  setLatePenaltyAction: (val: PenaltyAction) => void;
  latePenaltyAmount: number;
  setLatePenaltyAmount: (val: number) => void;
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

  // Late Punch-In Penalty Settings (with localStorage persistence)
  const [officeStartTime, setOfficeStartTime] = useState<string>(() => {
    return localStorage.getItem('officeStartTime') || '09:00';
  });
  const [lateBufferMinutes, setLateBufferMinutes] = useState<number>(() => {
    const saved = localStorage.getItem('lateBufferMinutes');
    return saved !== null ? Number(saved) : 15;
  });
  const [enableLatePenalty, setEnableLatePenalty] = useState<boolean>(() => {
    const saved = localStorage.getItem('enableLatePenalty');
    return saved !== null ? saved === 'true' : true;
  });
  const [latePenaltyAction, setLatePenaltyAction] = useState<PenaltyAction>(() => {
    return (localStorage.getItem('latePenaltyAction') as PenaltyAction) || 'warning';
  });
  const [latePenaltyAmount, setLatePenaltyAmount] = useState<number>(() => {
    const saved = localStorage.getItem('latePenaltyAmount');
    return saved !== null ? Number(saved) : 50;
  });

  useEffect(() => {
    localStorage.setItem('inactivityTimeoutEnabled', String(inactivityTimeoutEnabled));
  }, [inactivityTimeoutEnabled]);

  useEffect(() => {
    localStorage.setItem('inactivityTimeoutMinutes', String(inactivityTimeoutMinutes));
  }, [inactivityTimeoutMinutes]);

  useEffect(() => {
    localStorage.setItem('officeStartTime', officeStartTime);
  }, [officeStartTime]);

  useEffect(() => {
    localStorage.setItem('lateBufferMinutes', String(lateBufferMinutes));
  }, [lateBufferMinutes]);

  useEffect(() => {
    localStorage.setItem('enableLatePenalty', String(enableLatePenalty));
  }, [enableLatePenalty]);

  useEffect(() => {
    localStorage.setItem('latePenaltyAction', latePenaltyAction);
  }, [latePenaltyAction]);

  useEffect(() => {
    localStorage.setItem('latePenaltyAmount', String(latePenaltyAmount));
  }, [latePenaltyAmount]);

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
      inactivityTimeoutMinutes, setInactivityTimeoutMinutes,
      officeStartTime, setOfficeStartTime,
      lateBufferMinutes, setLateBufferMinutes,
      enableLatePenalty, setEnableLatePenalty,
      latePenaltyAction, setLatePenaltyAction,
      latePenaltyAmount, setLatePenaltyAmount
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
