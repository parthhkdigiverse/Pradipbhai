import { useState, useMemo } from 'react';
import { CalendarDays, Plus, Trash2, X, Flag, Building2, MapPin } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Holiday } from '../context/DataContext';

const TYPE_CONFIG: Record<Holiday['type'], { label: string; bg: string; text: string; iconName: string }> = {
  National: { label: 'National', bg: 'bg-blue-50', text: 'text-blue-700', iconName: 'flag' },
  Regional: { label: 'Regional', bg: 'bg-amber-50', text: 'text-amber-700', iconName: 'map-pin' },
  Company:  { label: 'Company',  bg: 'bg-violet-50', text: 'text-violet-700', iconName: 'building' },
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function TypeIcon({ type }: { type: Holiday['type'] }) {
  if (type === 'National') return <Flag className="w-3 h-3" />;
  if (type === 'Regional') return <MapPin className="w-3 h-3" />;
  return <Building2 className="w-3 h-3" />;
}

const emptyForm = () => ({ date: '', name: '', type: 'National' as Holiday['type'] });

export function HolidaysPage() {
  const { holidays, setHolidays, currentUserRole, hasPermission } = useData();
  const canManageHolidays = hasPermission(currentUserRole, 'Manage Holidays');

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const yearHolidays = useMemo(
    () => holidays
      .filter(h => h.date.startsWith(String(selectedYear)))
      .sort((a, b) => a.date.localeCompare(b.date)),
    [holidays, selectedYear]
  );

  const grouped = useMemo(() => {
    const map: Record<number, Holiday[]> = {};
    yearHolidays.forEach(h => {
      const month = parseInt(h.date.split('-')[1], 10);
      if (!map[month]) map[month] = [];
      map[month].push(h);
    });
    return map;
  }, [yearHolidays]);

  const handleAdd = () => {
    if (!form.date || !form.name.trim()) return;
    const newHoliday: Holiday = {
      id: Math.random().toString(36).substr(2, 9),
      date: form.date,
      name: form.name.trim(),
      type: form.type,
    };
    setHolidays(prev => [...prev, newHoliday]);
    setForm(emptyForm());
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
    setDeleteConfirm(null);
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const totalByType = useMemo(() => {
    const counts: Record<string, number> = { National: 0, Regional: 0, Company: 0 };
    yearHolidays.forEach(h => counts[h.type]++);
    return counts;
  }, [yearHolidays]);

  return (
    <div className="w-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Company Holidays</h1>
          <p className="text-sm text-gray-500">Manage paid holidays — they are excluded from payroll working days calculation.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-white/60 shadow-sm">
            <CalendarDays className="w-4 h-4 text-gray-500" />
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-sm font-bold focus:outline-none text-gray-700"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {canManageHolidays && (
            <button
              onClick={() => { setForm(emptyForm()); setShowModal(true); }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(['National', 'Regional', 'Company'] as const).map(type => {
          const cfg = TYPE_CONFIG[type];
          return (
            <div key={type} className="glass-panel border border-white/60 rounded-2xl p-4 bg-white/40 backdrop-blur-md flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                <span className={cfg.text}><TypeIcon type={type} /></span>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{type}</p>
                <p className="text-2xl font-black text-gray-800">{totalByType[type]}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Holiday list */}
      {yearHolidays.length === 0 ? (
        <div className="glass-panel border border-white/60 rounded-[2rem] bg-white/40 backdrop-blur-md p-16 flex flex-col items-center justify-center text-center">
          <CalendarDays className="w-14 h-14 text-gray-300 mb-4" />
          <p className="text-gray-500 font-semibold">No holidays added for {selectedYear}.</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Holiday" to get started.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).map(Number).sort((a, b) => a - b).map(month => (
            <div key={month} className="glass-panel border border-white/60 rounded-[1.5rem] bg-white/40 backdrop-blur-md overflow-hidden">
              <div className="px-6 py-3 border-b border-white/60 bg-white/20 flex items-center justify-between">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">{MONTH_NAMES[month - 1]}</h3>
                <span className="text-xs font-bold text-gray-400">{grouped[month].length} holiday{grouped[month].length > 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-100/80">
                {grouped[month].map(holiday => {
                  const cfg = TYPE_CONFIG[holiday.type];
                  const dateObj = new Date(holiday.date + 'T00:00:00');
                  const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
                  const dayNum = dateObj.getDate();
                  return (
                    <div key={holiday.id} className="flex items-center px-6 py-4 hover:bg-white/40 transition-colors group">
                      <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center mr-5">
                        <span className="text-primary font-black text-xl leading-none">{dayNum}</span>
                        <span className="text-primary/60 font-bold text-[10px] uppercase">{dayName}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm truncate">{holiday.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{holiday.date}</p>
                      </div>
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bg} ${cfg.text} mr-4`}>
                        <TypeIcon type={holiday.type} />
                        {cfg.label}
                      </span>
                      {canManageHolidays && (
                        deleteConfirm === holiday.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium">Remove?</span>
                            <button onClick={() => handleDelete(holiday.id)} className="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-colors">Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(holiday.id)}
                            className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove holiday"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Holiday Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <h2 className="text-xl font-bold text-gray-800">Add Holiday</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali, Eid, Founder's Day..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['National', 'Regional', 'Company'] as const).map(t => {
                    const cfg = TYPE_CONFIG[t];
                    const isSelected = form.type === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                          isSelected
                            ? `${cfg.bg} ${cfg.text} border-current shadow-sm`
                            : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <TypeIcon type={t} />
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200/50 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-all">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.date || !form.name.trim()}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Holiday
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
