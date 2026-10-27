import { useState, useMemo } from 'react';
import {
  ClipboardList, Plus, X, CheckCircle, XCircle, Clock, Search,
  ChevronDown, User, AlertCircle, Sliders, RotateCcw, AlertTriangle, Lock
} from 'lucide-react';
import { useData } from '../context/DataContext';
import type { LeaveRequest } from '../context/DataContext';

type LeaveType = LeaveRequest['type'];
type LeaveStatus = LeaveRequest['status'];

const LEAVE_COLORS: Record<LeaveType, { bg: string; text: string; border: string }> = {
  Casual:  { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200' },
  Sick:    { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200' },
  Earned:  { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200' },
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
  isHalfDay: false,
  halfDaySession: 'First Half' as 'First Half' | 'Second Half',
  reason: '',
});

export function LeaveManagementPage() {
  const { staff, leaveRequests, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest, leaveBalances, setLeaveBalances, currentUserRole, currentUser, hasPermission, attendance, addAttendance } = useData();

  const canApply = hasPermission(currentUserRole, 'Apply Leave');
  const canApproveReject = hasPermission(currentUserRole, 'Approve/Reject Leaves');
  const isAdminOrManager = currentUserRole === 'Admin' || currentUserRole === 'Manager';

  // Tab: 'my' | 'all' | 'balances'
  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'balances'>('my');

  // Use authenticated currentUser
  const currentStaff = staff.find(s => s.id === currentUser?.id || (s.email && currentUser?.email && s.email.toLowerCase() === currentUser.email.toLowerCase())) || {
    id: currentUser?.id || 'emp-001',
    name: currentUser?.name || 'Staff Member',
    email: currentUser?.email
  };

  // Apply modal
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  // Close apply modal & clear warning
  const closeApplyModal = () => {
    setShowApply(false);
    setQuotaWarning(null);
  };

  // Reject note modal
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Admin filter
  const [filterStatus, setFilterStatus] = useState<'All' | LeaveStatus>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // My leaves
  const myLeaves = useMemo(
    () => leaveRequests
      .filter(r => (r.staffId || (r as any).staff_id) === currentStaff?.id)
      .sort((a, b) => (b.appliedOn || (b as any).applied_on || '').localeCompare(a.appliedOn || (a as any).applied_on || '')),
    [leaveRequests, currentStaff]
  );

  // All leaves (admin view)
  const allLeaves = useMemo(
    () => leaveRequests
      .filter(r => {
        const matchStatus = filterStatus === 'All' || r.status === filterStatus;
        const nameStr = r.staffName || (r as any).staff_name || '';
        const matchSearch = nameStr.toLowerCase().includes((searchTerm || '').toLowerCase());
        return matchStatus && matchSearch;
      })
      .sort((a, b) => (b.appliedOn || (b as any).applied_on || '').localeCompare(a.appliedOn || (a as any).applied_on || '')),
    [leaveRequests, filterStatus, searchTerm]
  );

  const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;

  // My balance
  const myBalance = leaveBalances.find(b => b.staffId === currentStaff?.id);
  const earnedPaidQuota = myBalance?.earned ?? 12;
  const sickPaidQuota = myBalance?.sick ?? 3;

  const myUsed = useMemo(() => {
    const approved = myLeaves.filter(r => r.status === 'Approved');
    return {
      Casual: approved.filter(r => r.type === 'Casual').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0),
      Sick:   approved.filter(r => r.type === 'Sick').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0),
      Earned: approved.filter(r => r.type === 'Earned').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0),
    };
  }, [myLeaves]);

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const myThisMonthUsed = useMemo(() => {
    const approvedThisMonth = myLeaves.filter(r => 
      r.status === 'Approved' && 
      ((r.fromDate && r.fromDate.startsWith(currentMonthStr)) || (r.toDate && r.toDate.startsWith(currentMonthStr)))
    );
    return {
      Casual: approvedThisMonth.filter(r => r.type === 'Casual').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0),
      Sick:   approvedThisMonth.filter(r => r.type === 'Sick').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0),
      Earned: approvedThisMonth.filter(r => r.type === 'Earned').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0),
    };
  }, [myLeaves, currentMonthStr]);

  const thisMonthRemainingEarned = Math.max(0, 1 - myThisMonthUsed.Earned);
  const thisMonthExtraEarned = Math.max(0, myThisMonthUsed.Earned - 1);

  const remainingSickPaidDays = Math.max(0, sickPaidQuota - myUsed.Sick);
  const extraSickDeductibleDays = Math.max(0, myUsed.Sick - sickPaidQuota);

  // Active requests (Approved + Pending) for quota validation during application
  const myActiveRequests = useMemo(() => {
    return myLeaves.filter(r => r.status === 'Approved' || r.status === 'Pending');
  }, [myLeaves]);

  // Selected month for date (from form.fromDate or current month)
  const selectedMonthStr = useMemo(() => {
    if (form.fromDate) return form.fromDate.slice(0, 7);
    return currentMonthStr;
  }, [form.fromDate, currentMonthStr]);

  const selectedMonthFormatted = useMemo(() => {
    try {
      const [yr, mo] = selectedMonthStr.split('-');
      const d = new Date(parseInt(yr), parseInt(mo) - 1, 1);
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return selectedMonthStr;
    }
  }, [selectedMonthStr]);

  // Sick Leave Quota Consumption
  const totalSickUsed = useMemo(() => {
    return myActiveRequests
      .filter(r => r.type === 'Sick')
      .reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0);
  }, [myActiveRequests]);

  const remainingSickPaid = Math.max(0, sickPaidQuota - totalSickUsed);
  const isSickConsumed = remainingSickPaid <= 0;

  // Earned Leave Quota Consumption
  const selectedMonthEarnedUsed = useMemo(() => {
    return myActiveRequests
      .filter(r =>
        r.type === 'Earned' &&
        ((r.fromDate && r.fromDate.startsWith(selectedMonthStr)) || (r.toDate && r.toDate.startsWith(selectedMonthStr)))
      )
      .reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0);
  }, [myActiveRequests, selectedMonthStr]);

  const totalEarnedUsed = useMemo(() => {
    return myActiveRequests
      .filter(r => r.type === 'Earned')
      .reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0);
  }, [myActiveRequests]);

  const remainingMonthEarned = Math.max(0, 1 - selectedMonthEarnedUsed);
  const remainingAnnualEarned = Math.max(0, earnedPaidQuota - totalEarnedUsed);
  const isEarnedConsumed = remainingMonthEarned <= 0 || remainingAnnualEarned <= 0;

  // Check if currently selected category in form.type is consumed
  const isCurrentCategoryConsumed = (form.type === 'Sick' && isSickConsumed) || (form.type === 'Earned' && isEarnedConsumed);

  const activeWarning = useMemo(() => {
    if (quotaWarning) return quotaWarning;
    if (form.type === 'Sick' && isSickConsumed) {
      return `Paid Sick Leave quota is exhausted! You have consumed all ${sickPaidQuota} paid Sick Leaves for this year (${totalSickUsed}/${sickPaidQuota} used). You cannot apply for Sick Leave. Please switch to Casual Leave (payroll-deductible).`;
    }
    if (form.type === 'Earned' && isEarnedConsumed) {
      return remainingAnnualEarned <= 0
        ? `Annual Paid Earned Leave quota is exhausted! You have consumed all ${earnedPaidQuota} paid Earned Leaves for this year (${totalEarnedUsed}/${earnedPaidQuota} used). Please switch to Casual Leave.`
        : `Paid Earned Leave quota is consumed for ${selectedMonthFormatted}! You have already used your 1 paid Earned Leave for this month (${selectedMonthEarnedUsed}/1 used). Earned leaves cannot be carry-forwarded (1 paid day/month). Please switch to Casual Leave.`;
    }
    return null;
  }, [quotaWarning, form.type, isSickConsumed, isEarnedConsumed, sickPaidQuota, totalSickUsed, remainingAnnualEarned, earnedPaidQuota, totalEarnedUsed, selectedMonthFormatted, selectedMonthEarnedUsed]);

  const handleSelectType = (t: LeaveType) => {
    if (t === 'Sick' && isSickConsumed) {
      setQuotaWarning(
        `Paid Sick Leave quota is exhausted! You have consumed all ${sickPaidQuota} paid Sick Leaves for this year (${totalSickUsed}/${sickPaidQuota} used). You cannot select Sick Leave. Please apply under Casual Leave (payroll-deductible).`
      );
      return;
    }

    if (t === 'Earned' && isEarnedConsumed) {
      const msg = remainingAnnualEarned <= 0
        ? `Annual Paid Earned Leave quota is exhausted! You have consumed all ${earnedPaidQuota} paid Earned Leaves for this year (${totalEarnedUsed}/${earnedPaidQuota} used). You cannot select Earned Leave. Please apply under Casual Leave.`
        : `Paid Earned Leave quota is consumed for ${selectedMonthFormatted}! You have already used your 1 paid Earned Leave for this month (${selectedMonthEarnedUsed}/1 used). Earned leaves cannot be carry-forwarded (1 paid day per month). You cannot select Earned Leave. Please apply under Casual Leave.`;
      setQuotaWarning(msg);
      return;
    }

    // If not consumed, select category and clear warning
    setQuotaWarning(null);
    setForm(f => ({ ...f, type: t }));
  };

  const handleApply = async () => {
    if (!form.fromDate || (!form.isHalfDay && !form.toDate) || !form.reason.trim() || !currentStaff) return;
    if (isCurrentCategoryConsumed) {
      setQuotaWarning(`Cannot submit: Paid quota for ${form.type} Leave is consumed. Please switch to Casual Leave.`);
      return;
    }
    const days = form.isHalfDay ? 0.5 : calcDays(form.fromDate, form.toDate || form.fromDate);
    const targetToDate = form.isHalfDay ? form.fromDate : form.toDate;
    await addLeaveRequest({
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      type: form.type,
      fromDate: form.fromDate,
      toDate: targetToDate,
      days,
      isHalfDay: form.isHalfDay,
      halfDaySession: form.isHalfDay ? form.halfDaySession : undefined,
      reason: form.reason.trim(),
      status: 'Pending',
      appliedOn: new Date().toISOString().slice(0, 10),
    });
    setForm(emptyForm());
    setQuotaWarning(null);
    setShowApply(false);
  };

  const handleCancel = async (id: string) => {
    await deleteLeaveRequest(id);
  };

  const handleApprove = async (req: LeaveRequest) => {
    // 1. Update leave status
    await updateLeaveRequest(req.id, {
      status: 'Approved',
      reviewedBy: currentUser?.name || currentUserRole || 'Admin',
      reviewedOn: new Date().toISOString().slice(0, 10),
      reviewNote: '',
    });

    // 2. Auto-create attendance records for each leave day (skip existing)
    const leaveDays: string[] = [];
    const cursor = new Date(req.fromDate + 'T00:00:00');
    const end = new Date((req.toDate || req.fromDate) + 'T00:00:00');
    while (cursor <= end) {
      leaveDays.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    const existing = new Set(attendance.filter((a: any) => (a.staffId || a.staff_id) === req.staffId).map((a: any) => a.date));
    const attStatus = req.isHalfDay ? `Half Day (${req.halfDaySession || '1st Half'})` : 'Leave';
    for (const d of leaveDays) {
      if (!existing.has(d)) {
        await addAttendance({ staffId: req.staffId, date: d, status: attStatus, checkIn: '', checkOut: '' });
      }
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    await updateLeaveRequest(rejectTarget.id, {
      status: 'Rejected',
      reviewedBy: currentUser?.name || currentUserRole || 'Admin',
      reviewedOn: new Date().toISOString().slice(0, 10),
      reviewNote: rejectNote.trim(),
    });
    setRejectTarget(null);
    setRejectNote('');
  };

  const balanceCards = [
    { 
      label: 'Earned (Paid)', 
      total: 1, 
      displayTotal: `${earnedPaidQuota} Days (1/Mo)`, 
      usedCount: myThisMonthUsed.Earned, 
      usedDisplay: thisMonthExtraEarned > 0 
        ? `${myThisMonthUsed.Earned} used this month (1 Paid, ${thisMonthExtraEarned} Deductible)` 
        : `${myThisMonthUsed.Earned} used this month (${myUsed.Earned} total this year)`, 
      remaining: `${thisMonthRemainingEarned} Left this Month`, 
      color: LEAVE_COLORS.Earned, 
      note: '1 Day / Month (No Carry Forward)' 
    },
    { 
      label: 'Sick Leave', 
      total: sickPaidQuota, 
      displayTotal: '3 Paid + As Needed', 
      usedCount: myUsed.Sick, 
      usedDisplay: extraSickDeductibleDays > 0 ? `${myUsed.Sick} used (${sickPaidQuota} Paid, ${extraSickDeductibleDays} Deductible)` : `${myUsed.Sick} used (${myUsed.Sick} Paid)`, 
      remaining: remainingSickPaidDays > 0 ? `${remainingSickPaidDays} Paid Left` : 'As Needed (Salary Deductible)', 
      color: LEAVE_COLORS.Sick, 
      note: '3 Paid Days / Yr (No Carry Forward)' 
    },
    { 
      label: 'Casual', 
      total: 0, 
      displayTotal: 'Available as Needed', 
      usedCount: myUsed.Casual, 
      usedDisplay: `${myUsed.Casual} used (${myThisMonthUsed.Casual} this month)`, 
      remaining: 'Available as Needed', 
      color: LEAVE_COLORS.Casual, 
      note: 'Payroll Deductible' 
    },
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
          {activeTab === 'my' && canApply && (
            <button
              onClick={() => { setForm(emptyForm()); setQuotaWarning(null); setShowApply(true); }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Apply for Leave
            </button>
          )}
        </div>
      </div>

      {/* Leave Policy Banner */}
      <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
            🌴
          </div>
          <div>
            <span className="font-bold text-emerald-950">Annual Leave Policy: </span>
            <span>Every employee gets <strong className="font-extrabold text-emerald-800">12 Paid Leaves</strong> per year (<strong className="font-extrabold text-emerald-800">1 per month, cannot be carry forwarded</strong>) and <strong className="font-extrabold text-emerald-800">3 Paid Sick Leaves</strong> per year (cannot be carry forwarded). Unused leaves lapse and cannot be accumulated. Additional sick leaves beyond 3 days, earned leaves beyond 1 per month, and casual leaves are available as needed and will be deducted from salary in payroll.</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${activeTab === 'my' ? 'bg-white/80 text-primary shadow-sm border border-white/80' : 'text-gray-500 hover:text-gray-800'}`}
        >
          My Leaves
        </button>
        {isAdminOrManager && (
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'all' ? 'bg-white/80 text-primary shadow-sm border border-white/80' : 'text-gray-500 hover:text-gray-800'}`}
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
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'balances' ? 'bg-white/80 text-primary shadow-sm border border-white/80' : 'text-gray-500 hover:text-gray-800'}`}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {balanceCards.map(card => {
              const pct = card.total > 0 ? (card.usedCount / card.total) * 100 : 0;
              return (
                <div key={card.label} className="glass-panel border border-white/60 rounded-2xl p-5 bg-white/40 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${card.color.bg} ${card.color.text}`}>{card.label}</span>
                    <span className="text-xs text-gray-400 font-semibold">{card.note}</span>
                  </div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className={typeof card.remaining === 'number' ? "text-3xl font-black text-gray-800" : "text-lg font-bold text-gray-800"}>{card.remaining}</span>
                    {typeof card.remaining === 'number' && (
                      <span className="text-sm text-gray-400 font-semibold mb-1">remaining</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${card.color.bg.replace('bg-', 'bg-').replace('-50', '-400')}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 font-semibold">{card.usedDisplay}</p>
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${lc.bg} ${lc.text} ${lc.border}`}>{req.type}</span>
                              {req.isHalfDay && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  ½ Day ({req.halfDaySession || '1st Half'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-700">{req.fromDate}</td>
                          <td className="py-4 px-6 font-semibold text-gray-700">{req.toDate}</td>
                          <td className="py-4 px-6 text-center font-black text-gray-800">{req.days !== undefined ? req.days : 1}</td>
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${lc.bg} ${lc.text} ${lc.border}`}>{req.type}</span>
                              {req.isHalfDay && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  ½ Day ({req.halfDaySession || '1st Half'})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-600">
                            {req.fromDate === req.toDate ? req.fromDate : `${req.fromDate} → ${req.toDate}`}
                          </td>
                          <td className="py-4 px-6 text-center font-black text-gray-800">{req.days !== undefined ? req.days : 1}</td>
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
                              (canApproveReject && !((req.staffId || (req as any).staff_id) === currentStaff?.id && currentUserRole === 'Manager')) ? (
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
                              ) : (
                                <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  {(req.staffId || (req as any).staff_id) === currentStaff?.id && currentUserRole === 'Manager' ? 'Pending Admin Review' : 'Pending Review'}
                                </span>
                              )
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
              Edit each employee's annual Paid Leave allocation (12 Earned Leaves, 1 per month - cannot be carry forwarded) &amp; Paid Sick Leave allocation (3 Sick Leaves - cannot be carry forwarded). Casual leaves and extra leaves are payroll-deductible.
            </p>
            <button
              onClick={() => {
                setLeaveBalances(prev => prev.map(b => ({ ...b, casual: 0, sick: 3, earned: 12 })));
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All to Default (12 Earned, 3 Sick)
            </button>
          </div>

          <div className="glass-panel border border-white/60 rounded-[2rem] bg-white/40 backdrop-blur-md overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase tracking-widest bg-gray-50/40">
                  <th className="py-3 px-6">Employee</th>
                  <th className="py-3 px-6 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">Earned (1/Mo - No Carry Fwd)</span>
                  </th>
                  <th className="py-3 px-6 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold">Sick (3 Paid/Yr)</span>
                  </th>
                  <th className="py-3 px-6 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold">Casual (As Needed)</span>
                  </th>
                  <th className="py-3 px-6 text-center text-gray-400">Used (Earned / Sick / Casual)</th>
                  <th className="py-3 px-6 text-center text-gray-400">Remaining Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80">
                {staff.map(emp => {
                  const bal = leaveBalances.find(b => b.staffId === emp.id) ?? { staffId: emp.id, casual: 0, sick: 3, earned: 12 };
                  const approved = leaveRequests.filter(r => r.staffId === emp.id && r.status === 'Approved');
                  const usedC = approved.filter(r => r.type === 'Casual').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0);
                  const usedS = approved.filter(r => r.type === 'Sick').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0);
                  const usedE = approved.filter(r => r.type === 'Earned').reduce((s, r) => s + (r.days !== undefined ? r.days : 1), 0);

                  const earnedQuota = bal.earned ?? 12;
                  const sickQuota = bal.sick ?? 3;
                  const remainingEarned = Math.max(0, earnedQuota - usedE);
                  const remainingSick = Math.max(0, sickQuota - usedS);
                  const extraSick = Math.max(0, usedS - sickQuota);

                  const updateBal = (field: 'casual' | 'sick' | 'earned', value: number) => {
                    setLeaveBalances(prev => {
                      const idx = prev.findIndex(b => b.staffId === emp.id);
                      if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = { ...next[idx], [field]: Math.max(0, value) };
                        return next;
                      }
                      return [...prev, { staffId: emp.id, casual: 0, sick: 3, earned: 12, [field]: Math.max(0, value) }];
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
                      {/* Earned Paid Quota Input */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="number"
                          min={0}
                          value={bal.earned ?? 12}
                          onChange={e => updateBal('earned', parseInt(e.target.value) || 0)}
                          className="w-16 text-center bg-emerald-50/60 border border-emerald-100 rounded-lg px-2 py-1 text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 transition-all"
                        />
                      </td>
                      {/* Sick Paid Quota Input */}
                      <td className="py-4 px-6 text-center">
                        <input
                          type="number"
                          min={0}
                          value={bal.sick ?? 3}
                          onChange={e => updateBal('sick', parseInt(e.target.value) || 0)}
                          className="w-16 text-center bg-rose-50/60 border border-rose-100 rounded-lg px-2 py-1 text-sm font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 transition-all"
                        />
                      </td>
                      {/* Casual */}
                      <td className="py-4 px-6 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                          As Needed (Deductible)
                        </span>
                      </td>
                      {/* Used Days */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2 text-[11px] font-bold">
                          <span className="text-emerald-600" title="Earned Leaves">{usedE} E</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-rose-500" title="Sick Leaves">{usedS} S</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-blue-500" title="Casual Leaves">{usedC} C</span>
                        </div>
                      </td>
                      {/* Remaining Paid */}
                      <td className="py-4 px-6 text-center font-extrabold text-xs">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={remainingEarned < 2 ? 'text-amber-600' : 'text-emerald-600'}>
                            {remainingEarned} Earned Paid
                          </span>
                          <span className={remainingSick === 0 ? 'text-rose-500' : 'text-emerald-600'}>
                            {remainingSick > 0 ? `${remainingSick} Sick Paid` : `${extraSick} Extra Sick (Deductible)`}
                          </span>
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
            Standard Paid Quotas: <strong className="text-gray-700">1 Paid Leave per month</strong> (12/year, cannot be carry forwarded) &amp; <strong className="text-gray-700">3 Paid Sick Leaves</strong> per year (cannot be carry forwarded). Additional sick leaves beyond 3 days, earned leaves beyond 1 per month, and casual leaves are deducted from payroll.
          </p>
        </div>
      )}

      {/* ══════════ APPLY MODAL ══════════ */}
      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeApplyModal} />
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/50 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Apply for Leave</h2>
                <p className="text-xs text-gray-500 mt-0.5">Select category and dates to submit your leave request</p>
              </div>
              <button onClick={closeApplyModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Leave Type */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Leave Category</label>
                  <span className="text-[11px] text-gray-400 font-medium">Click to select</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['Casual', 'Sick', 'Earned'] as LeaveType[]).map(t => {
                    const lc = LEAVE_COLORS[t];
                    const isSelected = form.type === t;
                    const isConsumed = (t === 'Sick' && isSickConsumed) || (t === 'Earned' && isEarnedConsumed);

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectType(t)}
                        className={`relative p-2.5 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-between gap-1.5 cursor-pointer ${
                          isConsumed 
                            ? 'border-dashed border-rose-300/80 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-400 text-gray-500' 
                            : isSelected 
                              ? `${lc.bg} ${lc.text} ${lc.border} shadow-sm ring-2 ring-primary/20` 
                              : 'border-gray-200/70 bg-white/60 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        title={isConsumed ? `Paid ${t} leaves consumed. Click to view warning.` : undefined}
                      >
                        <div className="flex items-center gap-1.5">
                          {isConsumed && <Lock className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                          <span className={`text-xs font-bold ${isConsumed ? 'text-gray-700' : isSelected ? lc.text : 'text-gray-800'}`}>
                            {t}
                          </span>
                        </div>

                        {/* Quota Indicator */}
                        {t === 'Casual' && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                            Deductible
                          </span>
                        )}
                        {t === 'Sick' && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSickConsumed 
                              ? 'text-rose-700 bg-rose-100/90' 
                              : 'text-emerald-700 bg-emerald-100/80'
                          }`}>
                            {isSickConsumed ? '0 Left · Consumed' : `${remainingSickPaid} Paid Left`}
                          </span>
                        )}
                        {t === 'Earned' && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isEarnedConsumed 
                              ? 'text-rose-700 bg-rose-100/90' 
                              : 'text-emerald-700 bg-emerald-100/80'
                          }`}>
                            {isEarnedConsumed ? '0 Left · Consumed' : `${remainingMonthEarned} Paid Left`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Quota Consumed Warning Alert Banner */}
                {activeWarning && (
                  <div className="mt-3 p-3.5 bg-rose-50/95 border border-rose-200 rounded-2xl flex items-start gap-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-rose-600">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-rose-900">
                          Paid Quota Consumed
                        </h4>
                        {quotaWarning && (
                          <button
                            type="button"
                            onClick={() => setQuotaWarning(null)}
                            className="text-rose-400 hover:text-rose-700 p-0.5 rounded-md hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Dismiss warning"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-rose-700 leading-relaxed mt-1">
                        {activeWarning}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, type: 'Casual' }));
                          setQuotaWarning(null);
                        }}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        Switch to Casual Leave (Payroll-Deductible) →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Leave Duration Mode: Full Day vs Half Day */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Duration Mode</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100/70 p-1 rounded-xl border border-gray-200/60">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isHalfDay: false }))}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${!form.isHalfDay ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Full Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isHalfDay: true, toDate: f.fromDate }))}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${form.isHalfDay ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    ½ Half Day (0.5)
                  </button>
                </div>
              </div>

              {/* Half Day Session Selection */}
              {form.isHalfDay && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                  <label className="block text-[11px] font-bold text-purple-900 uppercase tracking-wider">Select Half Day Session</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, halfDaySession: 'First Half' }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${form.halfDaySession === 'First Half' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100/50'}`}
                    >
                      🌅 First Half (Morning)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, halfDaySession: 'Second Half' }))}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${form.halfDaySession === 'Second Half' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-100/50'}`}
                    >
                      🌇 Second Half (Afternoon)
                    </button>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{form.isHalfDay ? 'Leave Date' : 'From Date'}</label>
                  <input
                    type="date"
                    value={form.fromDate}
                    onChange={e => setForm(f => ({ ...f, fromDate: e.target.value, toDate: f.isHalfDay ? e.target.value : (f.toDate < e.target.value ? e.target.value : f.toDate) }))}
                    className="w-full px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 font-medium"
                  />
                </div>
                {!form.isHalfDay && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To Date</label>
                    <input
                      type="date"
                      value={form.toDate}
                      min={form.fromDate}
                      onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Days preview & Quota Notice */}
              {form.fromDate && (form.isHalfDay || form.toDate) && (
                <div className="space-y-2">
                  <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Total Duration</span>
                    <span className="text-sm font-black text-primary">
                      {form.isHalfDay ? `0.5 Day (${form.halfDaySession})` : `${calcDays(form.fromDate, form.toDate)} Day${calcDays(form.fromDate, form.toDate) > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Informative notice if requested days exceed remaining paid balance */}
                  {!isCurrentCategoryConsumed && (() => {
                    const days = form.isHalfDay ? 0.5 : calcDays(form.fromDate, form.toDate || form.fromDate);
                    if (form.type === 'Earned' && days > remainingMonthEarned && remainingMonthEarned > 0) {
                      return (
                        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>
                            <strong>Notice:</strong> You have {remainingMonthEarned} paid Earned Leave left for {selectedMonthFormatted}. The remaining {days - remainingMonthEarned} day(s) will be payroll-deductible.
                          </span>
                        </div>
                      );
                    }
                    if (form.type === 'Sick' && days > remainingSickPaid && remainingSickPaid > 0) {
                      return (
                        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>
                            <strong>Notice:</strong> You have {remainingSickPaid} paid Sick Leave(s) left. The remaining {days - remainingSickPaid} day(s) will be payroll-deductible.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
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
            <div className="p-4 sm:p-6 border-t border-gray-200/50 bg-gray-50/50 flex justify-end gap-3 flex-shrink-0">
              <button onClick={closeApplyModal} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!form.fromDate || (!form.isHalfDay && !form.toDate) || !form.reason.trim() || isCurrentCategoryConsumed}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${
                  isCurrentCategoryConsumed 
                    ? 'bg-rose-600/80 text-white cursor-not-allowed opacity-75 shadow-rose-500/20' 
                    : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
                }`}
              >
                {isCurrentCategoryConsumed ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Paid Quota Consumed
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ REJECT MODAL ══════════ */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRejectTarget(null)} />
          <div className="relative bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl w-full max-w-sm max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/50 flex-shrink-0">
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
            <div className="p-4 sm:p-6 border-t border-gray-200/50 bg-gray-50/50 flex justify-end gap-3 flex-shrink-0">
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
