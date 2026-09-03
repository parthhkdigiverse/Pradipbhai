import { useState, useMemo } from 'react';
import { Calendar, Search, CheckCircle, Check, X, FilterX } from 'lucide-react';
import { useData } from '../context/DataContext';

export function AttendancePage() {
  const { staff, attendance, setAttendance } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
  };

  // Merge staff with attendance for the selected date
  const dailyAttendance = useMemo(() => {
    return staff.map(emp => {
      const record = attendance.find(a => a.staffId === emp.id && a.date === selectedDate);
      return {
        ...emp,
        attendanceId: record?.id || null,
        status: record?.status || 'Unmarked',
        checkIn: record?.checkIn || '',
        checkOut: record?.checkOut || ''
      };
    }).filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || emp.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [staff, attendance, selectedDate, searchTerm, filterStatus]);

  const updateAttendance = (staffId: string, updates: any) => {
    setAttendance(prev => {
      const existingIdx = prev.findIndex(a => a.staffId === staffId && a.date === selectedDate);
      if (existingIdx >= 0) {
        const newArr = [...prev];
        newArr[existingIdx] = { ...newArr[existingIdx], ...updates };
        return newArr;
      } else {
        return [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          staffId,
          date: selectedDate,
          status: 'Present',
          checkIn: '',
          checkOut: '',
          ...updates
        }];
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Present': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Absent': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Half Day': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Leave': return 'bg-primary/10 text-primary border-primary';
      default: return 'bg-gray-100 text-gray-500 border-gray-200 border-dashed';
    }
  };

  const markAllPresent = () => {
    const missing = dailyAttendance.filter(a => a.status === 'Unmarked');
    if (missing.length === 0) return;

    setAttendance(prev => {
      const additions = missing.map(m => ({
        id: Math.random().toString(36).substr(2, 9),
        staffId: m.id,
        date: selectedDate,
        status: 'Present',
        checkIn: '09:00',
        checkOut: '18:00'
      }));
      return [...prev, ...additions];
    });
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Attendance</h1>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-white/60 border border-white/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm text-gray-700"
          />
          <button 
            onClick={markAllPresent}
            className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Mark All Present
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm p-4 mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Attendance
          </h3>
          <div className="flex items-center gap-4">
            <button 
              onClick={resetFilters}
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-lg text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
              <option value="All">All Status</option>
              <option value="Unmarked">Unmarked</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
        </div>
        
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search staff by name or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6">Employee</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6 text-center">Check In</th>
                <th className="py-4 px-6 text-center">Check Out</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Quick Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dailyAttendance.length > 0 ? (
                dailyAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-800 text-sm">{record.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-gray-600 bg-gray-100/50 px-2 py-0.5 rounded text-[11px]">{record.role}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <input 
                        type="time"
                        value={record.checkIn}
                        onChange={(e) => updateAttendance(record.id, { checkIn: e.target.value })}
                        disabled={record.status === 'Absent' || record.status === 'Leave'}
                        className="px-2 py-1 bg-white/50 border border-white/60 rounded text-xs focus:ring-1 focus:ring-primary/50 w-24 text-center disabled:opacity-50"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <input 
                        type="time"
                        value={record.checkOut}
                        onChange={(e) => updateAttendance(record.id, { checkOut: e.target.value })}
                        disabled={record.status === 'Absent' || record.status === 'Leave'}
                        className="px-2 py-1 bg-white/50 border border-white/60 rounded text-xs focus:ring-1 focus:ring-primary/50 w-24 text-center disabled:opacity-50"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <select 
                        value={record.status}
                        onChange={(e) => updateAttendance(record.id, { 
                          status: e.target.value,
                          ...(e.target.value === 'Absent' || e.target.value === 'Leave' ? { checkIn: '', checkOut: '' } : {})
                        })}
                        className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide cursor-pointer appearance-none text-center outline-none ${getStatusBadge(record.status)}`}
                      >
                        <option value="Unmarked">Unmarked</option>
                        <option value="Present">Present</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Leave">Leave</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => updateAttendance(record.id, { status: 'Present', checkIn: '09:00', checkOut: '18:00' })}
                          className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"
                          title="Mark Present"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => updateAttendance(record.id, { status: 'Absent', checkIn: '', checkOut: '' })}
                          className="w-7 h-7 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100"
                          title="Mark Absent"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                      <p>No staff members found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
