import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'MMM DD, YYYY';

interface SettingsContextType {
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [dateFormat, setDateFormat] = useState<DateFormat>('DD/MM/YYYY');

  return (
    <SettingsContext.Provider value={{ dateFormat, setDateFormat }}>
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
