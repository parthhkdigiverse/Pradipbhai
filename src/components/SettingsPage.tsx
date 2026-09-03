import { Settings, Calendar, Clock, AlertCircle, LogOut, Palette, Plus, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeProvider';
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

  const {
    color, setColor,
    isGradient, setIsGradient,
    gradientType, setGradientType,
    gradientDirection, setGradientDirection,
    gradientColors, setGradientColors
  } = useTheme();

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
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
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
        
        {/* Brand Theme Card */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-primary/20 p-6 relative h-fit flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-800">Brand Theme</h2>
          </div>

          <div className="space-y-6 mt-auto">
            <div className="flex items-center justify-between p-3 border border-gray-200/50 rounded-xl bg-white/40 shadow-sm">
              <span className="text-sm font-bold text-gray-800">Enable Gradient Theme</span>
              <div className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer ${isGradient ? 'bg-primary' : 'bg-gray-300'}`} onClick={() => setIsGradient(!isGradient)}>
                <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${isGradient ? 'translate-x-5' : ''}`} />
              </div>
            </div>

            <div className="flex flex-col gap-4 p-4 border border-gray-200/50 rounded-2xl bg-white/40 shadow-sm">
              {!isGradient ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-[-10px] w-20 h-20 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800">Brand Color</div>
                    <div className="text-xs text-gray-500 uppercase">{color}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {[color, ...gradientColors].map((colorItem, idx) => {
                      const allColors = [color, ...gradientColors];
                      return (
                        <div key={idx} className="flex items-center gap-4 p-2 rounded-xl border border-transparent hover:border-gray-200 transition-colors">
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                            <input
                              type="color"
                              value={colorItem}
                              onChange={(e) => {
                                const newColors = [...allColors];
                                newColors[idx] = e.target.value;
                                setColor(newColors[0] || color);
                                setGradientColors(newColors.slice(1));
                              }}
                              className="absolute inset-[-10px] w-16 h-16 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-800">{idx === 0 ? "Start Color" : `Color ${idx + 1}`}</div>
                            <div className="text-xs text-gray-500 uppercase">{colorItem}</div>
                          </div>
                          {allColors.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newColors = allColors.filter((_, i) => i !== idx);
                                setColor(newColors[0] || color);
                                setGradientColors(newColors.slice(1));
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {gradientColors.length < 5 && (
                      <button
                        type="button"
                        onClick={() => setGradientColors([...gradientColors, "#0284c7"])}
                        className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 border border-dashed border-gray-300 rounded-xl hover:bg-white/50 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Color
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Type</label>
                      <select 
                        value={gradientType}
                        onChange={(e) => setGradientType(e.target.value as "linear" | "radial")}
                        className="w-full appearance-none bg-white/70 border border-gray-200 text-gray-800 text-xs rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="linear">Linear</option>
                        <option value="radial">Radial</option>
                      </select>
                    </div>
                    {gradientType === "linear" && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Direction</label>
                        <select 
                          value={gradientDirection}
                          onChange={(e) => setGradientDirection(e.target.value)}
                          className="w-full appearance-none bg-white/70 border border-gray-200 text-gray-800 text-xs rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="to right">Right</option>
                          <option value="to left">Left</option>
                          <option value="to bottom">Bottom</option>
                          <option value="to top">Top</option>
                          <option value="to bottom right">Bottom Right</option>
                          <option value="to top left">Top Left</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-2">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Palette Preview</div>
              <div className="flex gap-2 w-full">
                <div className="flex-1 h-8 rounded-md shadow-sm border border-gray-200 transition-colors bg-primary" title="Primary" />
                <div className="flex-1 h-8 rounded-md shadow-sm border border-gray-200 transition-colors bg-sidebar-primary" title="Sidebar" />
                <div className="flex-1 h-8 rounded-md shadow-sm border border-gray-200 transition-colors" style={{ backgroundColor: 'var(--chart-1)' }} title="Chart 1" />
                <div className="flex-1 h-8 rounded-md shadow-sm border border-gray-200 transition-colors" style={{ backgroundColor: 'var(--chart-2)' }} title="Chart 2" />
                <div className="flex-1 h-8 rounded-md shadow-sm border border-gray-200 transition-colors" style={{ backgroundColor: 'var(--chart-3)' }} title="Chart 3" />
              </div>
            </div>
          </div>
        </div>

        {/* General Preferences */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-primary/20 p-6 relative h-fit">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-primary" />
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
                  className="w-full appearance-none bg-white/70 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
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
                  className="w-full appearance-none bg-white/70 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
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
            
            <p className="mt-2 text-[11px] text-gray-500 bg-primary/10 p-3 rounded-lg border border-primary/20">
              These formats will be applied to all dates and times across the dashboard and work logs.
            </p>
          </div>
        </div>
        
        {/* Time Tracking & Jobs */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-primary/20 p-6 relative overflow-hidden h-fit">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-primary" />
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
                    <div className={`block w-14 h-8 rounded-full transition-colors ${overtimeAlerts ? 'bg-primary' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${overtimeAlerts ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-primary" /> Overtime Alerts
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
              <p className="mt-4 text-[11px] text-gray-500 bg-primary/10 p-3 rounded-lg border border-primary/20">
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
                    <div className={`block w-14 h-8 rounded-full transition-colors ${autoPunchOut ? 'bg-primary' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${autoPunchOut ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-primary" /> Auto Punch-Out
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
              <p className="mt-4 text-[11px] text-gray-500 bg-primary/10 p-3 rounded-lg border border-primary/20">
                Automatically punch out employees if they remain active for more than {autoPunchOutHoursLimit} consecutive hours.
              </p>
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-primary/20 p-6 relative overflow-hidden h-fit">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-primary" />
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
                <div className={`block w-14 h-8 rounded-full transition-colors ${autoConvertLeads ? 'bg-primary' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${autoConvertLeads ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                Auto-convert won leads to clients
              </span>
            </label>
            <p className="mt-4 text-[11px] text-gray-500 bg-primary/10 p-3 rounded-lg border border-primary/20">
              When enabled, changing a lead's status to "Client Won" will automatically create a new client record.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}
