import { useState, useMemo } from 'react';
import { Search, Calculator, IndianRupee, FileText, X, CheckCircle, Calendar } from 'lucide-react';
import { useData } from '../context/DataContext';
import { SearchableSelect } from './SearchableSelect';

export function PayrollPage() {
  const { 
    staff, 
    attendance, 
    payroll, 
    setPayroll, 
    addPayroll, 
    updatePayroll: apiUpdatePayroll, 
    holidays, 
    currentUserRole, 
    hasPermission, 
    leaveRequests, 
    leaveBalances 
  } = useData();
  const canManagePayroll = hasPermission(currentUserRole, 'Manage Payroll');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);

  // Deduction Breakdown & Note Modal State
  const [deductionModalData, setDeductionModalData] = useState<{
    staffId: string;
    name: string;
    role: string;
    baseSalary: number;
    month: string;
    workingDays: number;
    perDaySalary: number;
    currentDeduction: number;
    calculatedDeductions: number;
    deductionReason: string;
    deductionBreakdown: any[];
    autoDeductionNote: string;
  } | null>(null);
  const [modalDeductionAmount, setModalDeductionAmount] = useState<number>(0);
  const [modalDeductionReason, setModalDeductionReason] = useState<string>('');

  const openDeductionModal = (data: any) => {
    setDeductionModalData(data);
    setModalDeductionAmount(data.currentDeduction !== undefined ? data.currentDeduction : (data.calculatedDeductions || 0));
    setModalDeductionReason(data.deductionReason || '');
  };

  const handleSaveDeductionModal = async () => {
    if (!deductionModalData) return;
    const staffId = deductionModalData.staffId;
    const targetMonth = deductionModalData.month;
    const newAmt = Math.max(0, modalDeductionAmount);
    const newReason = modalDeductionReason.trim();

    await updatePayroll(staffId, {
      deductions: newAmt,
      deductionReason: newReason,
      deduction_reason: newReason
    }, targetMonth);

    if (selectedPayslip && (selectedPayslip.id === staffId || selectedPayslip.staffId === staffId)) {
      setSelectedPayslip((prev: any) => {
        if (!prev) return null;
        const newBreakdown = [
          ...(prev.deductionBreakdown || []).filter((item: any) => item.category !== 'manual'),
          ...(newReason ? [{
            id: 'ded-manual-reason',
            category: 'manual',
            title: 'Deduction Note',
            reason: newReason
          }] : [])
        ];
        return {
          ...prev,
          deductions: newAmt,
          netPay: (prev.basic || prev.baseSalary) - newAmt,
          deductionReason: newReason,
          deductionBreakdown: newBreakdown
        };
      });
    }

    setDeductionModalData(null);
  };

  // Payment Account Confirmation Modal State
  const [payAccountModalData, setPayAccountModalData] = useState<{ 
    staffId: string; 
    name: string; 
    role: string; 
    netPay: number;
    targetMonth?: string;
  } | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<'Current' | 'Savings'>('Current');

  // Filter mode: Monthly or Yearly
  const [filterMode, setFilterMode] = useState<'monthly' | 'yearly'>('monthly');

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
  };
  
  // Default to current month, format YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedFY, setSelectedFY] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return String(m >= 4 ? y : y - 1);
  });

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getFYStartYearFromMonth = (yearMonth: string) => {
    const [yearStr, monthStr] = yearMonth.split('-');
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    return m >= 4 ? y : y - 1;
  };

  const getFYLabel = (startYear: number | string) => {
    const y = parseInt(String(startYear), 10);
    const nextShort = String((y + 1) % 100).padStart(2, '0');
    return `FY ${y}-${nextShort}`;
  };

  const getFYMonths = (startYear: number) => {
    const list: { monthKey: string; monthName: string; yearNum: number; displayMonth: string }[] = [];
    for (let m = 4; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      list.push({
        monthKey: `${startYear}-${mm}`,
        monthName: MONTH_NAMES[m - 1],
        yearNum: startYear,
        displayMonth: `${MONTH_NAMES[m - 1]} ${startYear}`
      });
    }
    for (let m = 1; m <= 3; m++) {
      const mm = String(m).padStart(2, '0');
      list.push({
        monthKey: `${startYear + 1}-${mm}`,
        monthName: MONTH_NAMES[m - 1],
        yearNum: startYear + 1,
        displayMonth: `${MONTH_NAMES[m - 1]} ${startYear + 1}`
      });
    }
    return list;
  };

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    if (val) {
      setSelectedFY(String(getFYStartYearFromMonth(val)));
    }
  };

  const handleFYChange = (fyStartStr: string) => {
    setSelectedFY(fyStartStr);
    const fyStart = parseInt(fyStartStr, 10);
    if (getFYStartYearFromMonth(selectedMonth) !== fyStart) {
      setSelectedMonth(`${fyStart}-04`);
    }
  };

  const availableFYs = useMemo(() => {
    const fyears = new Set<number>();
    const d = new Date();
    const curFY = (d.getMonth() + 1) >= 4 ? d.getFullYear() : d.getFullYear() - 1;
    for (let y = curFY - 4; y <= curFY; y++) {
      fyears.add(y);
    }
    payroll.forEach(p => {
      if (p.month) {
        const fy = getFYStartYearFromMonth(p.month);
        if (fy <= curFY) fyears.add(fy);
      }
    });
    attendance.forEach(a => {
      if (a.date) {
        const [yStr, mStr] = a.date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        const fy = m >= 4 ? y : y - 1;
        if (fy <= curFY) fyears.add(fy);
      }
    });
    return Array.from(fyears).filter(y => y <= curFY).sort((a, b) => b - a);
  }, [payroll, attendance]);

  const getDaysInMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const getLeaveDates = (fromDate: string, toDate?: string): string[] => {
    const dates: string[] = [];
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date((toDate || fromDate) + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [fromDate];
    }
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const formatShortDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${months[m] || ''}`;
    }
    return dStr;
  };

  // Helper to compute a single employee's monthly payroll stats
  const calculateStaffMonth = (emp: any, targetMonth: string) => {
    const targetFYStart = getFYStartYearFromMonth(targetMonth);
    const fyStartDate = `${targetFYStart}-04-01`;
    const fyEndDate = `${targetFYStart + 1}-03-31`;
    const holidaysInMonth = holidays.filter(h => h.date.startsWith(targetMonth)).length;
    const record = payroll.find(p => (p.staffId === emp.id || p.staff_id === emp.id) && p.month === targetMonth);

    const bal = leaveBalances?.find(b => (b.staffId === emp.id || (b as any).staff_id === emp.id)) ?? { staffId: emp.id, casual: 0, sick: 3, earned: 12 };
    const sickQuota = bal.sick ?? 3;

    // Approved leaves for this employee in the Financial Year (FY)
    const empApprovedLeaves = (leaveRequests || []).filter(r =>
      (r.staffId === emp.id || (r as any).staff_id === emp.id) &&
      r.status === 'Approved' &&
      ((r.fromDate && r.fromDate >= fyStartDate && r.fromDate <= fyEndDate) ||
       (r.toDate && r.toDate >= fyStartDate && r.toDate <= fyEndDate))
    );

    interface LeaveDaySegment {
      date: string;
      type: 'Casual' | 'Sick' | 'Earned';
      weight: number;
      leaveReq: any;
    }
    const allLeaveDays: LeaveDaySegment[] = [];
    empApprovedLeaves.forEach(r => {
      const dates = getLeaveDates(r.fromDate, r.toDate);
      if (dates.length === 0) return;
      if (r.isHalfDay) {
        if (dates[0] >= fyStartDate && dates[0] <= fyEndDate) {
          allLeaveDays.push({ date: dates[0], type: r.type, weight: 0.5, leaveReq: r });
        }
      } else {
        dates.forEach(d => {
          if (d >= fyStartDate && d <= fyEndDate) {
            allLeaveDays.push({ date: d, type: r.type, weight: 1.0, leaveReq: r });
          }
        });
      }
    });
    allLeaveDays.sort((a, b) => a.date.localeCompare(b.date));

    // 1 day per month earned leave quota (no carry forward)
    const monthlyEarnedQuota = Math.max(1, (bal.earned ?? 12) / 12);
    const earnedDaysInMonth = allLeaveDays
      .filter(seg => seg.type === 'Earned' && seg.date.startsWith(targetMonth))
      .reduce((sum, seg) => sum + seg.weight, 0);

    const paidEarnedInMonth = Math.min(earnedDaysInMonth, monthlyEarnedQuota);
    const deductibleEarnedInMonth = Math.max(0, earnedDaysInMonth - monthlyEarnedQuota);

    // Sick leaves: 3 paid per year (no carry forward)
    let cumulativeSick = 0;
    let deductibleSickInMonth = 0;
    let paidSickInMonth = 0;
    let deductibleCasualInMonth = 0;

    const approvedLeaveDatesThisMonth = new Set<string>();

    allLeaveDays.forEach(seg => {
      const isInTargetMonth = seg.date.startsWith(targetMonth);
      if (isInTargetMonth) {
        approvedLeaveDatesThisMonth.add(seg.date);
      }

      if (seg.type === 'Sick') {
        const prev = cumulativeSick;
        cumulativeSick += seg.weight;
        if (isInTargetMonth) {
          if (cumulativeSick <= sickQuota) {
            paidSickInMonth += seg.weight;
          } else if (prev < sickQuota) {
            paidSickInMonth += (sickQuota - prev);
            deductibleSickInMonth += (cumulativeSick - sickQuota);
          } else {
            deductibleSickInMonth += seg.weight;
          }
        }
      } else if (seg.type === 'Casual') {
        if (isInTargetMonth) {
          deductibleCasualInMonth += seg.weight;
        }
      }
    });

    const totalDeductibleLeaveDays = deductibleSickInMonth + deductibleCasualInMonth + deductibleEarnedInMonth;
    const totalPaidLeaveDays = paidEarnedInMonth + paidSickInMonth;

    let daysPresent = 0;
    let daysAbsent = 0;
    let daysHalf = 0;
    let daysLeave = 0;
    let latePenalties = 0;
    const absentDates: string[] = [];
    const halfDayDates: string[] = [];
    const penaltyItems: { date: string; amount: number; note?: string }[] = [];

    const monthRecords = attendance.filter(a => (a.staffId || a.staff_id) === emp.id && a.date.startsWith(targetMonth));
    
    monthRecords.forEach(r => {
      if (r.status === 'Present') daysPresent++;
      if (r.status === 'Absent') {
        if (!approvedLeaveDatesThisMonth.has(r.date)) {
          daysAbsent++;
          absentDates.push(r.date);
        }
      }
      if (r.status === 'Half Day' || r.status?.startsWith?.('Half Day')) {
        if (!approvedLeaveDatesThisMonth.has(r.date)) {
          daysHalf++;
          halfDayDates.push(r.date);
        }
      }
      if (r.status === 'Leave') daysLeave++;
      const penAmt = (r.penaltyAmount || r.penalty_amount || 0);
      if (penAmt > 0) {
        latePenalties += penAmt;
        penaltyItems.push({ date: r.date, amount: penAmt, note: r.warningNote || r.warning_note });
      }
    });

    const daysInMonth = getDaysInMonth(targetMonth);
    const workingDays = Math.max(1, daysInMonth - holidaysInMonth);
    const perDaySalary = emp.baseSalary / workingDays;
    
    const leaveDeductions = totalDeductibleLeaveDays * perDaySalary;
    const attendanceDeductions = (daysAbsent * perDaySalary) + (daysHalf * (perDaySalary / 2)) + latePenalties;
    const calculatedDeductions = Math.round(attendanceDeductions + leaveDeductions);
    const calculatedNet = Math.max(0, emp.baseSalary - calculatedDeductions);

    // Build itemized deduction breakdown
    interface DeductionItem {
      id: string;
      category: 'absence' | 'half_day' | 'penalty' | 'leave' | 'manual';
      title: string;
      dates?: string;
      days?: number;
      amount?: number;
      reason?: string;
    }
    const deductionBreakdown: DeductionItem[] = [];
    const autoNoteParts: string[] = [];

    // 1. Absences
    if (daysAbsent > 0) {
      const amt = Math.round(daysAbsent * perDaySalary);
      const dStr = absentDates.map(formatShortDate).join(', ');
      deductionBreakdown.push({
        id: 'ded-absence',
        category: 'absence',
        title: `Unapproved Absence (${daysAbsent} ${daysAbsent === 1 ? 'day' : 'days'})`,
        dates: dStr,
        days: daysAbsent,
        amount: amt,
        reason: 'Absent without approved leave'
      });
      autoNoteParts.push(`${daysAbsent}d Absent (${dStr})`);
    }

    // 2. Half Days
    if (daysHalf > 0) {
      const amt = Math.round(daysHalf * (perDaySalary / 2));
      const dStr = halfDayDates.map(formatShortDate).join(', ');
      deductionBreakdown.push({
        id: 'ded-halfday',
        category: 'half_day',
        title: `Half Day Attendance (${daysHalf} ${daysHalf === 1 ? 'day' : 'days'})`,
        dates: dStr,
        days: daysHalf * 0.5,
        amount: amt,
        reason: 'Half day attendance deduction'
      });
      autoNoteParts.push(`${daysHalf} Half Day (${dStr})`);
    }

    // 3. Late Arrival Penalties
    if (latePenalties > 0) {
      const dStr = penaltyItems.map(p => formatShortDate(p.date)).join(', ');
      deductionBreakdown.push({
        id: 'ded-penalty',
        category: 'penalty',
        title: `Late Arrival Penalties (${penaltyItems.length})`,
        dates: dStr,
        amount: Math.round(latePenalties),
        reason: penaltyItems.map(p => p.note).filter(Boolean).join('; ') || 'Late check-in deduction'
      });
      autoNoteParts.push(`Late Fine (₹${Math.round(latePenalties)})`);
    }

    // 4. Deductible Leaves in this month
    const leavesInMonth = empApprovedLeaves.filter(r => {
      const dates = getLeaveDates(r.fromDate, r.toDate);
      return dates.some(d => d.startsWith(targetMonth));
    });

    // Casual leaves
    if (deductibleCasualInMonth > 0) {
      const casuals = leavesInMonth.filter(r => r.type === 'Casual');
      casuals.forEach((r, idx) => {
        const inMonthDates = getLeaveDates(r.fromDate, r.toDate).filter(d => d.startsWith(targetMonth));
        const days = r.isHalfDay ? 0.5 : inMonthDates.length;
        const amt = Math.round(days * perDaySalary);
        const dStr = inMonthDates.map(formatShortDate).join(', ');
        deductionBreakdown.push({
          id: `ded-casual-${r.id || idx}`,
          category: 'leave',
          title: `Casual Leave (${days} ${days === 1 ? 'day' : 'days'})`,
          dates: dStr,
          days,
          amount: amt,
          reason: r.reason || 'Casual Leave'
        });
        autoNoteParts.push(`Casual: ${r.reason || 'Leave'} (${dStr})`);
      });
    }

    // Sick leaves beyond quota
    if (deductibleSickInMonth > 0) {
      const sicks = leavesInMonth.filter(r => r.type === 'Sick');
      sicks.forEach((r, idx) => {
        const inMonthDates = getLeaveDates(r.fromDate, r.toDate).filter(d => d.startsWith(targetMonth));
        const dStr = inMonthDates.map(formatShortDate).join(', ');
        const amt = Math.round(deductibleSickInMonth * perDaySalary);
        deductionBreakdown.push({
          id: `ded-sick-${r.id || idx}`,
          category: 'leave',
          title: `Sick Leave beyond annual 3-day quota (${deductibleSickInMonth}d)`,
          dates: dStr,
          days: deductibleSickInMonth,
          amount: amt,
          reason: r.reason || 'Sick Leave'
        });
        autoNoteParts.push(`Sick beyond quota: ${r.reason || 'Leave'} (${dStr})`);
      });
    }

    // Earned leaves beyond monthly quota
    if (deductibleEarnedInMonth > 0) {
      const earneds = leavesInMonth.filter(r => r.type === 'Earned');
      earneds.forEach((r, idx) => {
        const inMonthDates = getLeaveDates(r.fromDate, r.toDate).filter(d => d.startsWith(targetMonth));
        const dStr = inMonthDates.map(formatShortDate).join(', ');
        const amt = Math.round(deductibleEarnedInMonth * perDaySalary);
        deductionBreakdown.push({
          id: `ded-earned-${r.id || idx}`,
          category: 'leave',
          title: `Earned Leave beyond monthly 1-day quota (${deductibleEarnedInMonth}d)`,
          dates: dStr,
          days: deductibleEarnedInMonth,
          amount: amt,
          reason: r.reason || 'Earned Leave'
        });
        autoNoteParts.push(`Earned beyond quota: ${r.reason || 'Leave'} (${dStr})`);
      });
    }

    // 5. Check manual adjustment / note
    const manualDeductionReason = record?.deductionReason || record?.deduction_reason || '';
    const currentDeductions = record?.deductions !== undefined ? record.deductions : calculatedDeductions;
    const manualDiff = currentDeductions - calculatedDeductions;

    if (manualDeductionReason) {
      deductionBreakdown.push({
        id: 'ded-manual-reason',
        category: 'manual',
        title: manualDiff !== 0 ? `Manual Adjustment (${manualDiff > 0 ? '+' : ''}₹${manualDiff.toLocaleString()})` : 'Deduction Note',
        amount: manualDiff !== 0 ? manualDiff : undefined,
        reason: manualDeductionReason
      });
    } else if (manualDiff !== 0) {
      deductionBreakdown.push({
        id: 'ded-manual-diff',
        category: 'manual',
        title: manualDiff > 0 ? `Manual Extra Deduction (+₹${manualDiff.toLocaleString()})` : `Manual Deduction Discount (-₹${Math.abs(manualDiff).toLocaleString()})`,
        amount: manualDiff,
        reason: manualDiff > 0 ? 'Custom deduction added manually' : 'Deduction discounted manually'
      });
    }

    const autoDeductionNote = autoNoteParts.join(' • ');

    return {
      month: targetMonth,
      payrollId: record?.id || null,
      basic: record?.basic !== undefined ? record.basic : (record?.salary !== undefined ? record.salary : emp.baseSalary),
      deductions: currentDeductions,
      calculatedDeductions,
      manualDiff,
      netPay: record?.netPay !== undefined ? record.netPay : (record?.net_salary !== undefined ? record.net_salary : (record ? ((record.basic ?? emp.baseSalary) - currentDeductions) : calculatedNet)),
      status: record?.status || 'Pending',
      paymentAccount: record?.paymentAccount || (record?.account_type === 'Savings A/c' ? 'Savings' : 'Current'),
      deductionReason: manualDeductionReason,
      autoDeductionNote,
      deductionBreakdown,
      perDaySalary,
      stats: { 
        daysPresent, 
        daysAbsent, 
        daysHalf, 
        daysLeave, 
        paidLeaveDays: totalPaidLeaveDays,
        unpaidLeaveDays: totalDeductibleLeaveDays,
        deductibleSickDays: deductibleSickInMonth,
        deductibleCasualDays: deductibleCasualInMonth,
        deductibleEarnedDays: deductibleEarnedInMonth,
      },
      workingDays,
      holidaysInMonth,
      daysInMonth,
    };
  };

  const displayedPayroll = useMemo(() => {
    if (filterMode === 'monthly') {
      return staff.map(emp => {
        const m = calculateStaffMonth(emp, selectedMonth);
        return {
          ...emp,
          mode: 'monthly',
          ...m,
        };
      }).filter(emp => {
        const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'All'
          || (filterStatus === 'Pending' && emp.status === 'Pending')
          || (filterStatus === 'Paid' && emp.status === 'Paid')
          || (filterStatus === 'Current' && emp.status === 'Paid' && emp.paymentAccount === 'Current')
          || (filterStatus === 'Savings' && emp.status === 'Paid' && emp.paymentAccount === 'Savings');
        return matchSearch && matchStatus;
      });
    }

    // Financial Year (FY) Filter Mode
    const fyStartNum = parseInt(selectedFY, 10);
    const fyMonthsList = getFYMonths(fyStartNum);
    const fyLabel = getFYLabel(selectedFY);
    const fyStartDate = `${fyStartNum}-04-01`;
    const fyEndDate = `${fyStartNum + 1}-03-31`;
    const holidaysInYear = holidays.filter(h => h.date >= fyStartDate && h.date <= fyEndDate).length;

    return staff.map(emp => {
      const monthDataList = fyMonthsList.map(mItem => ({
        ...calculateStaffMonth(emp, mItem.monthKey),
        monthName: mItem.monthName,
        displayMonth: mItem.displayMonth,
        yearNum: mItem.yearNum,
      }));

      const annualBasic = monthDataList.reduce((sum, m) => sum + m.basic, 0);
      const annualDeductions = monthDataList.reduce((sum, m) => sum + m.deductions, 0);
      const annualNetPay = monthDataList.reduce((sum, m) => sum + m.netPay, 0);

      const daysPresent = monthDataList.reduce((sum, m) => sum + m.stats.daysPresent, 0);
      const daysAbsent = monthDataList.reduce((sum, m) => sum + m.stats.daysAbsent, 0);
      const daysHalf = monthDataList.reduce((sum, m) => sum + m.stats.daysHalf, 0);
      const daysLeave = monthDataList.reduce((sum, m) => sum + m.stats.daysLeave, 0);
      const paidLeaveDays = monthDataList.reduce((sum, m) => sum + m.stats.paidLeaveDays, 0);
      const unpaidLeaveDays = monthDataList.reduce((sum, m) => sum + m.stats.unpaidLeaveDays, 0);
      const deductibleSickDays = monthDataList.reduce((sum, m) => sum + m.stats.deductibleSickDays, 0);
      const deductibleCasualDays = monthDataList.reduce((sum, m) => sum + m.stats.deductibleCasualDays, 0);
      const deductibleEarnedDays = monthDataList.reduce((sum, m) => sum + m.stats.deductibleEarnedDays, 0);

      const paidMonths = monthDataList.filter(m => m.status === 'Paid');
      const paidMonthsCount = paidMonths.length;
      const currentPaid = paidMonths.filter(m => m.paymentAccount === 'Current').reduce((sum, m) => sum + m.netPay, 0);
      const savingsPaid = paidMonths.filter(m => m.paymentAccount === 'Savings').reduce((sum, m) => sum + m.netPay, 0);

      const status = paidMonthsCount === 12 ? 'Paid' : paidMonthsCount === 0 ? 'Pending' : 'Partial';

      return {
        ...emp,
        mode: 'yearly',
        fy: selectedFY,
        fyLabel,
        year: fyLabel,
        basic: annualBasic,
        deductions: annualDeductions,
        netPay: annualNetPay,
        status,
        paidMonthsCount,
        totalMonthsCount: 12,
        currentPaid,
        savingsPaid,
        monthDataList,
        stats: {
          daysPresent,
          daysAbsent,
          daysHalf,
          daysLeave,
          paidLeaveDays,
          unpaidLeaveDays,
          deductibleSickDays,
          deductibleCasualDays,
          deductibleEarnedDays,
        },
        holidaysInYear,
      };
    }).filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All'
        || (filterStatus === 'Pending' && emp.paidMonthsCount < 12)
        || (filterStatus === 'Paid' && emp.paidMonthsCount === 12)
        || (filterStatus === 'Current' && (emp.currentPaid || 0) > 0)
        || (filterStatus === 'Savings' && (emp.savingsPaid || 0) > 0);
      return matchSearch && matchStatus;
    });
  }, [staff, attendance, payroll, holidays, leaveRequests, leaveBalances, selectedMonth, selectedFY, filterMode, searchTerm, filterStatus]);

  const payrollSummary = useMemo(() => {
    let currentAccountPaid = 0;
    let savingsAccountPaid = 0;
    let pendingPaid = 0;
    let totalPaid = 0;

    if (filterMode === 'monthly') {
      displayedPayroll.forEach(emp => {
        if (emp.status === 'Paid') {
          totalPaid += emp.netPay;
          if (emp.paymentAccount === 'Savings') {
            savingsAccountPaid += emp.netPay;
          } else {
            currentAccountPaid += emp.netPay;
          }
        } else {
          pendingPaid += emp.netPay;
        }
      });
    } else {
      displayedPayroll.forEach(emp => {
        const cPaid = emp.currentPaid || 0;
        const sPaid = emp.savingsPaid || 0;
        currentAccountPaid += cPaid;
        savingsAccountPaid += sPaid;
        totalPaid += (cPaid + sPaid);
        pendingPaid += Math.max(0, emp.netPay - (cPaid + sPaid));
      });
    }

    return {
      currentAccountPaid,
      savingsAccountPaid,
      totalPaid,
      pendingPaid
    };
  }, [displayedPayroll, filterMode]);

  const updatePayroll = async (staffId: string, updates: any, targetMonth: string = selectedMonth) => {
    let targetId: string | null = null;
    let isNew = false;
    let fullRecord: any = null;

    setPayroll(prev => {
      const existingIdx = prev.findIndex(p => (p.staffId === staffId || p.staff_id === staffId) && p.month === targetMonth);
      if (existingIdx >= 0) {
        const newArr = [...prev];
        const existing = newArr[existingIdx];
        const merged = { ...existing, ...updates };
        const basicVal = merged.basic !== undefined ? merged.basic : (merged.salary || 0);
        const dedVal = merged.deductions !== undefined ? merged.deductions : 0;
        merged.netPay = basicVal - dedVal;
        merged.net_salary = basicVal - dedVal;
        newArr[existingIdx] = merged;
        targetId = merged.id;
        fullRecord = merged;
        return newArr;
      } else {
        const emp = staff.find(s => s.id === staffId);
        const calc = emp ? calculateStaffMonth(emp, targetMonth) : null;
        const basicVal = updates.basic !== undefined ? updates.basic : (calc?.basic ?? (emp?.baseSalary || 0));
        const dedVal = updates.deductions !== undefined ? updates.deductions : (calc?.deductions ?? 0);
        const newRecord = {
          id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`,
          staffId,
          staff_id: staffId,
          employeeName: emp?.name || '',
          employee_name: emp?.name || '',
          month: targetMonth,
          basic: basicVal,
          salary: basicVal,
          deductions: dedVal,
          netPay: basicVal - dedVal,
          net_salary: basicVal - dedVal,
          status: 'Pending',
          paymentAccount: 'Current',
          deductionReason: '',
          deduction_reason: '',
          ...updates
        };
        newRecord.netPay = (newRecord.basic ?? basicVal) - (newRecord.deductions ?? dedVal);
        newRecord.net_salary = newRecord.netPay;
        targetId = newRecord.id;
        isNew = true;
        fullRecord = newRecord;
        return [...prev, newRecord];
      }
    });

    try {
      if (targetId && !isNew) {
        await apiUpdatePayroll(targetId, updates);
      } else if (fullRecord) {
        await addPayroll(fullRecord);
      }
    } catch (e) {
      console.error('Failed to sync payroll update to backend', e);
    }
  };

  const markAllPaid = () => {
    if (filterMode === 'yearly') {
      const fyMonthsList = getFYMonths(parseInt(selectedFY, 10));
      setPayroll(prev => {
        let next = [...prev];
        displayedPayroll.forEach(emp => {
          fyMonthsList.forEach(item => {
            const m = item.monthKey;
            const mData = emp.monthDataList?.find((x: any) => x.month === m);
            if (mData && mData.status !== 'Paid') {
              const existingIdx = next.findIndex(x => x.staffId === emp.id && x.month === m);
              if (existingIdx >= 0) {
                next[existingIdx] = { ...next[existingIdx], status: 'Paid' };
              } else {
                next.push({
                  id: Math.random().toString(36).substr(2, 9),
                  staffId: emp.id,
                  month: m,
                  basic: mData.basic,
                  deductions: mData.deductions,
                  netPay: mData.netPay,
                  status: 'Paid',
                  paymentAccount: 'Current'
                });
              }
            }
          });
        });
        return next;
      });
    } else {
      const pending = displayedPayroll.filter(p => p.status === 'Pending');
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
              status: 'Paid',
              paymentAccount: 'Current'
            });
          }
        });
        return next;
      });
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Payroll Management</h1>
          <p className="text-xs font-semibold text-gray-500">
            {filterMode === 'yearly' ? `Financial Year Summary & Metrics (${getFYLabel(selectedFY)})` : `Monthly Payroll & Payouts (${selectedMonth})`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Filter Mode Toggle */}
          <div className="flex items-center bg-white/70 p-1 rounded-xl border border-white/60 shadow-sm backdrop-blur-md">
            <button
              id="payroll-mode-monthly"
              type="button"
              onClick={() => setFilterMode('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                filterMode === 'monthly'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Monthly
            </button>
            <button
              id="payroll-mode-yearly"
              type="button"
              onClick={() => setFilterMode('yearly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                filterMode === 'yearly'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* Month / Year Filter Input */}
          {filterMode === 'monthly' ? (
            <div className="flex items-center bg-white/60 px-3 py-1.5 rounded-xl border border-white/60 shadow-sm hover:bg-white/80 transition-colors">
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                className="bg-transparent text-sm font-bold focus:outline-none text-gray-700 cursor-pointer"
              />
            </div>
          ) : (
            <div className="flex items-center bg-white/60 px-3 py-1.5 rounded-xl border border-white/60 shadow-sm hover:bg-white/80 transition-colors gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Financial Year:</span>
              <select
                value={selectedFY}
                onChange={(e) => handleFYChange(e.target.value)}
                className="bg-transparent text-sm font-bold focus:outline-none text-gray-800 cursor-pointer pr-1"
              >
                {availableFYs.map(yr => (
                  <option key={yr} value={yr}>{getFYLabel(yr)} (Apr - Mar)</option>
                ))}
              </select>
            </div>
          )}
          
          <button 
            onClick={markAllPaid}
            className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {filterMode === 'yearly' ? `Mark FY Paid (${getFYLabel(selectedFY)})` : 'Mark All Paid'}
          </button>
        </div>
      </div>

      {/* Salary Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Net Payroll */}
        <div className="glass-panel p-4 rounded-2xl border border-white/60 bg-white/40 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {filterMode === 'yearly' ? 'Annual Net Payroll' : 'Total Net Payroll'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-gray-800 flex items-center">
              <IndianRupee className="w-4 h-4 mr-0.5 text-gray-500" />
              {displayedPayroll.reduce((sum, p) => sum + p.netPay, 0).toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-gray-500">
              {displayedPayroll.length} Staff ({filterMode === 'yearly' ? getFYLabel(selectedFY) : selectedMonth})
            </span>
          </div>
        </div>

        {/* Current Account Paid */}
        <div className="glass-panel p-4 rounded-2xl border border-blue-200/60 bg-blue-50/40 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              {filterMode === 'yearly' ? 'Annual Current A/c' : 'Current A/c Paid'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
              🏦
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-blue-900 flex items-center">
              <IndianRupee className="w-4 h-4 mr-0.5 text-blue-600" />
              {payrollSummary.currentAccountPaid.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
              Commercial
            </span>
          </div>
        </div>

        {/* Savings Account Paid */}
        <div className="glass-panel p-4 rounded-2xl border border-purple-200/60 bg-purple-50/40 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
              {filterMode === 'yearly' ? 'Annual Savings A/c' : 'Savings A/c Paid'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-base">
              💰
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-900 flex items-center">
              <IndianRupee className="w-4 h-4 mr-0.5 text-purple-600" />
              {payrollSummary.savingsAccountPaid.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full border border-purple-200">
              Personal
            </span>
          </div>
        </div>

        {/* Pending Salary */}
        <div className="glass-panel p-4 rounded-2xl border border-amber-200/60 bg-amber-50/40 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              {filterMode === 'yearly' ? 'Annual Pending' : 'Pending Salary'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-base">
              ⏳
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-900 flex items-center">
              <IndianRupee className="w-4 h-4 mr-0.5 text-amber-600" />
              {payrollSummary.pendingPaid.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
              {filterMode === 'yearly' 
                ? `${displayedPayroll.filter(p => p.paidMonthsCount < 12).length} with Pending` 
                : `${displayedPayroll.filter(p => p.status === 'Pending').length} Pending`}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel border border-white/60 rounded-2xl shadow-sm mb-6 p-3 sm:p-4 bg-white/40 backdrop-blur-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search staff by name or role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/70 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-400"
            />
          </div>
          
          <div className="w-full sm:w-64 shrink-0">
            <SearchableSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Paid', label: 'All Paid' },
                { value: 'Current', label: 'Paid via Current A/c' },
                { value: 'Savings', label: 'Paid via Savings A/c' }
              ]}
            />
          </div>

          {(searchTerm !== '' || filterStatus !== 'All') && (
            <button 
              onClick={(e) => { e.stopPropagation(); resetFilters(); }}
              className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto text-sm font-bold text-gray-600 bg-white/50 px-4 py-2 rounded-xl border border-white/60 shrink-0 shadow-2xs">
          <span className="text-gray-400 font-medium">Total Paid:</span>
          <span className="text-emerald-700 text-base flex items-center font-black">
            <IndianRupee className="w-4 h-4" />
            {payrollSummary.totalPaid.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6">Employee</th>
                <th className="py-4 px-6">
                  {filterMode === 'yearly' ? `Annual Attendance (${getFYLabel(selectedFY)})` : 'Attendance Stats'}
                </th>
                <th className="py-4 px-6 text-right">
                  {filterMode === 'yearly' ? 'Annual Basic' : 'Basic Salary'}
                </th>
                <th className="py-4 px-6 text-right">
                  {filterMode === 'yearly' ? 'Annual Deductions' : 'Deductions'}
                </th>
                <th className="py-4 px-6 text-right">
                  {filterMode === 'yearly' ? 'Annual Net Pay' : 'Net Pay'}
                </th>
                <th className="py-4 px-6 text-center">
                  {filterMode === 'yearly' ? 'Annual Status' : 'Status'}
                </th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedPayroll.length > 0 ? (
                displayedPayroll.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-800 text-sm block">{emp.name}</span>
                      <span className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">{emp.role}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded" title="Present">{emp.stats.daysPresent} P</span>
                        <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded" title="Absent">{emp.stats.daysAbsent} A</span>
                        <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded" title="Half Day">{emp.stats.daysHalf} H</span>
                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded" title={`Approved Leaves: ${emp.stats.daysLeave} (Paid: ${emp.stats.paidLeaveDays || 0}d)`}>{emp.stats.daysLeave} L</span>
                        {emp.stats.unpaidLeaveDays > 0 && (
                          <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-extrabold" title={`Deductible Leaves: ${emp.stats.unpaidLeaveDays}d (${emp.stats.deductibleEarnedDays > 0 ? `${emp.stats.deductibleEarnedDays}d Earned > 1/mo ` : ''}${emp.stats.deductibleSickDays > 0 ? `${emp.stats.deductibleSickDays}d Sick > 3 ` : ''}${emp.stats.deductibleCasualDays > 0 ? `${emp.stats.deductibleCasualDays}d Casual` : ''})`}>
                            {emp.stats.unpaidLeaveDays} Ded.
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {filterMode === 'monthly' ? (
                        <div className="flex items-center justify-end font-bold text-gray-700">
                          {canManagePayroll ? (
                            <input 
                              type="number"
                              value={emp.basic}
                              onChange={(e) => updatePayroll(emp.id, { basic: parseFloat(e.target.value) || 0 })}
                              className="w-20 text-right bg-white/50 border border-white/60 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                            />
                          ) : (
                            <span>₹{emp.basic.toLocaleString()}</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="font-bold text-gray-800 text-sm">₹{emp.basic.toLocaleString()}</span>
                          <span className="text-[10px] text-gray-500 block font-medium">₹{emp.baseSalary.toLocaleString()}/mo</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {filterMode === 'monthly' ? (
                        <div className="flex flex-col items-end">
                          <div className="flex items-center justify-end font-bold text-rose-600">
                            {canManagePayroll ? (
                              <input 
                                type="number"
                                value={emp.deductions}
                                onChange={(e) => updatePayroll(emp.id, { deductions: parseFloat(e.target.value) || 0 })}
                                className="w-20 text-right bg-white/50 border border-white/60 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-rose-400 text-rose-600 font-bold"
                              />
                            ) : (
                              <span>₹{emp.deductions.toLocaleString()}</span>
                            )}
                          </div>
                          {/* Note / Reason Badge */}
                          {(emp.deductions > 0 || emp.deductionReason) ? (
                            <button
                              type="button"
                              onClick={() => openDeductionModal({
                                staffId: emp.id,
                                name: emp.name,
                                role: emp.role,
                                baseSalary: emp.baseSalary,
                                month: selectedMonth,
                                workingDays: emp.workingDays,
                                perDaySalary: emp.perDaySalary,
                                currentDeduction: emp.deductions,
                                calculatedDeductions: emp.calculatedDeductions,
                                deductionReason: emp.deductionReason || '',
                                deductionBreakdown: emp.deductionBreakdown || [],
                                autoDeductionNote: emp.autoDeductionNote || ''
                              })}
                              className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors group/note max-w-[190px] text-right"
                              title="Click to view breakdown or edit deduction note"
                            >
                              <FileText className="w-3 h-3 flex-shrink-0 text-rose-500 group-hover/note:scale-110 transition-transform" />
                              <span className="truncate">
                                {emp.deductionReason ? `💬 ${emp.deductionReason}` : (emp.autoDeductionNote || 'Breakdown')}
                              </span>
                            </button>
                          ) : (
                            canManagePayroll && (
                              <button
                                type="button"
                                onClick={() => openDeductionModal({
                                  staffId: emp.id,
                                  name: emp.name,
                                  role: emp.role,
                                  baseSalary: emp.baseSalary,
                                  month: selectedMonth,
                                  workingDays: emp.workingDays,
                                  perDaySalary: emp.perDaySalary,
                                  currentDeduction: 0,
                                  calculatedDeductions: 0,
                                  deductionReason: '',
                                  deductionBreakdown: [],
                                  autoDeductionNote: ''
                                })}
                                className="mt-1 text-[10px] text-gray-400 hover:text-rose-600 font-medium transition-colors"
                              >
                                + Add note
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="font-bold text-rose-600 text-sm">₹{emp.deductions.toLocaleString()}</span>
                          {emp.deductions > 0 && (
                            <span className="text-[10px] text-gray-500 block font-medium">
                              Annual Deductions
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-bold text-emerald-700 text-sm flex items-center justify-end">
                        <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                        {emp.netPay.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {filterMode === 'monthly' ? (
                        <>
                          {canManagePayroll ? (
                            <select 
                              value={emp.status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                if (newStatus === 'Paid') {
                                  setSelectedAccountType(emp.paymentAccount || 'Current');
                                  setPayAccountModalData({
                                    staffId: emp.id,
                                    name: emp.name,
                                    role: emp.role,
                                    netPay: emp.netPay,
                                    targetMonth: selectedMonth
                                  });
                                } else {
                                  updatePayroll(emp.id, { status: newStatus });
                                }
                              }}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wide cursor-pointer appearance-none text-center outline-none ${
                                emp.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                              }`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Paid">Paid</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wide inline-block text-center ${
                              emp.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>
                              {emp.status}
                            </span>
                          )}
                          {emp.status === 'Paid' && (
                            <div className="mt-1.5 flex items-center justify-center">
                              {canManagePayroll ? (
                                <select
                                  value={emp.paymentAccount || 'Current'}
                                  onChange={(e) => updatePayroll(emp.id, { paymentAccount: e.target.value })}
                                  className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 outline-none cursor-pointer hover:bg-indigo-100 transition-colors"
                                  title="Salary Payment Account"
                                >
                                  <option value="Current">🏦 Current A/c</option>
                                  <option value="Savings">💰 Savings A/c</option>
                                </select>
                              ) : (
                                <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5">
                                  {emp.paymentAccount === 'Savings' ? '💰 Savings' : '🏦 Current'}
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wide inline-block text-center ${
                            emp.paidMonthsCount === 12
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : emp.paidMonthsCount === 0
                              ? 'bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                            {emp.paidMonthsCount}/12 Paid
                          </span>
                          {emp.paidMonthsCount > 0 && (
                            <div className="text-[9px] text-gray-500 font-medium">
                              {emp.currentPaid > 0 && `🏦 ₹${emp.currentPaid.toLocaleString()}`}
                              {emp.currentPaid > 0 && emp.savingsPaid > 0 && ' • '}
                              {emp.savingsPaid > 0 && `💰 ₹${emp.savingsPaid.toLocaleString()}`}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => setSelectedPayslip(emp)}
                          className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center hover:bg-gray-200 hover:text-gray-800 transition-colors opacity-80 group-hover:opacity-100"
                          title={filterMode === 'yearly' ? 'View Annual Statement' : 'View Payslip'}
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

      {/* Payslip / Annual Statement Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPayslip(null)}></div>
          <div className={`relative bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl w-full ${selectedPayslip.mode === 'yearly' ? 'max-w-3xl' : 'max-w-lg'} max-h-[90dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200`}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/50 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedPayslip.mode === 'yearly' ? `Annual Payroll Statement (${selectedPayslip.year})` : 'Payslip Details'}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {selectedPayslip.mode === 'yearly' ? `12-Month Financial Statement for ${selectedPayslip.name}` : `Statement for ${selectedMonth}`}
                </p>
              </div>
              <button onClick={() => setSelectedPayslip(null)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-200/50 pb-5">
                <div>
                  <h3 className="text-2xl font-black text-gray-800">{selectedPayslip.name}</h3>
                  <p className="text-sm font-bold text-primary uppercase tracking-wider mt-1">{selectedPayslip.role}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  {selectedPayslip.mode === 'yearly' ? (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex ${
                      selectedPayslip.paidMonthsCount === 12 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : selectedPayslip.paidMonthsCount === 0 
                        ? 'bg-rose-100 text-rose-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {selectedPayslip.paidMonthsCount}/12 Months Paid
                    </div>
                  ) : (
                    <>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex ${
                        selectedPayslip.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {selectedPayslip.status}
                      </div>
                      {selectedPayslip.status === 'Paid' && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          Paid via: {selectedPayslip.paymentAccount || 'Current'} Account
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Earnings & Deductions Overview */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-semibold">{selectedPayslip.mode === 'yearly' ? 'Annual Basic Salary' : 'Basic Salary'}</span>
                  <span className="text-gray-800 font-bold flex items-center"><IndianRupee className="w-3.5 h-3.5 mr-0.5" />{selectedPayslip.basic.toLocaleString()}</span>
                </div>
                {/* Deductions Breakdown & Description */}
                {(selectedPayslip.deductions > 0 || selectedPayslip.deductionReason || (selectedPayslip.deductionBreakdown && selectedPayslip.deductionBreakdown.length > 0)) && (
                  <div className="bg-rose-50/70 rounded-2xl p-3.5 border border-rose-100/90 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-rose-600" />
                        Deduction Breakdown & Reasons
                      </span>
                      {canManagePayroll && selectedPayslip.mode === 'monthly' && (
                        <button
                          type="button"
                          onClick={() => {
                            openDeductionModal({
                              staffId: selectedPayslip.id,
                              name: selectedPayslip.name,
                              role: selectedPayslip.role,
                              baseSalary: selectedPayslip.baseSalary,
                              month: selectedMonth,
                              workingDays: selectedPayslip.workingDays,
                              perDaySalary: selectedPayslip.perDaySalary,
                              currentDeduction: selectedPayslip.deductions,
                              calculatedDeductions: selectedPayslip.calculatedDeductions,
                              deductionReason: selectedPayslip.deductionReason || '',
                              deductionBreakdown: selectedPayslip.deductionBreakdown || [],
                              autoDeductionNote: selectedPayslip.autoDeductionNote || ''
                            });
                          }}
                          className="text-[10px] font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-100/50 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors shadow-2xs"
                        >
                          Edit Note / Deductions
                        </button>
                      )}
                    </div>

                    {/* Custom Note / Reason if specified */}
                    {selectedPayslip.deductionReason && (
                      <div className="bg-white/90 p-2.5 rounded-xl border border-rose-200/80 text-xs">
                        <span className="font-extrabold text-rose-800 block text-[10px] uppercase tracking-wider mb-0.5">
                          📝 Description / Note:
                        </span>
                        <span className="text-gray-800 font-medium whitespace-pre-wrap">{selectedPayslip.deductionReason}</span>
                      </div>
                    )}

                    {/* Itemized list of deductions */}
                    {selectedPayslip.deductionBreakdown && selectedPayslip.deductionBreakdown.length > 0 && (
                      <div className="space-y-1.5">
                        {selectedPayslip.deductionBreakdown.map((item: any, idx: number) => (
                          <div key={item.id || idx} className="bg-white/70 p-2.5 rounded-xl border border-rose-100/80 flex items-start justify-between text-xs gap-2">
                            <div>
                              <div className="font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
                                <span>{item.title}</span>
                                {item.dates && <span className="text-[10px] text-gray-500 font-normal">({item.dates})</span>}
                              </div>
                              {item.reason && item.id !== 'ded-manual-reason' && (
                                <div className="text-[11px] text-gray-600 mt-0.5">
                                  <span className="text-rose-600 font-semibold">Reason:</span> "{item.reason}"
                                </div>
                              )}
                            </div>
                            {item.amount !== undefined && (
                              <span className="font-bold text-rose-600 whitespace-nowrap text-right">
                                {item.amount < 0 ? '+' : '-'}₹{Math.abs(item.amount).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-semibold">{selectedPayslip.mode === 'yearly' ? 'Annual Deductions' : 'Total Deductions'}</span>
                  <span className="text-rose-600 font-bold flex items-center">-<IndianRupee className="w-3.5 h-3.5 mx-0.5" />{selectedPayslip.deductions.toLocaleString()}</span>
                </div>
                
                <div className="pt-3 mt-1 border-t border-gray-200/50 flex justify-between items-center">
                  <span className="text-gray-800 font-bold text-lg">{selectedPayslip.mode === 'yearly' ? 'Annual Net Pay' : 'Net Pay'}</span>
                  <span className="text-emerald-600 font-black text-2xl flex items-center">
                    <IndianRupee className="w-5 h-5 mr-0.5" />
                    {selectedPayslip.netPay.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Working Days Breakdown (Monthly mode) */}
              {selectedPayslip.mode === 'monthly' && selectedPayslip.workingDays !== undefined && (
                <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-amber-700 font-semibold">
                    <Calendar className="w-4 h-4" />
                    Working Days Basis
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-gray-500">{selectedPayslip.daysInMonth} total</span>
                    <span className="text-amber-600">- {selectedPayslip.holidaysInMonth} holidays</span>
                    <span className="text-gray-800 bg-white px-2 py-0.5 rounded-md border border-gray-200">= {selectedPayslip.workingDays} working</span>
                  </div>
                </div>
              )}
              
              {/* Attendance & Leave Summary */}
              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  {selectedPayslip.mode === 'yearly' ? `Annual Attendance & Leave Summary (${selectedPayslip.year})` : 'Attendance & Leave Summary'}
                </p>
                <div className="grid grid-cols-5 gap-2 text-center">
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
                    <div className="text-primary font-black text-lg">{selectedPayslip.stats.paidLeaveDays ?? selectedPayslip.stats.daysLeave}</div>
                    <div className="text-[10px] font-bold text-primary uppercase mt-0.5">Paid Leave</div>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-2">
                    <div className="text-rose-700 font-black text-lg">{selectedPayslip.stats.unpaidLeaveDays ?? 0}</div>
                    <div className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">Ded. Leave</div>
                  </div>
                </div>
              </div>

              {/* 12-Month Table Breakdown (Yearly mode) */}
              {selectedPayslip.mode === 'yearly' && selectedPayslip.monthDataList && (
                <div className="border border-gray-200/70 rounded-2xl overflow-hidden bg-white/70 shadow-sm">
                  <div className="p-3 bg-gray-50/80 border-b border-gray-200 font-bold text-xs text-gray-700 uppercase tracking-wider flex items-center justify-between">
                    <span>12-Month Financial Year Breakdown ({selectedPayslip.fyLabel || selectedPayslip.year})</span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ₹{selectedPayslip.netPay.toLocaleString()} Net Total
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-[280px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/40 text-[10px]">
                          <th className="py-2.5 px-3">Month</th>
                          <th className="py-2.5 px-3 text-center">Working</th>
                          <th className="py-2.5 px-3 text-right">Basic</th>
                          <th className="py-2.5 px-3 text-right">Deductions</th>
                          <th className="py-2.5 px-3 text-right">Net Pay</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          {canManagePayroll && <th className="py-2.5 px-3 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedPayslip.monthDataList.map((mItem: any) => {
                          const displayMonth = mItem.displayMonth || mItem.month;
                          return (
                            <tr key={mItem.month} className="hover:bg-white transition-colors">
                              <td className="py-2 px-3 font-bold text-gray-800">
                                {displayMonth}
                              </td>
                              <td className="py-2 px-3 text-center text-gray-600 font-semibold">
                                {mItem.workingDays}d
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-gray-700">
                                ₹{mItem.basic.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-rose-600">
                                <div>₹{mItem.deductions.toLocaleString()}</div>
                                {mItem.deductions > 0 && (mItem.deductionReason || mItem.autoDeductionNote) && (
                                  <div 
                                    className="text-[9px] text-gray-500 font-normal max-w-[130px] truncate ml-auto cursor-help" 
                                    title={mItem.deductionReason ? `Note: ${mItem.deductionReason}` : mItem.autoDeductionNote}
                                  >
                                    {mItem.deductionReason ? `💬 ${mItem.deductionReason}` : mItem.autoDeductionNote}
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-emerald-700">
                                ₹{mItem.netPay.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase inline-flex items-center gap-1 ${
                                  mItem.status === 'Paid' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {mItem.status}
                                  {mItem.status === 'Paid' && (
                                    <span className="text-[9px]">
                                      ({mItem.paymentAccount === 'Savings' ? '💰 Savings' : '🏦 Current'})
                                    </span>
                                  )}
                                </span>
                              </td>
                              {canManagePayroll && (
                                <td className="py-2 px-3 text-center">
                                  {mItem.status === 'Paid' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updatePayroll(selectedPayslip.id, { status: 'Pending' }, mItem.month);
                                        setSelectedPayslip((prev: any) => {
                                          if (!prev) return null;
                                          const updatedList = prev.monthDataList.map((x: any) => 
                                            x.month === mItem.month ? { ...x, status: 'Pending' } : x
                                          );
                                          const paidCount = updatedList.filter((x: any) => x.status === 'Paid').length;
                                          return {
                                            ...prev,
                                            paidMonthsCount: paidCount,
                                            status: paidCount === 12 ? 'Paid' : paidCount === 0 ? 'Pending' : 'Partial',
                                            monthDataList: updatedList
                                          };
                                        });
                                      }}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                                    >
                                      Mark Pending
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedAccountType(mItem.paymentAccount || 'Current');
                                        setPayAccountModalData({
                                          staffId: selectedPayslip.id,
                                          name: selectedPayslip.name,
                                          role: selectedPayslip.role,
                                          netPay: mItem.netPay,
                                          targetMonth: mItem.month,
                                        });
                                      }}
                                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline cursor-pointer"
                                    >
                                      Mark Paid
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-200/50 bg-gray-50/50 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setSelectedPayslip(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-all">
                Close
              </button>
              <button onClick={() => { alert(selectedPayslip.mode === 'yearly' ? 'Downloading Annual Statement PDF...' : 'Downloading payslip...'); setSelectedPayslip(null); }} className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Payment Account Confirmation Modal */}
      {payAccountModalData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setPayAccountModalData(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-emerald-50/50">
              <h3 className="font-bold text-base text-emerald-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" /> Confirm Salary Payment
              </h3>
              <button onClick={() => setPayAccountModalData(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{payAccountModalData.name}</p>
                  <p className="text-xs text-gray-500 uppercase">{payAccountModalData.role}</p>
                  {payAccountModalData.targetMonth && (
                    <p className="text-[10px] text-primary font-bold mt-0.5">Month: {payAccountModalData.targetMonth}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Net Salary</span>
                  <span className="text-lg font-black text-emerald-700 flex items-center justify-end">
                    <IndianRupee className="w-4 h-4 mr-0.5" />
                    {payAccountModalData.netPay.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
                  Select Account Paid From <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountType('Current')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      selectedAccountType === 'Current'
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🏦</span>
                      {selectedAccountType === 'Current' && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Current Account</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Company Business A/c</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAccountType('Savings')}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      selectedAccountType === 'Savings'
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">💰</span>
                      {selectedAccountType === 'Savings' && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">Savings Account</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Personal / Partner A/c</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPayAccountModalData(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetM = payAccountModalData.targetMonth || selectedMonth;
                  updatePayroll(
                    payAccountModalData.staffId,
                    {
                      status: 'Paid',
                      paymentAccount: selectedAccountType
                    },
                    targetM
                  );
                  if (selectedPayslip && selectedPayslip.mode === 'yearly' && payAccountModalData.targetMonth) {
                    setSelectedPayslip((prev: any) => {
                      if (!prev) return null;
                      const updatedList = prev.monthDataList.map((x: any) =>
                        x.month === payAccountModalData.targetMonth ? { ...x, status: 'Paid', paymentAccount: selectedAccountType } : x
                      );
                      const paidCount = updatedList.filter((x: any) => x.status === 'Paid').length;
                      return {
                        ...prev,
                        paidMonthsCount: paidCount,
                        status: paidCount === 12 ? 'Paid' : paidCount === 0 ? 'Pending' : 'Partial',
                        monthDataList: updatedList
                      };
                    });
                  }
                  setPayAccountModalData(null);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Confirm & Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deduction Breakdown & Note Modal */}
      {deductionModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-white/60 relative space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-800">
                    Salary Deduction & Notes
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {deductionModalData.name} • {deductionModalData.role} • {deductionModalData.month}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeductionModalData(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-3 rounded-2xl border border-gray-100 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Base Salary</span>
                <span className="text-xs font-black text-gray-800">₹{deductionModalData.baseSalary?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Working Days</span>
                <span className="text-xs font-black text-gray-800">{deductionModalData.workingDays}d</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Daily Rate</span>
                <span className="text-xs font-black text-gray-800">₹{Math.round(deductionModalData.perDaySalary || 0).toLocaleString()}/d</span>
              </div>
            </div>

            {/* Auto-calculated Leaves & Attendance Reasons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-rose-500" />
                  Calculated Leave & Attendance Deductions
                </span>
                <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                  Total: ₹{deductionModalData.calculatedDeductions?.toLocaleString()}
                </span>
              </div>

              {deductionModalData.deductionBreakdown && deductionModalData.deductionBreakdown.filter(item => item.category !== 'manual').length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {deductionModalData.deductionBreakdown
                    .filter(item => item.category !== 'manual')
                    .map((item, idx) => (
                      <div key={item.id || idx} className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100 flex items-start justify-between text-xs gap-2">
                        <div>
                          <div className="font-bold text-gray-800 flex items-center gap-1.5 flex-wrap">
                            <span>{item.title}</span>
                            {item.dates && <span className="text-[10px] text-gray-500 font-normal">({item.dates})</span>}
                          </div>
                          {item.reason && (
                            <div className="text-[11px] text-gray-600 mt-0.5">
                              <span className="text-rose-600 font-semibold">Reason:</span> "{item.reason}"
                            </div>
                          )}
                        </div>
                        {item.amount !== undefined && (
                          <span className="font-bold text-rose-600 whitespace-nowrap text-right">
                            -₹{Math.abs(item.amount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center text-xs text-gray-500">
                  No automatic leave or attendance deductions recorded for this month.
                </div>
              )}
            </div>

            {/* Deduction Amount & Manual Note Settings */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              {canManagePayroll ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Deduction Amount (₹)
                      </label>
                      {modalDeductionAmount !== deductionModalData.calculatedDeductions && (
                        <button
                          type="button"
                          onClick={() => setModalDeductionAmount(deductionModalData.calculatedDeductions)}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Reset to Auto-calc (₹{deductionModalData.calculatedDeductions})
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        value={modalDeductionAmount}
                        onChange={(e) => setModalDeductionAmount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-rose-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                      Deduction Description / Note
                    </label>
                    <textarea
                      rows={2}
                      value={modalDeductionReason}
                      onChange={(e) => setModalDeductionReason(e.target.value)}
                      placeholder="e.g., Casual leave for family wedding, Advance salary recovery, Equipment repair fine..."
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    />

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {deductionModalData.autoDeductionNote && (
                        <button
                          type="button"
                          onClick={() => setModalDeductionReason(deductionModalData.autoDeductionNote)}
                          className="text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded-lg border border-primary/20 transition-colors"
                          title="Click to copy auto-calculated breakdown as description"
                        >
                          📋 Use Auto Note
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setModalDeductionReason(prev => prev ? `${prev}, Advance salary adjustment` : 'Advance salary adjustment')}
                        className="text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        + Advance Recovery
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDeductionReason(prev => prev ? `${prev}, Asset / tool damage` : 'Asset / tool damage fine')}
                        className="text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        + Asset Fine
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDeductionReason(prev => prev ? `${prev}, Unpaid leave adjustment` : 'Unpaid leave adjustment')}
                        className="text-[10px] font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-lg transition-colors"
                      >
                        + Leave Adjustment
                      </button>
                    </div>
                  </div>

                  {/* Net Pay live preview */}
                  <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700">Estimated Net Pay:</span>
                    <span className="font-black text-sm text-emerald-700 flex items-center">
                      <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                      {Math.max(0, (deductionModalData.baseSalary || 0) - modalDeductionAmount).toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-semibold">Total Deductions:</span>
                    <span className="font-bold text-rose-600">₹{modalDeductionAmount.toLocaleString()}</span>
                  </div>
                  {modalDeductionReason && (
                    <div>
                      <span className="text-gray-500 font-semibold block">Note:</span>
                      <span className="text-gray-800 font-medium">{modalDeductionReason}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeductionModalData(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {canManagePayroll ? 'Cancel' : 'Close'}
              </button>
              {canManagePayroll && (
                <button
                  type="button"
                  onClick={handleSaveDeductionModal}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 hover:shadow-lg hover:shadow-rose-600/30 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Save Deduction & Note
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
