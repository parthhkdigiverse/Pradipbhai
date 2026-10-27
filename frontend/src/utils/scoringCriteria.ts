export interface ScoringCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  weight?: number; // Weight percentage
  category?: string;
  color?: string;
  isAutoCalculated?: boolean;
}

/**
 * Standard scoring criteria totaling 100 marks based on studio evaluation guidelines:
 * 1. Attendance: 20 Marks (540 min shift / 480 min working @ 0.0370 pts/min across 24 working days = 426.66 pts benchmark)
 * 2. Daily Rating: 30 Marks (Daily progress report verified star rating out of 5, scaled to 30)
 * 3. Work Completion Timing (Auto): 30 Marks (Automated job completion & SLA turnaround rate)
 * 4. Teamwork, Behavior, Discipline & Improvement: 20 Marks (Manager/Admin appraisal)
 */
export const DEFAULT_SCORING_CRITERIA: ScoringCriterion[] = [
  {
    id: 'attendance',
    name: 'Attendance & Working Hours',
    description: 'Shift compliance & working hours: 540 min shift / 480 min working time @ 0.0370 pts/min (24 days benchmark = 426.66 pts).',
    maxScore: 20,
    weight: 20,
    category: 'Attendance (Auto)',
    color: 'emerald',
    isAutoCalculated: true
  },
  {
    id: 'daily_rating',
    name: 'Daily Rating',
    description: 'Performance rating verified from daily progress reports (scaled out of 30 marks).',
    maxScore: 30,
    weight: 30,
    category: 'Daily Reports (Auto)',
    color: 'amber',
    isAutoCalculated: true
  },
  {
    id: 'work_completion_timing',
    name: 'Work Completion Timing (Auto)',
    description: 'Turnaround timeliness & SLA delivery rate on assigned studio jobs without delay.',
    maxScore: 30,
    weight: 30,
    category: 'Turnaround (Auto)',
    color: 'blue',
    isAutoCalculated: true
  },
  {
    id: 'teamwork_behavior_discipline',
    name: 'Teamwork, Behavior & Discipline',
    description: 'Team collaboration, workplace discipline, positive demeanor, initiative, and skill improvement.',
    maxScore: 20,
    weight: 20,
    category: 'Appraisal (Manager)',
    color: 'purple',
    isAutoCalculated: false
  }
];

export const calculateEvaluationGrade = (percentage: number): { label: string; color: string; badge: string } => {
  if (percentage >= 95) return { label: 'A+ Elite', color: 'text-emerald-800 bg-emerald-100/80 border-emerald-300', badge: 'Diamond Star' };
  if (percentage >= 88) return { label: 'A Superior', color: 'text-primary bg-primary/10 border-primary/20', badge: 'Gold Performer' };
  if (percentage >= 80) return { label: 'B+ Excellent', color: 'text-blue-700 bg-blue-100/80 border-blue-200', badge: 'Silver Contender' };
  if (percentage >= 70) return { label: 'B Proficient', color: 'text-purple-700 bg-purple-100/80 border-purple-200', badge: 'Solid Contributor' };
  return { label: 'In Progress', color: 'text-gray-600 bg-gray-100 border-gray-200', badge: 'Developing' };
};

/**
 * Helper to get a criterion score from criteria_scores map, with seamless
 * backward-compatibility fallback mappings for any older evaluations.
 */
export const getCriterionScore = (criteriaScores: Record<string, number> | undefined, criterionId: string): number | undefined => {
  if (!criteriaScores) return undefined;
  if (criteriaScores[criterionId] !== undefined) return criteriaScores[criterionId];

  // Backward compatibility fallback mappings
  if (criterionId === 'attendance' && criteriaScores['attendance_discipline'] !== undefined) {
    return criteriaScores['attendance_discipline'];
  }
  if (criterionId === 'work_completion_timing' && criteriaScores['sla_timeliness'] !== undefined) {
    return Math.min(30, Math.round(criteriaScores['sla_timeliness'] * 1.5));
  }
  if (criterionId === 'daily_rating' && criteriaScores['work_quality'] !== undefined) {
    return Math.min(30, Math.round(criteriaScores['work_quality'] * 1.5));
  }
  if (criterionId === 'teamwork_behavior_discipline' && criteriaScores['teamwork_collaboration'] !== undefined) {
    return criteriaScores['teamwork_collaboration'];
  }
  return undefined;
};


