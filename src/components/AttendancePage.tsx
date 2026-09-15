import { useState, useMemo } from 'react';
import { Calendar, Search, CheckCircle, Check, X, FilterX, ChevronDown, User, Clock, History } from 'lucide-react';
import { useData } from '../context/DataContext';
import { SearchableSelect } from './SearchableSelect';

export function AttendancePage() {
  const { staff, attendance, setAttendance } = useData();
  const [activeTab, setActiveTab] = useState<'daily' | 'employee' | 'history'>('daily');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Employee-wise view state
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id || '');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0')); // "01" to "12"

  // History view state
  const [historyDateFrom, setHistoryDateFrom] = useState<string>('');
  const [historyDateTo, setHistoryDateTo] = useState<string>('');
  const [historyStaffId, setHistoryStaffId] = useState<string>('All');

  // Compute list of available years dynamically
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYr = new Date().getFullYear();
    years.add(currentYr.toString());
    years.add((currentYr - 1).toString());
    years.add((currentYr + 1).toString());

    attendance.forEach(a => {
      if (a.date) {
        const y = a.date.split('-')[0];
        if (y && y.length === 4) years.add(y);
      }
    });

    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [attendance]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setHistoryDateFrom('');
    setHistoryDateTo('');
    setHistoryStaffId('All');
  };

  // Merge staff with attendance for the selected date (Daily Entry View)
  const dailyAttendance = useMemo(() => {
    return staff.map(emp => {
      const record = attendance.find(a => a.staffId === emp.id && a.date === selectedDate);
      return {
        ...emp,
        attendanceId: record?.id || null,
        status: record?.status || 'Unmarked',
        checkIn: record?.checkIn || '',
        checkOut: record?.checkOut || '',
        punches: record?.punches || (record?.checkIn ? [{ in: record.checkIn, out: record.checkOut }] : [])
      };
    }).filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || emp.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [staff, attendance, selectedDate, searchTerm, filterStatus]);

  // Employee-wise history calculation
  const employeeHistory = useMemo(() => {
    if (!selectedStaffId) return { emp: null, records: [], summary: { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 } };
    const emp = staff.find(s => s.id === selectedStaffId);
    
    // Filter attendance for selected staff, year & month
    const empAttendance = attendance.filter(a => {
      if (a.staffId !== selectedStaffId) return false;
      if (yearFilter && !a.date.startsWith(yearFilter)) return false;
      if (monthFilter && monthFilter !== 'All') {
        const parts = a.date.split('-');
        if (parts.length >= 2 && parts[1] !== monthFilter) return false;
      }
      if (filterStatus !== 'All' && a.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const summary = { Present: 0, Absent: 0, 'Half Day': 0, Leave: 0 };
    empAttendance.forEach(a => {
      if (summary[a.status as keyof typeof summary] !== undefined) {
        summary[a.status as keyof typeof summary]++;
      }
    });

    return { emp, records: empAttendance, summary };
  }, [selectedStaffId, yearFilter, monthFilter, attendance, staff, filterStatus]);

  // General History View records
  const allHistoryRecords = useMemo(() => {
    return attendance
      .filter(record => {
        const emp = staff.find(s => s.id === record.staffId);
        const empName = emp ? emp.name.toLowerCase() : '';
        const empRole = emp ? emp.role.toLowerCase() : '';
        const matchSearch = empName.includes(searchTerm.toLowerCase()) || empRole.includes(searchTerm.toLowerCase());

        const matchStaff = historyStaffId === 'All' || record.staffId === historyStaffId;
        const matchStatus = filterStatus === 'All' || record.status === filterStatus;
        const matchDateFrom = !historyDateFrom || record.date >= historyDateFrom;
        const matchDateTo = !historyDateTo || record.date <= historyDateTo;

        return matchSearch && matchStaff && matchStatus && matchDateFrom && matchDateTo;
      })
      .map(record => ({
        ...record,
        staffName: staff.find(s => s.id === record.staffId)?.name || 'Unknown Staff',
        staffRole: staff.find(s => s.id === record.staffId)?.role || '-'
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendance, staff, searchTerm, historyStaffId, filterStatus, historyDateFrom, historyDateTo]);

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
    <div className="w-full relative space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Attendance</h1>
          <p className="text-xs text-gray-500 font-medium">
            Manage daily attendance & view historical employee records
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/60 shadow-sm backdrop-blur-md">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'daily'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Daily Entry
          </button>
          <button
            onClick={() => setActiveTab('employee')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'employee'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <User className="w-4 h-4" />
            Employee Wise
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <History className="w-4 h-4" />
            Date-Wise Log
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm flex-shrink-0 bg-white/40 backdrop-blur-md overflow-hidden">
        <button onClick={() => setShowFilters(f => !f)} className="w-full flex items-center justify-between p-4 hover:bg-white/20 transition-colors cursor-pointer select-none">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Attendance
          </h3>
          <div className="flex items-center gap-4">
            {(searchTerm !== '' || filterStatus !== 'All' || historyDateFrom !== '' || historyDateTo !== '' || historyStaffId !== 'All') && (
              <button 
                onClick={(e) => { e.stopPropagation(); resetFilters(); }}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
                <SearchableSelect
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={[
                    { value: 'All', label: 'All Status' },
                    { value: 'Unmarked', label: 'Unmarked' },
                    { value: 'Present', label: 'Present' },
                    { value: 'Absent', label: 'Absent' },
                    { value: 'Half Day', label: 'Half Day' },
                    { value: 'Leave', label: 'Leave' }
                  ]}
                />
              </div>

              {activeTab === 'history' && (
                <>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Employee</label>
                    <SearchableSelect
                      value={historyStaffId}
                      onChange={setHistoryStaffId}
                      options={[
                        { value: 'All', label: 'All Employees' },
                        ...staff.map(s => ({ value: s.id, label: s.name }))
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Date From</label>
                    <input 
                      type="date"
                      value={historyDateFrom}
                      onChange={(e) => setHistoryDateFrom(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Date To</label>
                    <input 
                      type="date"
                      value={historyDateTo}
                      onChange={(e) => setHistoryDateTo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="relative">
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
        </div>
      </div>

      {/* TAB 1: DAILY ENTRY */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white/30 backdrop-blur-md p-4 rounded-2xl border border-white/60">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Select Attendance Date:</span>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-1.5 bg-white/80 border border-white/80 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm text-gray-800 cursor-pointer"
              />
            </div>
            <button 
              onClick={markAllPresent}
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark All Unmarked Present
            </button>
          </div>

          <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
            <div className="overflow-x-auto flex-1 p-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6 text-center">First In</th>
                    <th className="py-4 px-6 text-center">Last Out</th>
                    <th className="py-4 px-6 text-center">Punch Sessions (Breaks)</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Quick Action</th>
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
                          {record.punches && record.punches.length > 0 ? (
                            <div className="flex items-center justify-center gap-1.5 max-w-[200px] mx-auto relative group/popover">
                              {/* Show first session */}
                              <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-700 whitespace-nowrap">
                                {record.punches[0].in} - {record.punches[0].out || 'Active'}
                              </span>
                              
                              {/* +N more badge if multiple sessions */}
                              {record.punches.length > 1 && (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold cursor-pointer whitespace-nowrap">
                                  +{record.punches.length - 1} more
                                </span>
                              )}

                              {/* Hover tooltip/popover showing all sessions */}
                              <div className="hidden group-hover/popover:flex flex-col gap-1.5 absolute bottom-full mb-2 z-30 bg-gray-900/95 text-white p-2.5 rounded-xl shadow-xl text-left border border-gray-700 min-w-[170px] pointer-events-none transition-all">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider border-b border-gray-800 pb-1">
                                  All Sessions ({record.punches.length})
                                </span>
                                {record.punches.map((p: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-gray-400">#{idx + 1}:</span>
                                    <span className="font-semibold text-emerald-400">{p.in} - {p.out || 'Active'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">No punches</span>
                          )}
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
                      <td colSpan={7} className="py-12 text-center text-gray-500">
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
      )}

      {/* TAB 2: EMPLOYEE-WISE ATTENDANCE HISTORY */}
      {activeTab === 'employee' && (
        <div className="space-y-6">
          {/* Employee Selector Bar */}
          <div className="glass-panel p-5 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 max-w-sm">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                Select Employee:
              </label>
              <SearchableSelect
                value={selectedStaffId}
                onChange={setSelectedStaffId}
                options={staff.map(s => ({ value: s.id, label: `${s.name} (${s.role})` }))}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                  Select Year:
                </label>
                <SearchableSelect
                  value={yearFilter}
                  onChange={setYearFilter}
                  options={availableYears.map(yr => ({ value: yr, label: yr }))}
                  className="w-32"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                  Select Month:
                </label>
                <SearchableSelect
                  value={monthFilter}
                  onChange={setMonthFilter}
                  options={[
                    { value: 'All', label: 'All Months' },
                    { value: '01', label: 'January' },
                    { value: '02', label: 'February' },
                    { value: '03', label: 'March' },
                    { value: '04', label: 'April' },
                    { value: '05', label: 'May' },
                    { value: '06', label: 'June' },
                    { value: '07', label: 'July' },
                    { value: '08', label: 'August' },
                    { value: '09', label: 'September' },
                    { value: '10', label: 'October' },
                    { value: '11', label: 'November' },
                    { value: '12', label: 'December' }
                  ]}
                  className="w-40"
                />
              </div>
            </div>
          </div>

          {/* Employee Attendance Summary Cards */}
          {employeeHistory.emp && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 backdrop-blur-md">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Present Days</span>
                <p className="text-2xl font-extrabold text-emerald-800 mt-1">{employeeHistory.summary.Present}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-rose-100 bg-rose-50/40 backdrop-blur-md">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Absent Days</span>
                <p className="text-2xl font-extrabold text-rose-800 mt-1">{employeeHistory.summary.Absent}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-amber-100 bg-amber-50/40 backdrop-blur-md">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Half Days</span>
                <p className="text-2xl font-extrabold text-amber-800 mt-1">{employeeHistory.summary['Half Day']}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-md">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Leave Taken</span>
                <p className="text-2xl font-extrabold text-primary mt-1">{employeeHistory.summary.Leave}</p>
              </div>
            </div>
          )}

          {/* Employee Attendance History Table */}
          <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
            <div className="p-4 border-b border-gray-100 bg-white/30 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Attendance Records for {employeeHistory.emp?.name} ({monthFilter})
              </h3>
              <span className="text-xs text-gray-500 font-semibold">Total Logs: {employeeHistory.records.length}</span>
            </div>

            <div className="overflow-x-auto flex-1 p-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Day</th>
                    <th className="py-4 px-6 text-center">Check In</th>
                    <th className="py-4 px-6 text-center">Check Out</th>
                    <th className="py-4 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employeeHistory.records.length > 0 ? (
                    employeeHistory.records.map((rec) => {
                      const dateObj = new Date(rec.date);
                      const dayName = isNaN(dateObj.getTime()) ? '-' : dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                      return (
                        <tr key={rec.id} className="hover:bg-white/60 transition-colors">
                          <td className="py-4 px-6 font-bold text-gray-800">{rec.date}</td>
                          <td className="py-4 px-6 font-medium text-gray-500">{dayName}</td>
                          <td className="py-4 px-6 text-center font-semibold text-gray-700">{rec.checkIn || '--:--'}</td>
                          <td className="py-4 px-6 text-center font-semibold text-gray-700">{rec.checkOut || '--:--'}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wide inline-block ${getStatusBadge(rec.status)}`}>
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                          <p>No attendance records found for this employee in {monthFilter}.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATE-WISE / MASTER LOG HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
            <div className="p-4 border-b border-gray-100 bg-white/30 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Date-Wise Master Attendance Log
              </h3>
              <span className="text-xs text-gray-500 font-semibold">Total Records: {allHistoryRecords.length}</span>
            </div>

            <div className="overflow-x-auto flex-1 p-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Employee</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6 text-center">Check In</th>
                    <th className="py-4 px-6 text-center">Check Out</th>
                    <th className="py-4 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allHistoryRecords.length > 0 ? (
                    allHistoryRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-white/60 transition-colors">
                        <td className="py-4 px-6 font-bold text-gray-800">{rec.date}</td>
                        <td className="py-4 px-6 font-bold text-gray-800">{rec.staffName}</td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-600 bg-gray-100/50 px-2 py-0.5 rounded text-[11px]">{rec.staffRole}</span>
                        </td>
                        <td className="py-4 px-6 text-center font-semibold text-gray-700">{rec.checkIn || '--:--'}</td>
                        <td className="py-4 px-6 text-center font-semibold text-gray-700">{rec.checkOut || '--:--'}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wide inline-block ${getStatusBadge(rec.status)}`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                          <p>No historical attendance records found matching filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
