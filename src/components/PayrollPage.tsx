import { useState, useMemo } from 'react';
import { Search, FilterX, Calculator, IndianRupee, FileText, X, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

export function PayrollPage() {
  const { staff, attendance, payroll, setPayroll } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

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
            className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
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
            {(searchTerm !== '' || filterStatus !== 'All') && (
              <button 
                onClick={resetFilters}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
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
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded" title="Leave">{emp.stats.daysLeave} L</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end font-bold text-gray-700">
                        <input 
                          type="number"
                          value={emp.basic}
                          onChange={(e) => updatePayroll(emp.id, { basic: parseFloat(e.target.value) || 0 })}
                          className="w-20 text-right bg-white/50 border border-white/60 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
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
                          onClick={() => setSelectedPayslip(emp)}
                          className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-200 hover:text-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                          title="View Payslip"
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

      {/* Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPayslip(null)}></div>
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <h2 className="text-xl font-bold text-gray-800">Payslip Details</h2>
              <button onClick={() => setSelectedPayslip(null)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-200/50 pb-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-800">{selectedPayslip.name}</h3>
                  <p className="text-sm font-bold text-primary uppercase tracking-wider mt-1">{selectedPayslip.role}</p>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex ${
                    selectedPayslip.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedPayslip.status}
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-semibold">Basic Salary</span>
                  <span className="text-gray-800 font-bold flex items-center"><IndianRupee className="w-3.5 h-3.5 mr-0.5" />{selectedPayslip.basic.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-semibold">Deductions</span>
                  <span className="text-rose-600 font-bold flex items-center">-<IndianRupee className="w-3.5 h-3.5 mx-0.5" />{selectedPayslip.deductions.toLocaleString()}</span>
                </div>
                
                <div className="pt-4 mt-2 border-t border-gray-200/50 flex justify-between items-center">
                  <span className="text-gray-800 font-bold text-lg">Net Pay</span>
                  <span className="text-emerald-600 font-black text-2xl flex items-center">
                    <IndianRupee className="w-5 h-5 mr-0.5" />
                    {selectedPayslip.netPay.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Attendance Summary */}
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Attendance Summary</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-emerald-50 rounded-xl p-2">
                    <div className="text-emerald-700 font-black text-lg">{selectedPayslip.stats.daysPresent}</div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase mt-0.5">Present</div>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-2">
                    <div className="text-rose-700 font-black text-lg">{selectedPayslip.stats.daysAbsent}</div>
                    <div className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">Absent</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2">
                    <div className="text-amber-700 font-black text-lg">{selectedPayslip.stats.daysHalf}</div>
                    <div className="text-[10px] font-bold text-amber-600 uppercase mt-0.5">Half Day</div>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-2">
                    <div className="text-primary font-black text-lg">{selectedPayslip.stats.daysLeave}</div>
                    <div className="text-[10px] font-bold text-primary uppercase mt-0.5">Leave</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200/50 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setSelectedPayslip(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-all">
                Close
              </button>
              <button onClick={() => { alert('Downloading payslip...'); setSelectedPayslip(null); }} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
