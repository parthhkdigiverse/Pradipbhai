import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { 
  Award, 
  CheckCircle2, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  Sparkles, 
  ChevronRight, 
  Search,
  Star
} from 'lucide-react';

interface ManagerEvaluationScorecardProps {
  setCurrentPage: (page: string) => void;
}

export function ManagerEvaluationScorecard({ setCurrentPage }: ManagerEvaluationScorecardProps) {
  const { jobs, staff, dailyProgressRecords, workLogs, setActiveFilterIntent } = useData();
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [selectedManagerId, setSelectedManagerId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Identify all managers registered in the system
  const managers = useMemo(() => {
    return (staff || []).filter((s: any) => s.role === 'Manager');
  }, [staff]);

  const targetManager = useMemo(() => {
    if (selectedManagerId === 'all') return null;
    return managers.find(m => m.id === selectedManagerId) || null;
  }, [managers, selectedManagerId]);

  // Per-manager calculated statistics for comparison cards
  const perManagerStats = useMemo(() => {
    return managers.map((mgr: any) => {
      const mName = (mgr.name || '').toLowerCase().trim();

      // Reports verified by this manager
      const verifiedByMgr = (dailyProgressRecords || []).filter((r: any) => {
        const vBy = (r.verifiedBy || r.verified_by || '').toLowerCase().trim();
        return vBy && (vBy === mName || vBy.includes(mName) || mName.includes(vBy));
      });

      // Ratings this manager gave to employees
      const ratedByMgr = verifiedByMgr.filter((r: any) => Number(r.rating) > 0);
      const avgGiven = ratedByMgr.length > 0
        ? (ratedByMgr.reduce((s: number, r: any) => s + Number(r.rating), 0) / ratedByMgr.length).toFixed(1)
        : 'N/A';

      // Manager's own reports rated by Admin
      const ownReports = (dailyProgressRecords || []).filter((r: any) => {
        const eName = (r.employeeName || r.employee_name || '').toLowerCase().trim();
        return eName && (eName === mName || eName.includes(mName) || mName.includes(eName));
      });
      const ratedByAdmin = ownReports.filter((r: any) => Number(r.rating) > 0);
      const adminAvgRating = ratedByAdmin.length > 0
        ? (ratedByAdmin.reduce((s: number, r: any) => s + Number(r.rating), 0) / ratedByAdmin.length).toFixed(1)
        : 'N/A';

      // Manager's shift hours from work logs
      const mgrLogs = (workLogs || []).filter((w: any) => 
        (w.staffId || w.staff_id) === mgr.id || (w.staffName || w.staff_name || '').toLowerCase().trim() === mName
      );
      const shiftHours = mgrLogs.reduce((acc, w) => acc + (Number(w.hours) || (Number(w.duration) / 3600) || 0), 0).toFixed(1);

      // Jobs created by this manager
      const mgrJobs = jobs.filter(j => 
        j.createdBy && j.createdBy.toLowerCase().trim() === mName
      );
      const assignedJobsCount = mgrJobs.filter(j => Boolean(j.teamId || j.assignedStaffId)).length;
      const delegationRate = mgrJobs.length > 0
        ? Math.round((assignedJobsCount / mgrJobs.length) * 100)
        : 100;

      // Individual MPI Calculation
      const supervisionScore = Math.min(100, (verifiedByMgr.length > 0 ? 60 + verifiedByMgr.length * 8 : 80));
      const adminScore = adminAvgRating !== 'N/A' ? (Number(adminAvgRating) / 5) * 100 : 85;
      const mpi = Math.min(100, Math.max(0, Math.round(
        (delegationRate * 0.35) + (supervisionScore * 0.35) + (adminScore * 0.30)
      )));

      return {
        manager: mgr,
        verifiedCount: verifiedByMgr.length,
        avgGivenRating: avgGiven,
        adminAvgRating,
        shiftHours,
        delegationRate,
        jobsCreatedCount: mgrJobs.length,
        mpiScore: mpi,
        statusGrade: mpi >= 85 ? 'Optimal' : mpi >= 65 ? 'Moderate Latency' : 'Action Needed',
        statusColor: mpi >= 85 
          ? 'text-emerald-600 bg-emerald-50 border-emerald-200' 
          : mpi >= 65 
            ? 'text-amber-600 bg-amber-50 border-amber-200' 
            : 'text-rose-600 bg-rose-50 border-rose-200'
      };
    });
  }, [managers, dailyProgressRecords, workLogs, jobs]);

  // -------------------------------------------------------------
  // 1. CALCULATE CORE MANAGER PERFORMANCE METRICS
  // -------------------------------------------------------------
  const evaluationData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mName = targetManager ? (targetManager.name || '').toLowerCase().trim() : null;

    // 1. Delegation & Backlog
    const relevantJobs = mName 
      ? jobs.filter(j => j.createdBy && j.createdBy.toLowerCase().trim() === mName)
      : jobs;
    const activeJobs = (relevantJobs.length > 0 ? relevantJobs : jobs).filter(j => j.status !== 'Completed' && j.status !== 'Done');
    const unassignedJobs = activeJobs.filter(j => !j.teamId && !j.assignedStaffId);
    const assignedJobs = activeJobs.filter(j => Boolean(j.teamId || j.assignedStaffId));
    const delegationRate = activeJobs.length > 0 
      ? Math.round((assignedJobs.length / activeJobs.length) * 100) 
      : 100;

    // 2. On-Time Delivery SLA
    const completedJobsWithDue = (relevantJobs.length > 0 ? relevantJobs : jobs).filter(j => (j.status === 'Completed' || j.status === 'Done') && j.dueDate);
    let onTimeCount = 0;
    completedJobsWithDue.forEach(j => {
      const due = new Date(j.dueDate);
      due.setHours(23, 59, 59, 999);
      const compDate = j.createdAt ? new Date(j.createdAt) : today;
      if (compDate <= due) onTimeCount++;
    });
    const onTimeRate = completedJobsWithDue.length > 0 
      ? Math.round((onTimeCount / completedJobsWithDue.length) * 100) 
      : 95;

    // 3. Review Queue Responsiveness
    const underReviewJobs = (relevantJobs.length > 0 ? relevantJobs : jobs).filter(j => j.status === 'Under Review');

    // 4. Daily Progress Supervision
    const relevantReports = (dailyProgressRecords || []).filter((r: any) => {
      if (!mName) return true;
      const vBy = (r.verifiedBy || r.verified_by || '').toLowerCase().trim();
      return vBy === mName || vBy.includes(mName);
    });

    const totalReports = mName ? Math.max(1, relevantReports.length) : (dailyProgressRecords || []).length;
    const verifiedReports = relevantReports.filter(
      (r: any) => (r.verificationStatus || r.verification_status) === 'Verified'
    ).length;
    const pendingVerificationReports = relevantReports.filter(
      (r: any) => (r.verificationStatus || r.verification_status) === 'Pending'
    ).length;
    const supervisionRate = totalReports > 0 
      ? Math.round((verifiedReports / totalReports) * 100) 
      : 100;

    // Calculate Average Manager Rating across staff
    const ratedReports = relevantReports.filter((r: any) => Number(r.rating) > 0);
    const avgTeamRating = ratedReports.length > 0
      ? (ratedReports.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / ratedReports.length).toFixed(1)
      : '4.5';

    // 5. Time Estimation Variance (Proficiency fit)
    const jobsWithEstimates = (relevantJobs.length > 0 ? relevantJobs : jobs).filter(j => Number(j.estimatedTime) > 0 && Number(j.trackedTime) > 0);
    let totalEstimated = 0;
    let totalTracked = 0;
    jobsWithEstimates.forEach(j => {
      totalEstimated += Number(j.estimatedTime);
      totalTracked += Number(j.trackedTime) / 3600;
    });
    const estimationVariance = totalEstimated > 0 
      ? Math.round(((totalTracked - totalEstimated) / totalEstimated) * 100)
      : 0;

    // 6. Overall Manager Performance Index (MPI) / 100
    let mpiScore = 0;
    mpiScore += (delegationRate * 0.25);
    mpiScore += (onTimeRate * 0.30);
    mpiScore += (Math.max(0, 100 - (underReviewJobs.length * 15)) * 0.25);
    mpiScore += (supervisionRate * 0.20);
    mpiScore = Math.min(100, Math.max(0, Math.round(mpiScore)));

    let statusGrade = 'Optimal';
    let statusColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (mpiScore < 65) {
      statusGrade = 'Action Needed';
      statusColor = 'text-rose-600 bg-rose-50 border-rose-200';
    } else if (mpiScore < 85) {
      statusGrade = 'Moderate Latency';
      statusColor = 'text-amber-600 bg-amber-50 border-amber-200';
    }

    return {
      delegationRate,
      unassignedCount: unassignedJobs.length,
      onTimeRate,
      underReviewCount: underReviewJobs.length,
      supervisionRate,
      pendingVerificationCount: pendingVerificationReports,
      avgTeamRating,
      estimationVariance,
      mpiScore,
      statusGrade,
      statusColor
    };
  }, [jobs, dailyProgressRecords, targetManager]);

  // -------------------------------------------------------------
  // 2. TASK & EMPLOYEE REQUIREMENTS MATCHING MATRIX
  // -------------------------------------------------------------
  const staffMatchMatrix = useMemo(() => {
    const operationalStaff = (staff || []).filter((s: any) => s.role !== 'Admin');

    return operationalStaff.map((member: any) => {
      // Find jobs assigned to this member
      const memberJobs = jobs.filter(j => 
        (j.teamId === member.id || j.assignedStaffId === member.id || j.assignedTo === member.name)
      );
      const activeJobs = memberJobs.filter(j => j.status === 'Progress' || j.status === 'In Progress');
      const pendingJobs = memberJobs.filter(j => j.status === 'Pending');
      const completedJobs = memberJobs.filter(j => j.status === 'Completed' || j.status === 'Done');

      // Calculate tracked hours
      const memberWorklogs = (workLogs || []).filter(w => (w.staffId || w.staff_id) === member.id);
      const totalHoursTracked = memberWorklogs.reduce((sum, w) => sum + (Number(w.hours) || (Number(w.duration) / 3600) || 0), 0);

      // Estimate variance on completed jobs
      let staffEstimated = 0;
      let staffTracked = 0;
      completedJobs.forEach(j => {
        if (Number(j.estimatedTime) > 0) {
          staffEstimated += Number(j.estimatedTime);
          staffTracked += Number(j.trackedTime) / 3600;
        }
      });
      const staffVariance = staffEstimated > 0 
        ? Math.round(((staffTracked - staffEstimated) / staffEstimated) * 100)
        : 0;

      // Rating from Daily Progress
      const memberReports = (dailyProgressRecords || []).filter((r: any) => 
        (r.employeeName || r.employee_name)?.toLowerCase() === member.name?.toLowerCase() && Number(r.rating) > 0
      );
      const avgRating = memberReports.length > 0 
        ? (memberReports.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / memberReports.length).toFixed(1)
        : 'N/A';

      // Match Status Evaluation
      let matchStatus = 'Optimal Fit';
      let matchBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      let matchReason = 'Balanced workload, good estimation fidelity, and strong output rating.';

      if (activeJobs.length === 0 && pendingJobs.length === 0) {
        matchStatus = 'Under-Utilized';
        matchBadge = 'bg-slate-100 text-slate-700 border-slate-300';
        matchReason = 'Employee currently has no assigned active tasks. Capacity is waiting.';
      } else if (activeJobs.length >= 3 || (activeJobs.length + pendingJobs.length) >= 5) {
        matchStatus = 'At Capacity';
        matchBadge = 'bg-amber-50 text-amber-700 border-amber-300';
        matchReason = 'High concurrent task load. Delay risk if more urgent work is assigned.';
      } else if (staffVariance > 35 && avgRating !== 'N/A' && Number(avgRating) < 3.5) {
        matchStatus = 'Skill Gap / Overrun';
        matchBadge = 'bg-rose-50 text-rose-700 border-rose-300';
        matchReason = 'Consistently takes +35% more time than estimated with lower review score.';
      } else if (staffVariance < -20 && completedJobs.length >= 3) {
        matchStatus = 'High Velocity';
        matchBadge = 'bg-indigo-50 text-indigo-700 border-indigo-300';
        matchReason = 'Executes tasks significantly faster than estimated. Ready for complex work.';
      }

      return {
        id: member.id,
        name: member.name,
        role: member.role || 'Production Staff',
        email: member.email,
        activeJobsCount: activeJobs.length,
        pendingJobsCount: pendingJobs.length,
        completedJobsCount: completedJobs.length,
        totalHours: Number(totalHoursTracked.toFixed(1)),
        variance: staffVariance,
        avgRating,
        matchStatus,
        matchBadge,
        matchReason
      };
    });
  }, [staff, jobs, workLogs, dailyProgressRecords]);

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffMatchMatrix.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            member.role.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (selectedStaffFilter === 'all') return true;
      if (selectedStaffFilter === 'optimal') return member.matchStatus === 'Optimal Fit' || member.matchStatus === 'High Velocity';
      if (selectedStaffFilter === 'capacity') return member.matchStatus === 'At Capacity';
      if (selectedStaffFilter === 'gap') return member.matchStatus === 'Skill Gap / Overrun';
      if (selectedStaffFilter === 'idle') return member.matchStatus === 'Under-Utilized';
      return true;
    });
  }, [staffMatchMatrix, searchQuery, selectedStaffFilter]);

  // Quick navigation helper
  const handleDrilldown = (page: string, filterOptions: any) => {
    setActiveFilterIntent({ page, filters: filterOptions });
    setCurrentPage(page);
  };

  return (
    <div className="w-full bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header section with toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-transparent flex items-center justify-center text-primary shadow-inner">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">Manager & Floor Evaluation Scorecard</h2>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${evaluationData.statusColor}`}>
                {evaluationData.statusGrade}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Admin audit tools to verify whether tasks and employee skills/capacity are properly matched
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
          {/* Manager Selector Dropdown */}
          {managers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200/90 rounded-2xl px-3 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Manager:</span>
              <select
                id="manager-scorecard-select"
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="text-xs font-bold bg-transparent text-gray-800 focus:outline-none cursor-pointer"
              >
                <option value="all">🏢 All Managers (Floor Overview)</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>👤 {m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Overall Score Badge */}
          <div className="flex items-center gap-2.5 bg-gradient-to-r from-gray-50 to-primary/5 px-4 py-2 rounded-2xl border border-primary/20 shadow-xs">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {targetManager ? `${targetManager.name} Index` : 'Manager Index'}
              </span>
              <span className="text-lg font-black text-primary leading-tight">{evaluationData.mpiScore}/100</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm font-bold text-sm">
              <Award className="w-5 h-5" />
            </div>
          </div>

          <button 
            id="toggle-manager-scorecard-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
          >
            {isExpanded ? 'Collapse' : 'Expand Matrix'}
          </button>
        </div>
      </div>

      {/* If a specific manager is selected, show banner */}
      {targetManager && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white font-black flex items-center justify-center text-sm shadow-sm">
              {targetManager.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm">{targetManager.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${evaluationData.statusColor}`}>
                  {evaluationData.statusGrade} ({evaluationData.mpiScore}/100)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Admin Evaluation: <strong className="text-amber-600">{perManagerStats.find(p => p.manager.id === targetManager.id)?.adminAvgRating || 'N/A'} ★</strong> • Total Shift: <strong>{perManagerStats.find(p => p.manager.id === targetManager.id)?.shiftHours || '0'} hrs</strong> • Reports Verified: <strong>{perManagerStats.find(p => p.manager.id === targetManager.id)?.verifiedCount || 0}</strong>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setSelectedManagerId('all')}
            className="text-xs font-bold text-primary hover:text-primary/80 bg-white border border-primary/30 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer transition-colors"
          >
            Show All Managers
          </button>
        </div>
      )}

      {/* If "all" is selected and there are multiple managers, show comparison cards */}
      {!targetManager && managers.length > 1 && (
        <div className="bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80 border border-gray-200/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Active Floor Managers ({managers.length})</span>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">Click any manager card to inspect individual metrics</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {perManagerStats.map(({ manager, verifiedCount, adminAvgRating, shiftHours, mpiScore, statusColor }) => (
              <div 
                key={manager.id}
                onClick={() => setSelectedManagerId(manager.id)}
                className="bg-white border border-gray-200 hover:border-primary/50 hover:shadow-md p-3.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                      {manager.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xs group-hover:text-primary transition-colors">{manager.name}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{manager.email || 'Manager'}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {mpiScore}/100
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-gray-100 text-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Shift</span>
                    <span className="text-xs font-bold text-gray-700">{shiftHours}h</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Supervised</span>
                    <span className="text-xs font-bold text-teal-700">{verifiedCount} rpts</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Admin Rating</span>
                    <span className="text-xs font-bold text-amber-600">{adminAvgRating} ★</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Core Pillars Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Delegation Health */}
        <div 
          onClick={() => handleDrilldown('jobs', { staff: 'Unassigned', status: 'All', type: 'All' })}
          className="bg-white/80 border border-gray-100 hover:border-primary/40 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">1. Task Delegation</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${evaluationData.unassignedCount === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {evaluationData.unassignedCount === 0 ? 'Zero Backlog' : `${evaluationData.unassignedCount} Unassigned`}
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-800">{evaluationData.delegationRate}%</div>
            <p className="text-[11px] text-gray-400 font-medium">Floor tasks actively assigned to staff</p>
          </div>
          <div className="text-[11px] text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>View Unassigned Backlog</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Pillar 2: SLA & Deadlines */}
        <div 
          onClick={() => handleDrilldown('jobs', { status: 'Pending', type: 'All' })}
          className="bg-white/80 border border-gray-100 hover:border-purple-300 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">2. Delivery SLA</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
              {evaluationData.onTimeRate >= 90 ? 'Target Achieved' : 'Lag Warning'}
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-800">{evaluationData.onTimeRate}%</div>
            <p className="text-[11px] text-gray-400 font-medium">On-time completions vs Due Date</p>
          </div>
          <div className="text-[11px] text-purple-600 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Inspect Overdue Delays</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Pillar 3: Review Queue */}
        <div 
          onClick={() => handleDrilldown('jobs', { status: 'Under Review', type: 'All' })}
          className="bg-white/80 border border-gray-100 hover:border-amber-300 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">3. Review Velocity</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${evaluationData.underReviewCount <= 2 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {evaluationData.underReviewCount <= 2 ? 'Queue Fast' : 'Review Queue'}
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-800">{evaluationData.underReviewCount}</div>
            <p className="text-[11px] text-gray-400 font-medium">Jobs waiting for manager sign-off</p>
          </div>
          <div className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Open Review Approvals</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Pillar 4: Daily Supervision */}
        <div 
          onClick={() => setCurrentPage('dailyProgress')}
          className="bg-white/80 border border-gray-100 hover:border-teal-300 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">4. Daily Supervision</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
              Avg {evaluationData.avgTeamRating} ★
            </span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-800">{evaluationData.supervisionRate}%</div>
            <p className="text-[11px] text-gray-400 font-medium">Reports verified with feedback ({evaluationData.pendingVerificationCount} pending)</p>
          </div>
          <div className="text-[11px] text-teal-600 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            <span>Audit Daily Progress</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Expanded Match Matrix: Task & Employee Requirements */}
      {isExpanded && (
        <div className="flex flex-col gap-4 bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Employee Task Matching & Capacity Matrix
              </h3>
              <p className="text-xs text-gray-500">
                Audits if staff capabilities, estimated times, and active workloads match current job assignments
              </p>
            </div>

            {/* Filter pills & search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44"
                />
              </div>

              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses ({staffMatchMatrix.length})</option>
                <option value="optimal">🟢 Optimal Fit</option>
                <option value="capacity">🟡 At Capacity</option>
                <option value="gap">🔴 Skill / Time Gap</option>
                <option value="idle">⚪ Under-Utilized</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200/90 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Employee & Role</th>
                  <th className="py-3 px-3">Active Tasks</th>
                  <th className="py-3 px-3">Logged Hours</th>
                  <th className="py-3 px-3">Est. Time Variance</th>
                  <th className="py-3 px-3">Avg Rating</th>
                  <th className="py-3 px-4">Matching Evaluation</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400 font-medium">
                      No staff members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <div className="font-bold text-gray-800">{member.name}</div>
                        <div className="text-[11px] text-gray-400 font-normal">{member.role}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={`w-2 h-2 rounded-full ${member.activeJobsCount > 0 ? 'bg-primary animate-pulse' : 'bg-gray-300'}`}></span>
                          <span>{member.activeJobsCount} In-Progress</span>
                          {member.pendingJobsCount > 0 && (
                            <span className="text-[10px] text-gray-400 font-normal">({member.pendingJobsCount} queued)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-700">
                        {member.totalHours} hrs
                      </td>
                      <td className="py-3 px-3">
                        <span className={`font-bold inline-flex items-center gap-0.5 ${
                          member.variance > 25 ? 'text-rose-600' : member.variance < -15 ? 'text-indigo-600' : 'text-emerald-600'
                        }`}>
                          {member.variance > 0 ? `+${member.variance}%` : `${member.variance}%`}
                          {member.variance > 25 ? (
                            <TrendingUp className="w-3 h-3 text-rose-500" />
                          ) : member.variance < -15 ? (
                            <TrendingDown className="w-3 h-3 text-indigo-500" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-amber-600">
                        {member.avgRating !== 'N/A' ? (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {member.avgRating}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] font-normal">No Ratings</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 max-w-xs">
                          <span className={`w-fit text-[10px] font-bold px-2 py-0.5 rounded-md border ${member.matchBadge}`}>
                            {member.matchStatus}
                          </span>
                          <span className="text-[11px] text-gray-500 leading-tight">
                            {member.matchReason}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleDrilldown('jobs', { staff: member.id, status: 'All', type: 'All' })}
                          className="text-primary hover:text-primary/80 font-bold text-[11px] hover:underline cursor-pointer"
                        >
                          View Jobs →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Guidance Box */}
          <div className="p-3 bg-white rounded-xl border border-gray-200/80 text-xs text-gray-600 flex items-start gap-2.5 shadow-2xs">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Admin Guidance:</strong> If a staff member has high time overrun (<span className="text-rose-600 font-bold">+30%</span>) and lower manager review ratings, the manager should either reduce task complexity, provide a clearer design brief, or reassign high-stakes client tasks to senior specialists.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
