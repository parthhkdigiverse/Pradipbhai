import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
  Briefcase, 
  CircleDollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  FileText,
  PauseCircle,
  CalendarDays,
  CalendarRange,
  Printer,
  PenTool,
  IndianRupee,
  RefreshCcw,
  Wallet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

function DetailedMetricCard({ title, value, icon: Icon, colorClass, bgClass, subtext, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]' : ''}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${bgClass} ${colorClass} shadow-inner shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-gray-500 font-semibold mb-0.5">{title}</div>
        <div className="text-xl font-bold text-gray-800 tracking-tight">{value}</div>
        {subtext && (
          <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" />
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminDashboard({ setCurrentPage }: { setCurrentPage: (page: string) => void }) {
  const { clients, jobs, invoices, setActiveFilterIntent } = useData();

  const handleCardClick = (page: string, filterKey: string, filterValue: string) => {
    setActiveFilterIntent({ page, filterKey, filterValue });
    setCurrentPage(page);
  };

  // -------------------------------------------------------------
  // DATA CALCULATIONS
  // -------------------------------------------------------------
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Financial Overview
  const totalRevenue = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (Number(j.totalAmount) || 0), 0);
  }, [jobs]);

  const pendingPayments = useMemo(() => {
    return jobs.reduce((sum, j) => {
      const total = Number(j.totalAmount) || 0;
      const paid = Number(j.paidAmount) || 0;
      return sum + Math.max(0, total - paid);
    }, 0);
  }, [jobs]);

  const thisMonthRevenue = useMemo(() => {
    const now = new Date();
    return jobs.filter(j => {
      const d = new Date(j.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((sum, j) => sum + (Number(j.totalAmount) || 0), 0);
  }, [jobs]);

  // Overall Job Summary
  const overallSummary = useMemo(() => {
    const summary = { total: jobs.length, pending: 0, progress: 0, hold: 0, completed: 0, dueToday: 0, dueThisWeek: 0, paid: 0, partialPaid: 0, unpaid: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    jobs.forEach(j => {
      // Status
      if (j.status === 'Pending') summary.pending++;
      else if (j.status === 'Progress') summary.progress++;
      else if (j.status === 'Hold') summary.hold++;
      else if (j.status === 'Completed') summary.completed++;

      // Due Dates
      if (j.dueDate) {
        const due = new Date(j.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() === today.getTime()) summary.dueToday++;
        if (due >= today && due <= nextWeek) summary.dueThisWeek++;
      }

      // Payments
      if (j.paymentStatus === 'Paid') summary.paid++;
      else if (j.paymentStatus === 'Partial') summary.partialPaid++;
      else if (j.paymentStatus === 'Unpaid') summary.unpaid++;
    });
    return summary;
  }, [jobs]);

  // Printing Jobs
  const printingSummary = useMemo(() => {
    const pJobs = jobs.filter(j => j.type === 'Printing' || j.type === 'Des+Print');
    const s = { total: pJobs.length, pending: 0, progress: 0, hold: 0, completed: 0 };
    pJobs.forEach(j => {
      if (j.status === 'Pending') s.pending++;
      else if (j.status === 'Progress') s.progress++;
      else if (j.status === 'Hold') s.hold++;
      else if (j.status === 'Completed') s.completed++;
    });
    return s;
  }, [jobs]);

  // Designing Jobs
  const designingSummary = useMemo(() => {
    const dJobs = jobs.filter(j => j.type === 'Designing' || j.type === 'Des+Print');
    const s = { total: dJobs.length, pending: 0, progress: 0, hold: 0, completed: 0 };
    dJobs.forEach(j => {
      if (j.status === 'Pending') s.pending++;
      else if (j.status === 'Progress') s.progress++;
      else if (j.status === 'Hold') s.hold++;
      else if (j.status === 'Completed') s.completed++;
    });
    return s;
  }, [jobs]);


  // Chart Data
  const jobStatusData = useMemo(() => [
    { name: 'Pending', count: overallSummary.pending, fill: '#64748b' },
    { name: 'In Progress', count: overallSummary.progress, fill: '#f97316' },
    { name: 'Hold', count: overallSummary.hold, fill: '#eab308' },
    { name: 'Completed', count: overallSummary.completed, fill: '#22c55e' },
  ], [overallSummary]);

  const invoiceData = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    invoices.forEach(inv => {
      if (inv.status === 'Paid') paid += Number(inv.total);
      else unpaid += Number(inv.total);
    });
    return [
      { name: 'Revenue', Paid: paid, Unpaid: unpaid }
    ];
  }, [invoices]);

  const recentJobs = useMemo(() => {
    return [...jobs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  }, [jobs]);

  const pendingInvoices = useMemo(() => {
    return invoices.filter(inv => inv.status !== 'Paid').slice(0, 5);
  }, [invoices]);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.company || 'Unknown Client';

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="w-full flex flex-col gap-8 pb-10">
      <div className="flex flex-col">
        <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm">Dashboard</h1>
        <p className="text-sm text-gray-500 font-medium">Comprehensive overview of your business operations</p>
      </div>

      {/* 1. Financial Overview */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DetailedMetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={IndianRupee} bgClass="bg-emerald-100" colorClass="text-emerald-600" />
          <DetailedMetricCard title="Pending Payments" value={formatCurrency(pendingPayments)} icon={CircleDollarSign} bgClass="bg-rose-100" colorClass="text-rose-600" />
          <DetailedMetricCard title="This Month Revenue" value={formatCurrency(thisMonthRevenue)} icon={TrendingUp} bgClass="bg-blue-100" colorClass="text-blue-600" subtext="6.3% vs last month" />
        </div>
      </div>

      {/* 2. Overall Job Summary */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Overall Job Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <DetailedMetricCard title="Total Jobs" value={overallSummary.total} icon={Briefcase} bgClass="bg-indigo-100" colorClass="text-indigo-600" onClick={() => handleCardClick('jobs', 'status', 'All')} />
          <DetailedMetricCard title="Pending" value={overallSummary.pending} icon={Clock} bgClass="bg-slate-100" colorClass="text-slate-600" onClick={() => handleCardClick('jobs', 'status', 'Pending')} />
          <DetailedMetricCard title="Progress" value={overallSummary.progress} icon={RefreshCcw} bgClass="bg-orange-100" colorClass="text-orange-600" onClick={() => handleCardClick('jobs', 'status', 'Progress')} />
          <DetailedMetricCard title="Hold" value={overallSummary.hold} icon={PauseCircle} bgClass="bg-yellow-100" colorClass="text-yellow-600" onClick={() => handleCardClick('jobs', 'status', 'Hold')} />
          <DetailedMetricCard title="Completed" value={overallSummary.completed} icon={CheckCircle2} bgClass="bg-emerald-100" colorClass="text-emerald-600" onClick={() => handleCardClick('jobs', 'status', 'Completed')} />
          
          <DetailedMetricCard title="Due Today" value={overallSummary.dueToday} icon={CalendarDays} bgClass="bg-purple-100" colorClass="text-purple-600" />
          <DetailedMetricCard title="Due This Week" value={overallSummary.dueThisWeek} icon={CalendarRange} bgClass="bg-purple-100" colorClass="text-purple-600" />
          <DetailedMetricCard title="Paid" value={overallSummary.paid} icon={IndianRupee} bgClass="bg-teal-100" colorClass="text-teal-600" onClick={() => handleCardClick('jobs', 'billing', 'Paid')} />
          <DetailedMetricCard title="Partial Paid" value={overallSummary.partialPaid} icon={Wallet} bgClass="bg-amber-100" colorClass="text-amber-600" onClick={() => handleCardClick('jobs', 'billing', 'Partial')} />
          <DetailedMetricCard title="Unpaid" value={overallSummary.unpaid} icon={AlertCircle} bgClass="bg-rose-100" colorClass="text-rose-600" onClick={() => handleCardClick('jobs', 'billing', 'Unpaid')} />
        </div>
      </div>

      {/* 3. Printing Jobs Status */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Printing Jobs Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <DetailedMetricCard title="Total Printing" value={printingSummary.total} icon={Printer} bgClass="bg-blue-100" colorClass="text-blue-600" onClick={() => handleCardClick('jobs', 'type', 'Printing')} />
          <DetailedMetricCard title="Pending" value={printingSummary.pending} icon={Clock} bgClass="bg-slate-100" colorClass="text-slate-600" onClick={() => handleCardClick('jobs', 'status', 'Pending')} />
          <DetailedMetricCard title="Progress" value={printingSummary.progress} icon={RefreshCcw} bgClass="bg-orange-100" colorClass="text-orange-600" onClick={() => handleCardClick('jobs', 'status', 'Progress')} />
          <DetailedMetricCard title="Hold" value={printingSummary.hold} icon={PauseCircle} bgClass="bg-yellow-100" colorClass="text-yellow-600" onClick={() => handleCardClick('jobs', 'status', 'Hold')} />
          <DetailedMetricCard title="Completed" value={printingSummary.completed} icon={CheckCircle2} bgClass="bg-emerald-100" colorClass="text-emerald-600" onClick={() => handleCardClick('jobs', 'status', 'Completed')} />
        </div>
      </div>

      {/* 4. Designing Jobs Status */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Designing Jobs Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <DetailedMetricCard title="Total Designing" value={designingSummary.total} icon={PenTool} bgClass="bg-fuchsia-100" colorClass="text-fuchsia-600" onClick={() => handleCardClick('jobs', 'type', 'Designing')} />
          <DetailedMetricCard title="Pending" value={designingSummary.pending} icon={Clock} bgClass="bg-slate-100" colorClass="text-slate-600" onClick={() => handleCardClick('jobs', 'status', 'Pending')} />
          <DetailedMetricCard title="Progress" value={designingSummary.progress} icon={RefreshCcw} bgClass="bg-orange-100" colorClass="text-orange-600" onClick={() => handleCardClick('jobs', 'status', 'Progress')} />
          <DetailedMetricCard title="Hold" value={designingSummary.hold} icon={PauseCircle} bgClass="bg-yellow-100" colorClass="text-yellow-600" onClick={() => handleCardClick('jobs', 'status', 'Hold')} />
          <DetailedMetricCard title="Completed" value={designingSummary.completed} icon={CheckCircle2} bgClass="bg-emerald-100" colorClass="text-emerald-600" onClick={() => handleCardClick('jobs', 'status', 'Completed')} />
        </div>
      </div>

      {/* Enhanced Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        <div className="glass-panel rounded-2xl relative overflow-hidden">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 bg-white/20 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Jobs Pipeline
          </div>
          <div className="p-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobStatusData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.6)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} allowDecimals={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.4)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                  {jobStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel rounded-2xl relative overflow-hidden">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 bg-white/20 flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-emerald-600" />
            Invoice Revenue
          </div>
          <div className="p-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={invoiceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.6)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 12 }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.4)'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [formatCurrency(Number(value) || 0), '']} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="Paid" fill="#10b981" radius={[4, 4, 0, 0]} barSize={60} />
                <Bar dataKey="Unpaid" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl relative">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 bg-white/20 rounded-t-2xl flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Recent Jobs
          </div>
          <div className="p-2">
            {recentJobs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-medium">No recent jobs found.</div>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="p-3 hover:bg-white/40 rounded-xl transition-colors flex items-center justify-between border-b border-white/20 last:border-0">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">{job.title}</span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5">{getClientName(job.clientId)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    {job.status === 'Completed' ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    ) : job.status === 'Progress' ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    ) : job.status === 'Hold' ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-md">
                        <PauseCircle className="w-3 h-3" /> Hold
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 mt-1">{new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl relative">
          <div className="p-5 border-b border-white/40 font-bold text-lg text-gray-800 bg-white/20 rounded-t-2xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            Pending Invoices
          </div>
          <div className="p-2">
            {pendingInvoices.length === 0 ? (
              <div className="p-6 text-center text-gray-500 font-medium">No pending invoices found. Great job!</div>
            ) : (
              pendingInvoices.map((inv) => (
                <div key={inv.id} className="p-3 hover:bg-white/40 rounded-xl transition-colors flex items-center justify-between border-b border-white/20 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-gray-800">{inv.invoiceNumber}</span>
                      <span className="text-xs text-gray-500 font-medium mt-0.5">{getClientName(inv.clientId)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-gray-800">{formatCurrency(inv.total)}</span>
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      Due: {new Date(inv.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
