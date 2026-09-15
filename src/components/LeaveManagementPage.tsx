import { useState, useMemo } from 'react';
import {
  ClipboardList, Plus, X, CheckCircle, XCircle, Clock, Search,
  ChevronDown, User, AlertCircle, Sliders, RotateCcw
} from 'lucide-react';
import { useData } from '../context/DataContext';
import type { LeaveRequest } from '../context/DataContext';

type LeaveType = LeaveRequest['type'];
type LeaveStatus = LeaveRequest['status'];

const LEAVE_COLORS: Record<LeaveType, { bg: string; text: string; border: string }> = {
  Casual:  { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
  Sick:    { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200' },
  Earned:  { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200' },
  Unpaid:  { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200' },
};

const STATUS_COLORS: Record<LeaveStatus, { bg: string; text: string }> = {
  Pending:  { bg: 'bg-amber-100',   text: 'text-amber-700' },
  Approved: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  Rejected: { bg: 'bg-rose-100',    text: 'text-rose-600' },
};

function StatusIcon({ status }: { status: LeaveStatus }) {
  if (status === 'Approved') return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'Rejected') return <XCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
}

function calcDays(from: string, to: string) {
  if (!from || !to) return 0;
  const d1 = new Date(from);
  const d2 = new Date(to);
  return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
}

const emptyForm = () => ({
  fromDate: '',
  toDate: '',
  type: 'Casual' as LeaveType,
  reason: '',
});

export function LeaveManagementPage() {
  const { staff, leaveRequests, setLeaveRequests, leaveBalances, setLeaveBalances, currentUserRole, setAttendance } = useData();

  const isAdminOrManager = currentUserRole === 'Admin' || currentUserRole === 'Manager';

  // Tab: 'my' | 'all' | 'balances'
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'balances'>('my');

  // My leaves — we pick the first staff member as "current user" (mock)
  const currentStaff = staff[0];

  // Apply modal
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState(emptyForm());

  // Reject note modal
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Admin filter
  const [filterStatus, setFilterStatus] = useState<'All' | LeaveStatus>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // My leaves
  const myLeaves = useMemo(
    () => leaveRequests
      .filter(r => r.staffId === currentStaff?.id)
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)),
    [leaveRequests, currentStaff]
  );

  // All leaves (admin view)
  const allLeaves = useMemo(
    () => leaveRequests
      .filter(r => {
        const matchStatus = filterStatus === 'All' || r.status === filterStatus;
        const matchSearch = r.staffName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchStatus && matchSearch;
      })
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)),
    [leaveRequests, filterStatus, searchTerm]
  );

  const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;

  // My balance
  const myBalance = leaveBalances.find(b => b.staffId === currentStaff?.id);
  const myUsed = useMemo(() => {
    const approved = myLeaves.filter(r => r.status === 'Approved');
    return {
      Casual: approved.filter(r => r.type === 'Casual').reduce((s, r) => s + r.days, 0),
      Sick:   approved.filter(r => r.type === 'Sick').reduce((s, r) => s + r.days, 0),
      Earned: approved.filter(r => r.type === 'Earned').reduce((s, r) => s + r.days, 0),
    };
  }, [myLeaves]);

  const handleApply = () => {
    if (!form.fromDate || !form.toDate || !form.reason.trim() || !currentStaff) return;
    const days = calcDays(form.fromDate, form.toDate);
    const newReq: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      type: form.type,
      fromDate: form.fromDate,
      toDate: form.toDate,
      days,
      reason: form.reason.trim(),
      status: 'Pending',
      appliedOn: new Date().toISOString().slice(0, 10),
    };
    setLeaveRequests(prev => [newReq, ...prev]);
    setForm(emptyForm());
    setShowApply(false);
  };

  const handleCancel = (id: string) => {
    setLeaveRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleApprove = (req: LeaveRequest) => {
    // 1. Update leave status
    setLeaveRequests(prev =>
      prev.map(r => r.id === req.id ? {
        ...r,
        status: 'Approved',
        reviewedBy: 'Admin',
        reviewedOn: new Date().toISOString().slice(0, 10),
        reviewNote: '',
      } : r)
    );

    // 2. Auto-create attendance records for each leave day (skip existing)
    const leaveDays: string[] = [];
    const cursor = new Date(req.fromDate + 'T00:00:00');
    const end = new Date(req.toDate + 'T00:00:00');
    while (cursor <= end) {
      leaveDays.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    setAttendance(prev => {
      const existing = new Set(prev.filter(a => a.staffId === req.staffId).map(a => a.date));
      const newRecords = leaveDays
        .filter(d => !existing.has(d))
        .map(d => ({
          id: Math.random().toString(36).substr(2, 9),
          staffId: req.staffId,
          date: d,
          status: 'Leave',
          checkIn: '',
          checkOut: '',
        }));
      return [...prev, ...newRecords];
    });

    // 3. Deduct from leave balance
    if (req.type !== 'Unpaid') {
      setLeaveBalances(prev => prev.map(b => {
        if (b.staffId !== req.staffId) return b;
        const key = req.type.toLowerCase() as 'casual' | 'sick' | 'earned';
        return { ...b, [key]: Math.max(0, b[key] - req.days) };
      }));
    }
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    setLeaveRequests(prev =>
      prev.map(r => r.id === rejectTarget.id ? {
        ...r,
        status: 'Rejected',
        reviewedBy: 'Admin',
        reviewedOn: new Date().toISOString().slice(0, 10),
        reviewNote: rejectNote.trim(),
      } : r)
    );
    setRejectTarget(null);
    setRejectNote('');
  };

  const balanceCards = [
    { label: 'Casual',  total: myBalance?.casual ?? 0, used: myUsed.Casual,  color: LEAVE_COLORS.Casual },
    { label: 'Sick',    total: myBalance?.sick   ?? 0, used: myUsed.Sick,    color: LEAVE_COLORS.Sick },
    { label: 'Earned',  total: myBalance?.earned ?? 0, used: myUsed.Earned,  color: LEAVE_COLORS.Earned },
  ];

  return (
    <div className="w-full relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Leave Management</h1>
          <p className="text-sm text-gray-500">Apply for leave, track status, and manage approvals.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdminOrManager && pendingCount > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingCount} Pending
            </div>
          )}
          {activeTab === 'my' && (
            <button
              onClick={() => { setForm(emptyForm()); setShowApply(true); }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Apply for Leave
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'my' ? 'bg-white/80 text-primary shadow-sm border border-white/80' : 'text-gray-500 hover:text-gray-800'}`}
        >
          My Leaves
        </button>
        {isAdminOrManager && (
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'all' ? 'bg-white/80 text-primary shadow-sm border border-white/80' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Leave Requests
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        )}
        {isAdminOrManager && (
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'balances' ? 'bg-white/80 text-primary shadow-sm border border-white/80' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Leave Balances
          </button>
        )}
      </div>

      {/* ══════════ MY LEAVES TAB ══════════ */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          {/* Balance cards */}
          <div className="grid grid-cols-3 gap-4">
            {balanceCards.map(card => {
              const remaining = card.total - card.used;
              const pct = card.total > 0 ? (card.used / card.total) * 100 : 0;
              return (
                <div key={card.label} className="glass-panel border border-white/60 rounded-2xl p-5 bg-white/40 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${card.color.bg} ${card.color.text}`}>{card.label}</span>
                    <span className="text-xs text-gray-400 font-semibold">{card.total} days/yr</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-3xl font-black text-gray-800">{remaining}</span>
                    <span className="text-sm text-gray-400 font-semibold mb-1">remaining</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${card.color.bg.replace('bg-', 'bg-').replace('-50', '-400')}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 font-semibold">{card.used} used</p>
                </div>
              );
            })}
          </div>

          {/* My leave history */}
          <div className="glass-panel border border-white/60 rounded-[2rem] bg-white/40 backdrop-blur-md overflow-hidden">
            <div className="px-6 py-4 border-b border-white/60 bg-white/20 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-gray-500" />
              <h3 className="font-bold text-gray-700 text-sm">My Leave History</h3>
            </div>
            {myLeaves.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-semibold">No leave applications yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-widest bg-gray-50/40">
                      <th className="py-3 px-6">Type</th>
                      <th className="py-3 px-6">From</th>
                      <th className="py-3 px-6">To</th>
                      <th className="py-3 px-6 text-center">Days</th>
                      <th className="py-3 px-6">Reason</th>
                      <th className="py-3 px-6 text-center">Status</th>
                      <th className="py-3 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80">
                    {myLeaves.map(req => {
                      const lc = LEAVE_COLORS[req.type];
                      const sc = STATUS_COLORS[req.status];
                      return (
                        <tr key={req.id} className="hover:bg-white/50 transition-colors group">
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${lc.bg} ${lc.text} ${lc.border}`}>{req.type}</span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-700">{req.fromDate}</td>
                          <td className="py-4 px-6 font-semibold text-gray-700">{req.toDate}</td>
                          <td className="py-4 px-6 text-center font-black text-gray-800">{req.days}</td>
                          <td className="py-4 px-6 text-gray-500 max-w-[180px] truncate">{req.reason}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>
                              <StatusIcon status={req.status} />
                              {req.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {req.status === 'Pending' && (
                              <button
                                onClick={() => handleCancel(req.id)}
                                className="text-[11px] font-bold text-rose-500 hover:text-rose-700 px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                Cancel
                              </button>
                            )}
                            {req.status === 'Rejected' && req.reviewNote && (
                              <span className="text-[10px] text-gray-400 italic">"{req.reviewNote}"</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ ADMIN / LEAVE REQUESTS TAB ══════════ */}
      {activeTab === 'all' && isAdminOrManager && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="glass-panel border border-white/60 rounded-[1.5rem] bg-white/40 backdrop-blur-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 appearance-none pr-8"
                  >
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by employee name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Leave requests table */}
          <div className="glass-panel border border-white/60 rounded-[2rem] bg-white/40 backdrop-blur-md overflow-hidden">
            {allLeaves.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 font-semibold">No leave requests found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-widest bg-gray-50/40">
                      <th className="py-3 px-6">Employee</th>
                      <th className="py-3 px-6">Type</th>
                      <th className="py-3 px-6">Duration</th>
                      <th className="py-3 px-6 text-center">Days</th>
                      <th className="py-3 px-6">Reason</th>
                      <th className="py-3 px-6 text-center">Status</th>
                      <th className="py-3 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80">
                    {allLeaves.map(req => {
                      const lc = LEAVE_COLORS[req.type];
                      const sc = STATUS_COLORS[req.status];
                      return (
                        <tr key={req.id} className="hover:bg-white/50 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-xs">{req.staffName}</p>
                                <p className="text-[10px] text-gray-400">{req.appliedOn}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${lc.bg} ${lc.text} ${lc.border}`}>{req.type}</span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-600">
                            {req.fromDate === req.toDate ? req.fromDate : `${req.fromDate} → ${req.toDate}`}
                          </td>
                          <td className="py-4 px-6 text-center font-black text-gray-800">{req.days}</td>
                          <td className="py-4 px-6 text-gray-500 max-w-[160px] truncate">{req.reason}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${sc.bg} ${sc.text}`}>
                              <StatusIcon status={req.status} />
                              {req.status}
                            </span>
                            {req.status !== 'Pending' && req.reviewedBy && (
                              <p className="text-[10px] text-gray-400 mt-0.5">by {req.reviewedBy}</p>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {req.status === 'Pending' ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleApprove(req)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-colors shadow-sm"
                                >
                                  <CheckCircle className="w-3 h-3" /> Approve
                                </button>
                                <button
                                  onClick={() => { setRejectTarget(req); setRejectNote(''); }}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[11px] font-bold transition-colors shadow-sm"
                                >
                                  <XCircle className="w-3 h-3" /> Reject
                                </button>
                              </div>
                            ) : req.reviewNote ? (
                              <span className="text-[10px] text-gray-400 italic max-w-[100px] block truncate">"{req.reviewNote}"</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ LEAVE BALANCES TAB ══════════ */}
      {activeTab === 'balances' && isAdminOrManager && (
        <div className="space-y-5">
          {/* Header row with reset button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Edit each employee's annual leave allocation. Changes are saved instantly.
            </p>
            <button
              onClick={() => {
                setLeaveBalances(prev => prev.map(b => ({ ...b, casual: 12, sick: 10, earned: 15 })));
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All to Defaults
            </button>
          </div>

          <div className="glass-panel border border-white/60 rounded-[2rem] bg-white/40 backdrop-blur-md overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-widest bg-gray-50/40">
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-6 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Casual</span>
                  </th>
                  <th className="py-3 px-6 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">Sick</span>
                  </th>
                  <th className="py-3 px-6 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Earned</span>
                  </th>
                  <th className="py-3 px-6 text-center text-gray-400">Used (C/S/E)</th>
                  <th className="py-3 px-6 text-center text-gray-400">Remaining (C/S/E)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {staff.map(emp => {
                  const bal = leaveBalances.find(b => b.staffId === emp.id) ?? { staffId: emp.id, casual: 12, sick: 10, earned: 15 };
                  const approved = leaveRequests.filter(r => r.staffId === emp.id && r.status === 'Approved');
                  const usedC = approved.filter(r => r.type === 'Casual').reduce((s, r) => s + r.days, 0);
                  const usedS = approved.filter(r => r.type === 'Sick').reduce((s, r) => s + r.days, 0);
                  const usedE = approved.filter(r => r.type === 'Earned').reduce((s, r) => s + r.days, 0);

                  const updateBal = (field: 'casual' | 'sick' | 'earned', value: number) => {
                    setLeaveBalances(prev => {
                      const idx = prev.findIndex(b => b.staffId === emp.id);
                      if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = { ...next[idx], [field]: Math.max(0, value) };
                        return next;
                      }
                      return [...prev, { staffId: emp.id, casual: 12, sick: 10, earned: 15, [field]: Math.max(0, value) }];
                    });
                  };

                  return (
                    <tr key={emp.id} className="hover:bg-white/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{emp.name}</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{emp.role}</p>
                          </div>
                        </div>
                      </td>
                      {/* Casual */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="number"
                          min={0}
                          value={bal.casual}
                          onChange={e => updateBal('casual', parseInt(e.target.value) || 0)}
                          className="w-16 text-center bg-blue-50/60 border border-blue-100 rounded-lg px-2 py-1 text-sm font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                        />
                      </td>
                      {/* Sick */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="number"
                          min={0}
                          value={bal.sick}
                          onChange={e => updateBal('sick', parseInt(e.target.value) || 0)}
                          className="w-16 text-center bg-rose-50/60 border border-rose-100 rounded-lg px-2 py-1 text-sm font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                        />
                      </td>
                      {/* Earned */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="number"
                          min={0}
                          value={bal.earned}
                          onChange={e => updateBal('earned', parseInt(e.target.value) || 0)}
                          className="w-16 text-center bg-emerald-50/60 border border-emerald-100 rounded-lg px-2 py-1 text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all"
                        />
                      </td>
                      {/* Used */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2 text-[11px] font-bold">
                          <span className="text-blue-500">{usedC}</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-rose-500">{usedS}</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-emerald-600">{usedE}</span>
                        </div>
                      </td>
                      {/* Remaining */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2 text-[11px] font-bold">
                          <span className={bal.casual - usedC < 3 ? 'text-rose-500' : 'text-blue-600'}>{Math.max(0, bal.casual - usedC)}</span>
                          <span className="text-gray-300">/</span>
                          <span className={bal.sick - usedS < 2 ? 'text-rose-500' : 'text-rose-600'}>{Math.max(0, bal.sick - usedS)}</span>
                          <span className="text-gray-300">/</span>
                          <span className={bal.earned - usedE < 3 ? 'text-rose-500' : 'text-emerald-600'}>{Math.max(0, bal.earned - usedE)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <p className="text-[11px] text-gray-400 text-center">
            Remaining values shown in <span className="text-rose-500 font-bold">red</span> when running low (Casual &lt; 3, Sick &lt; 2, Earned &lt; 3). Changes auto-save.
          </p>
        </div>
      )}

      {/* ══════════ APPLY MODAL ══════════ */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowApply(false)} />
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <h2 className="text-xl font-bold text-gray-800">Apply for Leave</h2>
              <button onClick={() => setShowApply(false)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Leave Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Leave Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Casual', 'Sick', 'Earned', 'Unpaid'] as LeaveType[]).map(t => {
                    const lc = LEAVE_COLORS[t];
                    const isSelected = form.type === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setForm(f => ({ ...f, type: t }))}
                        className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${isSelected ? `${lc.bg} ${lc.text} ${lc.border} shadow-sm` : 'border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'}`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From Date</label>
                  <input
                    type="date"
                    value={form.fromDate}
                    onChange={e => setForm(f => ({ ...f, fromDate: e.target.value, toDate: f.toDate < e.target.value ? e.target.value : f.toDate }))}
                    className="w-full px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={form.toDate}
                    min={form.fromDate}
                    onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800"
                  />
                </div>
              </div>

              {/* Days preview */}
              {form.fromDate && form.toDate && (
                <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">Total Days</span>
                  <span className="text-sm font-black text-primary">{calcDays(form.fromDate, form.toDate)} day{calcDays(form.fromDate, form.toDate) > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reason</label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the reason for leave..."
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200/50 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setShowApply(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all">
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!form.fromDate || !form.toDate || !form.reason.trim()}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ REJECT MODAL ══════════ */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRejectTarget(null)} />
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
              <h2 className="text-lg font-bold text-gray-800">Reject Leave</h2>
              <button onClick={() => setRejectTarget(null)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-rose-600">{rejectTarget.staffName} · {rejectTarget.type} · {rejectTarget.days} day{rejectTarget.days > 1 ? 's' : ''}</p>
                <p className="text-xs text-rose-500 mt-0.5">{rejectTarget.fromDate} → {rejectTarget.toDate}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rejection Note (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Add a reason for rejection..."
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/50 text-gray-800 placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200/50 bg-gray-50/50 flex justify-end gap-3">
              <button onClick={() => setRejectTarget(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all">
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