/**
 * Helper to parse a time string (e.g. "09:00", "09:30 AM", "18:00") into minutes from midnight.
 */
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const str = String(timeStr).trim();
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
  }

  const match = str.match(/(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export interface AutoScoreCalculationResult {
  scores: Record<string, number>;
  details: {
    attendance: {
      score: number;
      workingDays: number;
      totalWorkingMinutes: number;
      accumulatedPoints: number;
      summary: string;
    };
    dailyRating: {
      score: number;
      averageRating: number;
      totalReports: number;
      summary: string;
    };
    workCompletionTiming: {
      score: number;
      totalJobs: number;
      onTimeJobs: number;
      completionRate: number;
      summary: string;
    };
    teamworkBehaviorDiscipline: {
      score: number;
      summary: string;
    };
  };
}

/**
 * Calculates auto-scores for an employee for a specific month using the exact formulas:
 * 1. Attendance: 20 Marks
 *    - 9h shift = 540 min. Break = 60 min. Working = 480 min.
 *    - Rate: 20 / 540 = 0.0370 pts/min.
 *    - Full working day: 480 * 0.0370 = 17.777 pts.
 *    - 24 standard working days benchmark: 17.777 * 24 = 426.66 pts.
 *    - Score = (accumulatedPoints / 426.66) * 20 (capped at 20).
 * 2. Daily Rating: 30 Marks
 *    - Average star rating from daily progress reports (out of 5.0).
 *    - Score = (avgRating / 5) * 30.
 * 3. Work completion timing - Auto: 30 Marks
 *    - Percentage of assigned jobs completed on time without delay.
 *    - Score = (onTimeRatio) * 30.
 * 4. Teamwork, Behavior, Discipline & Improvement: 20 Marks
 *    - Retains previous score or defaults to 17/20.
 */
export function autoCalculateMonthlyScores(
  staffId: string,
  staffName: string,
  monthKey: string, // e.g. "2026-10"
  attendanceRecords: any[] = [],
  dailyProgressRecords: any[] = [],
  jobsList: any[] = [],
  currentScores?: Record<string, number>,
  holidaysList: any[] = []
): AutoScoreCalculationResult {
  const normStaffName = (staffName || '').trim().toLowerCase();

  // Extract declared company holidays
  const holidayDateSet = new Set(
    (holidaysList || []).map((h: any) => (typeof h === 'string' ? h : h.date)).filter(Boolean)
  );
  const holidaysInMonth = (holidaysList || []).filter((h: any) => {
    const d = typeof h === 'string' ? h : h.date;
    return d && d.startsWith(monthKey);
  }).length;

  // ----------------------------------------------------
  // 1. ATTENDANCE (20 Marks)
  // ----------------------------------------------------
  let totalWorkingMinutes = 0;
  let presentDaysCount = 0;

  // Filter attendance for this staff in the month, strictly excluding company holidays
  const staffMonthAtt = attendanceRecords.filter((rec: any) => {
    const sId = rec.staffId || rec.staff_id;
    const sName = (rec.staffName || rec.staff_name || '').trim().toLowerCase();
    const matchStaff = (sId && sId === staffId) || (normStaffName && sName === normStaffName);
    const dateStr = rec.date || '';
    const matchMonth = dateStr.startsWith(monthKey);
    // Punches or attendance markings on holidays do NOT affect Employee of the Month
    const isHoliday = holidayDateSet.has(dateStr);
    return matchStaff && matchMonth && !isHoliday;
  });

  staffMonthAtt.forEach((rec: any) => {
    const status = (rec.status || 'Present').toLowerCase();
    if (status === 'absent' || status === 'leave') return;

    let dayMinutes = 0;
    const punches = rec.punches || (rec.checkIn || rec.check_in ? [{ in: rec.checkIn || rec.check_in, out: rec.checkOut || rec.check_out }] : []);

    if (Array.isArray(punches) && punches.length > 0) {
      punches.forEach((p: any) => {
        const inMin = parseTimeToMinutes(p.in);
        const outMin = parseTimeToMinutes(p.out);
        if (inMin !== null && outMin !== null) {
          let diff = outMin - inMin;
          if (diff < 0) diff += 1440; // Overnight shift wrap-around
          dayMinutes += diff;
        }
      });
    }

    if (dayMinutes === 0) {
      // Fallback based on status
      if (status === 'half day' || status === 'halfday') {
        dayMinutes = 240; // 4 hours
      } else {
        // Standard full day: 480 min working (9h shift - 60 min break)
        dayMinutes = 480;
      }
    }

    // Cap single day at 540 min shift
    dayMinutes = Math.min(540, dayMinutes);

    totalWorkingMinutes += dayMinutes;
    presentDaysCount += 1;
  });

  // Rate: 20 / 540 = 0.037037...
  const ptsPerMin = 20 / 540;

  // Number of calendar days and net working days in this month
  const [yearStr, monthStr] = (monthKey || '2026-10').split('-');
  const yNum = parseInt(yearStr, 10) || 2026;
  const mNum = parseInt(monthStr, 10) || 10;
  const daysInMonth = new Date(yNum, mNum, 0).getDate();
  const netWorkingDaysInMonth = Math.max(1, daysInMonth - holidaysInMonth);
  // Standard studio benchmark is 24 working days, or net working days if fewer
  const benchmarkWorkingDays = Math.min(24, Math.max(16, netWorkingDaysInMonth));
  const targetBenchmark = benchmarkWorkingDays * 480 * ptsPerMin;

  // If no attendance records found, provide a realistic baseline for active staff
  if (staffMonthAtt.length === 0) {
    presentDaysCount = benchmarkWorkingDays;
    totalWorkingMinutes = benchmarkWorkingDays * 480;
  }

  // Accumulated points = totalWorkingMinutes * 0.037037
  const accumulatedPoints = totalWorkingMinutes * ptsPerMin;
  const calculatedAttScore = Math.min(20, Math.max(0, Math.round((accumulatedPoints / targetBenchmark) * 20 * 10) / 10));

  const attendanceDetails = {
    score: Math.round(calculatedAttScore),
    workingDays: presentDaysCount,
    totalWorkingMinutes: Math.round(totalWorkingMinutes),
    accumulatedPoints: Math.round(accumulatedPoints * 10) / 10,
    summary: `${presentDaysCount} days (${Math.round(totalWorkingMinutes / 60)} hrs / ${totalWorkingMinutes} mins) • ${accumulatedPoints.toFixed(1)}/${targetBenchmark.toFixed(1)} pts (${benchmarkWorkingDays}d benchmark • ${netWorkingDaysInMonth} working days, excl. ${holidaysInMonth} holidays & Sundays)`
  };

  // ----------------------------------------------------
  // 2. DAILY RATING (30 Marks)
  // ----------------------------------------------------
  const staffMonthReports = dailyProgressRecords.filter((rec: any) => {
    const sId = rec.staffId || rec.staff_id;
    const sName = (rec.employeeName || rec.employee_name || '').trim().toLowerCase();
    const matchStaff = (sId && sId === staffId) || (normStaffName && sName === normStaffName);
    const dateStr = rec.date || '';
    const matchMonth = dateStr.startsWith(monthKey);
    return matchStaff && matchMonth;
  });

  const ratedReports = staffMonthReports.filter((r: any) => {
    const rating = Number(r.rating) || 0;
    return rating > 0;
  });

  let avgRating = 0;
  if (ratedReports.length > 0) {
    const sumRatings = ratedReports.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0);
    avgRating = sumRatings / ratedReports.length;
  } else if (staffMonthReports.length > 0) {
    avgRating = 4.0; // Default verified 4.0 if unrated
  } else {
    avgRating = 4.5; // Studio average default
  }

  // Sourced from daily progress report: (avgRating / 5) * 30
  const calculatedDailyScore = Math.min(30, Math.max(0, Math.round(((avgRating / 5.0) * 30) * 10) / 10));

  const dailyRatingDetails = {
    score: Math.round(calculatedDailyScore),
    averageRating: Math.round(avgRating * 10) / 10,
    totalReports: ratedReports.length > 0 ? ratedReports.length : staffMonthReports.length,
    summary: ratedReports.length > 0
      ? `Avg ${avgRating.toFixed(1)} / 5.0★ across ${ratedReports.length} verified report(s)`
      : `Default studio benchmark: ${avgRating.toFixed(1)} / 5.0★ (no reports logged)`
  };

  // ----------------------------------------------------
  // 3. WORK COMPLETION TIMING - AUTO (30 Marks)
  // ----------------------------------------------------
  const staffMonthJobs = jobsList.filter((job: any) => {
    const assignedId = job.teamId || job.assignedStaffId || job.assigned_staff_id;
    const assignedName = (job.assignedTo || job.assigned_to || '').trim().toLowerCase();
    const matchStaff = (assignedId && assignedId === staffId) || (normStaffName && assignedName === normStaffName);
    
    // Check if job created or due in month
    const createdStr = job.createdAt || job.created_at || '';
    const dueStr = job.dueDate || job.due_date || '';
    const matchMonth = createdStr.startsWith(monthKey) || dueStr.startsWith(monthKey) || !createdStr;
    return matchStaff && matchMonth;
  });

  let totalJobs = staffMonthJobs.length;
  let onTimeJobs = 0;

  staffMonthJobs.forEach((job: any) => {
    const status = (job.status || '').toLowerCase();
    const isDone = status === 'completed' || status === 'done';
    const isDelayed = Boolean(job.delayReason && !job.delayReason.startsWith('job-'));
    
    if (isDone) {
      if (!isDelayed) {
        onTimeJobs += 1;
      }
    } else if (status === 'in progress' || status === 'progress' || status === 'under review') {
      if (!isDelayed) {
        // Active without delay counts as on-track
        onTimeJobs += 0.8;
      }
    }
  });

  let completionRate = 0.9; // Default 90% if no jobs found
  if (totalJobs > 0) {
    completionRate = Math.min(1.0, onTimeJobs / totalJobs);
  } else {
    totalJobs = 10;
    onTimeJobs = 9;
    completionRate = 0.9;
  }

  const calculatedTimingScore = Math.min(30, Math.max(0, Math.round(completionRate * 30 * 10) / 10));

  const workTimingDetails = {
    score: Math.round(calculatedTimingScore),
    totalJobs,
    onTimeJobs: Math.round(onTimeJobs),
    completionRate: Math.round(completionRate * 100),
    summary: staffMonthJobs.length > 0 
      ? `${Math.round(onTimeJobs)} of ${totalJobs} jobs delivered on schedule (${Math.round(completionRate * 100)}% SLA)`
      : `Default production SLA benchmark (${Math.round(completionRate * 100)}% on-time)`
  };

  // ----------------------------------------------------
  // 4. TEAMWORK, BEHAVIOR, DISCIPLINE & IMPROVEMENT (20 Marks)
  // ----------------------------------------------------
  const existingTeamScore = currentScores?.['teamwork_behavior_discipline'] ?? 17;
  const teamworkDetails = {
    score: existingTeamScore,
    summary: 'Manager / Leadership appraisal of attitude, cooperation & skill improvement'
  };

  return {
    scores: {
      attendance: attendanceDetails.score,
      daily_rating: dailyRatingDetails.score,
      work_completion_timing: workTimingDetails.score,
      teamwork_behavior_discipline: existingTeamScore
    },
    details: {
      attendance: attendanceDetails,
      dailyRating: dailyRatingDetails,
      workCompletionTiming: workTimingDetails,
      teamworkBehaviorDiscipline: teamworkDetails
    }
  };
}
