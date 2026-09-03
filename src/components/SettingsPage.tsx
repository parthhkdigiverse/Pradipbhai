import { Settings, Calendar, Clock, Bell, Mail, MessageSquare, AlertCircle, LogOut } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import type { DateFormat, TimeFormat } from '../context/SettingsContext';

export function SettingsPage() {
  const { 
    dateFormat, setDateFormat, 
    timeFormat, setTimeFormat,
    overtimeAlerts, setOvertimeAlerts,
    overtimeHoursLimit, setOvertimeHoursLimit,
    autoPunchOut, setAutoPunchOut,
    autoPunchOutHoursLimit, setAutoPunchOutHoursLimit,
    autoConvertLeads, setAutoConvertLeads
  } = useSettings();

  const formatOptions: { label: string; value: DateFormat }[] = [
    { label: 'DD/MM/YYYY (e.g., 31/12/2026)', value: 'DD/MM/YYYY' },
    { label: 'MM/DD/YYYY (e.g., 12/31/2026)', value: 'MM/DD/YYYY' },
    { label: 'YYYY-MM-DD (e.g., 2026-12-31)', value: 'YYYY-MM-DD' },
    { label: 'MMM DD, YYYY (e.g., Dec 31, 2026)', value: 'MMM DD, YYYY' },
  ];

  return (
    <div className="h-full flex flex-col relative z-10 animate-in fade-in duration-500 max-w-5xl mx-auto w-full pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Settings className="w-5 h-5" />
            </div>
            Settings
          </h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2 text-sm font-medium">
            Configure application-wide preferences for HR and job tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* General Preferences */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-blue-900/5 p-6 relative h-fit">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">General Preferences</h2>
          </div>

          <div className="space-y-6">
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
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Time Format
              </label>
              <div className="relative">
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                  className="w-full appearance-none bg-white/70 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                >
                  <option value="12h">12-hour (1:00 PM)</option>
                  <option value="24h">24-hour (13:00)</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <p className="mt-2 text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              These formats will be applied to all dates and times across the dashboard and work logs.
            </p>
          </div>
        </div>
        
        {/* Time Tracking & Jobs */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-blue-900/5 p-6 relative overflow-hidden h-fit">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">Time Tracking</h2>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between w-full">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={overtimeAlerts}
                      onChange={(e) => setOvertimeAlerts(e.target.checked)}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${overtimeAlerts ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${overtimeAlerts ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" /> Overtime Alerts
                  </span>
                </label>
                {overtimeAlerts && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={overtimeHoursLimit}
                      onChange={(e) => setOvertimeHoursLimit(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500 font-medium">hrs</span>
                  </div>
                )}
              </div>
              <p className="mt-4 text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                Notify managers when an employee exceeds {overtimeHoursLimit} hours in a single week.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between w-full">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={autoPunchOut}
                      onChange={(e) => setAutoPunchOut(e.target.checked)}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${autoPunchOut ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${autoPunchOut ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-rose-500" /> Auto Punch-Out
                  </span>
                </label>
                {autoPunchOut && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={autoPunchOutHoursLimit}
                      onChange={(e) => setAutoPunchOutHoursLimit(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-500 font-medium">hrs</span>
                  </div>
                )}
              </div>
              <p className="mt-4 text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                Automatically punch out employees if they remain active for more than {autoPunchOutHoursLimit} consecutive hours.
              </p>
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-blue-900/5 p-6 relative overflow-hidden h-fit">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-emerald-600" />
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
                <div className={`block w-14 h-8 rounded-full transition-colors ${autoConvertLeads ? 'bg-emerald-600' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${autoConvertLeads ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                Auto-convert won leads to clients
              </span>
            </label>
            <p className="mt-4 text-[11px] text-gray-500 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              When enabled, changing a lead's status to "Client Won" will automatically create a new client record.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
