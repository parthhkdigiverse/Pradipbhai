import { useState, useMemo } from 'react';
import { Calendar, Search, CheckCircle, Check, X } from 'lucide-react';
import { useData } from '../context/DataContext';

export function AttendancePage() {
  const { staff, attendance, setAttendance } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
    }).filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staff, attendance, selectedDate, searchTerm]);

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
      case 'Leave': return 'bg-blue-100 text-blue-700 border-blue-200';
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
          <div className="text-sm text-gray-500 bg-white/40 px-3 py-1.5 rounded-full border border-white/60 backdrop-blur-md inline-block">
            Home &gt; HR &gt; <span className="text-gray-800 font-medium">Attendance</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-white/60 border border-white/60 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400/50 shadow-sm text-gray-700"
          />
          <button 
            onClick={markAllPresent}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Mark All Present
          </button>
        </div>
      </div>

      <div className="p-5 flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search staff..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500 shadow-sm"
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
                        className="px-2 py-1 bg-white/50 border border-white/60 rounded text-xs focus:ring-1 focus:ring-blue-400 w-24 text-center disabled:opacity-50"
                      />
                    </td>
                    <td className="py-4 px-6 text-center">
                      <input 
                        type="time"
                        value={record.checkOut}
                        onChange={(e) => updateAttendance(record.id, { checkOut: e.target.value })}
                        disabled={record.status === 'Absent' || record.status === 'Leave'}
                        className="px-2 py-1 bg-white/50 border border-white/60 rounded text-xs focus:ring-1 focus:ring-blue-400 w-24 text-center disabled:opacity-50"
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
