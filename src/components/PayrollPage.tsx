import { useState, useMemo } from 'react';
import { IndianRupee, Search, Calendar as CalendarIcon, Calculator, CheckCircle, FileText, FilterX } from 'lucide-react';
import { useData } from '../context/DataContext';

export function PayrollPage() {
  const { staff, attendance, payroll, setPayroll } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
  };
  
  // Default to current month, format YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const getDaysInMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const monthlyPayroll = useMemo(() => {
    return staff.map(emp => {
      const record = payroll.find(p => p.staffId === emp.id && p.month === selectedMonth);
      
      // Calculate attendance stats for the month if no payroll record exists yet
      let daysPresent = 0;
      let daysAbsent = 0;
      let daysHalf = 0;
      let daysLeave = 0;

      const monthRecords = attendance.filter(a => a.staffId === emp.id && a.date.startsWith(selectedMonth));
      
      monthRecords.forEach(r => {
        if (r.status === 'Present') daysPresent++;
        if (r.status === 'Absent') daysAbsent++;
        if (r.status === 'Half Day') daysHalf++;
        if (r.status === 'Leave') daysLeave++;
      });

      // Default calculation logic
      const daysInMonth = getDaysInMonth(selectedMonth);
      const perDaySalary = emp.baseSalary / daysInMonth;
      
      // Deduct full pay for Absent, half pay for Half Day. Leaves are considered paid.
      const calculatedDeductions = Math.round((daysAbsent * perDaySalary) + (daysHalf * (perDaySalary / 2)));
      const calculatedNet = emp.baseSalary - calculatedDeductions;

      return {
        ...emp,
        payrollId: record?.id || null,
        basic: record?.basic ?? emp.baseSalary,
        deductions: record?.deductions ?? calculatedDeductions,
        netPay: record?.netPay ?? calculatedNet,
        status: record?.status || 'Pending',
        stats: { daysPresent, daysAbsent, daysHalf, daysLeave }
      };
    }).filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || emp.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [staff, attendance, payroll, selectedMonth, searchTerm, filterStatus]);

  const updatePayroll = (staffId: string, updates: any) => {
    setPayroll(prev => {
      const existingIdx = prev.findIndex(p => p.staffId === staffId && p.month === selectedMonth);
      if (existingIdx >= 0) {
        const newArr = [...prev];
        // Ensure netPay stays synced if basic or deductions change
        const merged = { ...newArr[existingIdx], ...updates };
        merged.netPay = merged.basic - merged.deductions;
        newArr[existingIdx] = merged;
        return newArr;
      } else {
        const newRecord = {
          id: Math.random().toString(36).substr(2, 9),
          staffId,
          month: selectedMonth,
          basic: 0,
          deductions: 0,
          netPay: 0,
          status: 'Pending',
          ...updates
        };
        newRecord.netPay = newRecord.basic - newRecord.deductions;
        return [...prev, newRecord];
      }
    });
  };

  const markAllPaid = () => {
    const pending = monthlyPayroll.filter(p => p.status === 'Pending');
    if (pending.length === 0) return;

    setPayroll(prev => {
      let next = [...prev];
      pending.forEach(p => {
        const existingIdx = next.findIndex(x => x.staffId === p.id && x.month === selectedMonth);
        if (existingIdx >= 0) {
          next[existingIdx] = { ...next[existingIdx], status: 'Paid' };
        } else {
          next.push({
            id: Math.random().toString(36).substr(2, 9),
            staffId: p.id,
            month: selectedMonth,
            basic: p.basic,
            deductions: p.deductions,
            netPay: p.netPay,
            status: 'Paid'
          });
        }
      });
      return next;
    });
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Payroll Management</h1>
          <div className="text-sm text-gray-500 bg-white/40 px-3 py-1.5 rounded-full border border-white/60 backdrop-blur-md inline-block">
            Home &gt; HR &gt; <span className="text-gray-800 font-medium">Payroll</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-white/60 shadow-sm">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-bold focus:outline-none text-gray-700 w-32"
            />
          </div>
          
          <button 
            onClick={markAllPaid}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Mark All Paid
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm p-4 mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Payroll
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm font-bold text-gray-600 bg-white/40 px-4 py-2 rounded-xl border border-white/60">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">Total Net Pay:</span>
                <span className="text-emerald-700 text-lg flex items-center">
                  <IndianRupee className="w-4 h-4" />
                  {monthlyPayroll.reduce((sum, p) => sum + p.netPay, 0).toLocaleString()}
                </span>
              </div>
            </div>
            <button 
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
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
            className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6">Employee</th>
                <th className="py-4 px-6">Attendance Stats</th>
                <th className="py-4 px-6 text-right">Basic Salary</th>
                <th className="py-4 px-6 text-right">Deductions</th>
                <th className="py-4 px-6 text-right">Net Pay</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyPayroll.length > 0 ? (
                monthlyPayroll.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-800 text-sm block">{emp.name}</span>
                      <span className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">{emp.role}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2 text-[10px] font-bold">
                        <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded" title="Present">{emp.stats.daysPresent} P</span>
                        <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded" title="Absent">{emp.stats.daysAbsent} A</span>
                        <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded" title="Half Day">{emp.stats.daysHalf} H</span>
                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded" title="Leave">{emp.stats.daysLeave} L</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end font-bold text-gray-700">
                        <input 
                          type="number"
                          value={emp.basic}
                          onChange={(e) => updatePayroll(emp.id, { basic: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right bg-white/50 border border-white/60 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end font-bold text-rose-600">
                        <input 
                          type="number"
                          value={emp.deductions}
                          onChange={(e) => updatePayroll(emp.id, { deductions: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right bg-white/50 border border-white/60 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-600"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-emerald-700 text-sm flex items-center justify-end">
                        <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                        {emp.netPay.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <select 
                        value={emp.status}
                        onChange={(e) => updatePayroll(emp.id, { status: e.target.value })}
                        className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide cursor-pointer appearance-none text-center outline-none ${
                          emp.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center">
                        <button 
                          className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-200 hover:text-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                          title="Download Payslip"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Calculator className="w-12 h-12 text-gray-300 mb-4" />
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
