import { Settings, Calendar } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import type { DateFormat } from '../context/SettingsContext';

export function SettingsPage() {
  const { dateFormat, setDateFormat, autoConvertLeads, setAutoConvertLeads } = useSettings();

  const formatOptions: { label: string; value: DateFormat }[] = [
    { label: 'DD/MM/YYYY (e.g., 31/12/2026)', value: 'DD/MM/YYYY' },
    { label: 'MM/DD/YYYY (e.g., 12/31/2026)', value: 'MM/DD/YYYY' },
    { label: 'YYYY-MM-DD (e.g., 2026-12-31)', value: 'YYYY-MM-DD' },
    { label: 'MMM DD, YYYY (e.g., Dec 31, 2026)', value: 'MMM DD, YYYY' },
  ];

  return (
    <div className="h-full flex flex-col relative z-10 animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Settings className="w-5 h-5" />
            </div>
            Global Settings
          </h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2 text-sm font-medium">
            Configure application-wide preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-blue-900/5 p-6 relative h-fit">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Date Preferences</h2>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Global Date Format
            </label>
            <div className="relative">
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormat)}
                className="w-full appearance-none bg-white/70 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
              >
                {formatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              This format will be applied to all dates across the dashboard, including leads, follow-ups, and reports.
            </p>
          </div>
        </div>
        
        {/* Automation Settings */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-blue-900/5 p-6 relative overflow-hidden h-fit">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Automation</h2>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={autoConvertLeads}
                  onChange={(e) => setAutoConvertLeads(e.target.checked)}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${autoConvertLeads ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${autoConvertLeads ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Auto-convert won leads to clients
              </span>
            </label>
            <p className="mt-4 text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              When enabled, changing a lead's status to "Client Won" will automatically create a new client record with their contact information.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
