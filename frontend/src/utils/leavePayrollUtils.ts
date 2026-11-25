export type LeaveCategory = 'Casual' | 'Sick' | 'Earned';

export interface LeaveDaySegment {
  date: string;
  month: string;
  type: LeaveCategory;
  weight: number;
  leaveReq: any;
}

export interface StaffLeaveQuotasResult {
  usedEarned: number;
  paidEarned: number;
  deductibleEarned: number;
  usedSick: number;
  paidSick: number;
  deductibleSick: number;
  usedCasual: number;
  // Target-month breakdown (populated when targetMonth is passed)
  earnedInMonth: number;
  paidEarnedInMonth: number;
  deductibleEarnedInMonth: number;
  sickInMonth: number;
  paidSickInMonth: number;
  deductibleSickInMonth: number;
  casualInMonth: number;
  totalPaidInMonth: number;
  totalDeductibleInMonth: number;
  approvedLeaveDaysInMonth: number;
  approvedLeaveDatesInMonth: Set<string>;
  /** Effective working leave days per request id inside targetMonth (excluding holidays). */
  requestDaysInMonth: Map<string, number>;
}

/** Returns the Financial Year start year (Apr-Mar) for a YYYY-MM or YYYY-MM-DD string. */
export function getFYStartYear(yearMonthOrDate: string): number {
  const [yearStr, monthStr] = (yearMonthOrDate || '').split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  if (isNaN(y) || isNaN(m)) {
    const now = new Date();
    return (now.getMonth() + 1) >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  }
  return m >= 4 ? y : y - 1;
}

export function getFYBounds(fyStartYear: number): { fyStartDate: string; fyEndDate: string } {
  return {
    fyStartDate: `${fyStartYear}-04-01`,
    fyEndDate: `${fyStartYear + 1}-03-31`,
  };
}

export function getFYLabel(startYear: number | string): string {
  const y = parseInt(String(startYear), 10);
  const nextShort = String((y + 1) % 100).padStart(2, '0');
  return `FY ${y}-${nextShort}`;
}

export function isHalfDayLeave(r: any): boolean {
  if (!r) return false;
  return Boolean(
    r.isHalfDay ||
      r.is_half_day ||
      r.days === 0.5 ||
      (r.days !== undefined && Number(r.days) === 0.5)
  );
}

/** Expand inclusive YYYY-MM-DD dates from fromDate through toDate using local calendar dates. */
export function expandLeaveDates(fromDate: string, toDate?: string): string[] {
  if (!fromDate) return [];
  const parts1 = fromDate.split('-').map(Number);
  const parts2 = (toDate || fromDate).split('-').map(Number);
  if (parts1.length !== 3 || parts2.length !== 3) return [fromDate];

  const [y, m, d] = parts1;
  const [ey, em, ed] = parts2;
  const start = new Date(y, m - 1, d);
  const end = new Date(ey, em - 1, ed);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return [fromDate];
  }

  const dates: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/** Count effective working leave days (excluding company holidays). */
export function countEffectiveLeaveDays(
  fromDate: string,
  toDate: string | undefined,
  isHalfDay: boolean,
  holidayDatesSet: Set<string>,
  fallbackDays?: number
): number {
  if (!fromDate) return 0;
  const dates = expandLeaveDates(fromDate, toDate);
  if (dates.length === 0) return fallbackDays || 0;
  if (isHalfDay) {
    return holidayDatesSet.has(dates[0]) ? 0 : 0.5;
  }
  return dates.reduce((count, d) => count + (holidayDatesSet.has(d) ? 0 : 1), 0);
}

/**
 * Expand a staff member's leaves inside a Financial Year into sorted daily segments,
 * excluding company holidays so Leave Management and Payroll agree on day counts.
 */
export function buildFYLeaveSegments(
  leaveRequests: any[],
  staffId: string,
  holidayDatesSet: Set<string>,
  fyStartDate: string,
  fyEndDate: string,
  allowedStatuses: string[] = ['Approved']
): LeaveDaySegment[] {
  const statusSet = new Set(allowedStatuses);
  const segments: LeaveDaySegment[] = [];

  (leaveRequests || []).forEach((r) => {
    const sId = r.staffId || r.staff_id;
    if (sId !== staffId || !statusSet.has(r.status)) return;

    const fDate = r.fromDate || r.from_date;
    const tDate = r.toDate || r.to_date || fDate;
    if (!fDate) return;

    const dates = expandLeaveDates(fDate, tDate);
    if (dates.length === 0) return;

    const leaveType: LeaveCategory = r.type || 'Casual';
    if (isHalfDayLeave(r)) {
      const d0 = dates[0];
      if (d0 >= fyStartDate && d0 <= fyEndDate && !holidayDatesSet.has(d0)) {
        segments.push({
          date: d0,
          month: d0.slice(0, 7),
          type: leaveType,
          weight: 0.5,
          leaveReq: r,
        });
      }
    } else {
      dates.forEach((d) => {
        if (d >= fyStartDate && d <= fyEndDate && !holidayDatesSet.has(d)) {
          segments.push({
            date: d,
            month: d.slice(0, 7),
            type: leaveType,
            weight: 1.0,
            leaveReq: r,
          });
        }
      });
    }
  });

  segments.sort((a, b) => a.date.localeCompare(b.date));
  return segments;
}

/**
 * Compute paid vs. deductible leave totals for a Financial Year and an optional target YYYY-MM month.
 * Mirrors company policy:
 *  - Earned: earnedQuota / 12 paid days per month (1/mo for default 12), no carry forward.
 *  - Sick: sickQuota paid days per FY (3/yr default), no carry forward.
 *  - Casual: 100% payroll-deductible.
 */
export function calculateStaffLeaveQuotas(
  segments: LeaveDaySegment[],
  balance?: { earned?: number; sick?: number },
  targetMonth?: string
): StaffLeaveQuotasResult {
  const earnedQuota = Math.max(0, balance?.earned ?? 12);
  const monthlyEarnedQuota = earnedQuota / 12;
  const sickQuota = Math.max(0, balance?.sick ?? 3);

  let usedEarned = 0;
  let paidEarned = 0;
  let deductibleEarned = 0;

  let usedSick = 0;
  let paidSick = 0;
  let deductibleSick = 0;

  let usedCasual = 0;

  let earnedInMonth = 0;
  let paidEarnedInMonth = 0;
  let deductibleEarnedInMonth = 0;

  let sickInMonth = 0;
  let paidSickInMonth = 0;
  let deductibleSickInMonth = 0;

  let casualInMonth = 0;
  let approvedLeaveDaysInMonth = 0;
  const approvedLeaveDatesInMonth = new Set<string>();
  const requestDaysInMonth = new Map<string, number>();

  const earnedUsedByMonth = new Map<string, number>();

  for (const seg of segments) {
    const inTargetMonth = Boolean(targetMonth && seg.month === targetMonth);
    if (inTargetMonth) {
      approvedLeaveDaysInMonth += seg.weight;
      approvedLeaveDatesInMonth.add(seg.date);
      const reqKey = seg.leaveReq?.id ? String(seg.leaveReq.id) : '';
      if (reqKey) {
        requestDaysInMonth.set(reqKey, (requestDaysInMonth.get(reqKey) || 0) + seg.weight);
      }
    }

    if (seg.type === 'Earned') {
      const monthUsedSoFar = earnedUsedByMonth.get(seg.month) || 0;
      const availInMonth = Math.max(0, monthlyEarnedQuota - monthUsedSoFar);
      const availInFY = Math.max(0, earnedQuota - paidEarned);
      const paidAmt = Math.min(seg.weight, availInMonth, availInFY);
      const dedAmt = Math.max(0, seg.weight - paidAmt);

      earnedUsedByMonth.set(seg.month, monthUsedSoFar + seg.weight);
      usedEarned += seg.weight;
      paidEarned += paidAmt;
      deductibleEarned += dedAmt;

      if (inTargetMonth) {
        earnedInMonth += seg.weight;
        paidEarnedInMonth += paidAmt;
        deductibleEarnedInMonth += dedAmt;
      }
    } else if (seg.type === 'Sick') {
      const availSickFY = Math.max(0, sickQuota - usedSick);
      const paidAmt = Math.min(seg.weight, availSickFY);
      const dedAmt = Math.max(0, seg.weight - paidAmt);

      usedSick += seg.weight;
      paidSick += paidAmt;
      deductibleSick += dedAmt;

      if (inTargetMonth) {
        sickInMonth += seg.weight;
        paidSickInMonth += paidAmt;
        deductibleSickInMonth += dedAmt;
      }
    } else {
      usedCasual += seg.weight;
      if (inTargetMonth) {
        casualInMonth += seg.weight;
      }
    }
  }

  return {
    usedEarned,
    paidEarned,
    deductibleEarned,
    usedSick,
    paidSick,
    deductibleSick,
    usedCasual,
    earnedInMonth,
    paidEarnedInMonth,
    deductibleEarnedInMonth,
    sickInMonth,
    paidSickInMonth,
    deductibleSickInMonth,
    casualInMonth,
    totalPaidInMonth: paidEarnedInMonth + paidSickInMonth,
    totalDeductibleInMonth: deductibleEarnedInMonth + deductibleSickInMonth + casualInMonth,
    approvedLeaveDaysInMonth,
    approvedLeaveDatesInMonth,
    requestDaysInMonth,
  };
}
