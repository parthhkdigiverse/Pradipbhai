import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { EmployeeEvaluationRecord } from '../context/DataContext';
import { 
  DEFAULT_SCORING_CRITERIA, 
  calculateEvaluationGrade, 
  autoCalculateMonthlyScores,
  getCriterionScore
} from '../utils/scoringCriteria';
import type { AutoScoreCalculationResult } from '../utils/scoringCriteria';
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  Plus, 
  Search, 
  Calendar, 
  Sliders, 
  Edit3, 
  Trash2, 
  TrendingUp, 
  Flame, 
  X
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export function EmployeeOfMonthPage() {
  const { 
    staff, 
    currentUserRole, 
    currentUser, 
    employeeEvaluations, 
    addOrUpdateEvaluation, 
    crownWinner, 
    deleteEvaluation,
    attendance,
    dailyProgressRecords,
    jobs
  } = useData();

  const isAdmin = currentUserRole === 'Admin';
  const isManager = currentUserRole === 'Manager';
  const canEvaluate = isAdmin || isManager;

  // Month selector - Default to October 2026 (or current)
  const currentMonthKey = '2026-10';
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Evaluation modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeEvalId, setActiveEvalId] = useState<string | null>(null);

  // Form states in modal
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    DEFAULT_SCORING_CRITERIA.forEach(c => {
      init[c.id] = Math.round(c.maxScore * 0.85);
    });
    return init;
  });
  const [managerRemarks, setManagerRemarks] = useState<string>('');
  const [isWinnerChecked, setIsWinnerChecked] = useState<boolean>(false);
  const [badgeTitle, setBadgeTitle] = useState<string>('Star Performer');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [autoCalcDetails, setAutoCalcDetails] = useState<AutoScoreCalculationResult['details'] | null>(null);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Success toast state
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  // Available months list
  const availableMonths = [
    { key: '2026-10', label: 'October 2026' },
    { key: '2026-09', label: 'September 2026' },
    { key: '2026-08', label: 'August 2026' },
    { key: '2026-07', label: 'July 2026' },
    { key: '2026-06', label: 'June 2026' },
  ];

  // Eligible employees for evaluation (excluding Admin)
  const eligibleStaff = useMemo(() => {
    return (staff || []).filter((s: any) => {
      const role = (s.role || '').toLowerCase();
      if (isAdmin) return role !== 'admin';
      if (isManager) return role !== 'admin' && role !== 'manager';
      return true;
    });
  }, [staff, isAdmin, isManager]);

  // Current month evaluations
  const monthEvaluations = useMemo(() => {
    return (employeeEvaluations || [])
      .filter((e) => e.month === selectedMonth)
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  }, [employeeEvaluations, selectedMonth]);

  // Reigning winner for this month
  const reigningWinner = useMemo(() => {
    return monthEvaluations.find((e) => e.is_winner) || null;
  }, [monthEvaluations]);

  // Top 3 Podium
  const topThree = useMemo(() => {
    return monthEvaluations.slice(0, 3);
  }, [monthEvaluations]);

  // Filtered evaluations for table
  const filteredEvaluations = useMemo(() => {
    return monthEvaluations.filter((ev) => {
      const matchesSearch = 
        ev.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.employee_role || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = 
        departmentFilter === 'all' || 
        (ev.employee_role || '').toLowerCase().includes(departmentFilter.toLowerCase());

      return matchesSearch && matchesDept;
    });
  }, [monthEvaluations, searchQuery, departmentFilter]);

  // Calculate live modal score
  const modalCalculations = useMemo(() => {
    let total = 0;
    let maxTotal = 0;
    DEFAULT_SCORING_CRITERIA.forEach(c => {
      const score = Number(criteriaScores[c.id]) || 0;
      total += score;
      maxTotal += c.maxScore;
    });
    const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100 * 10) / 10 : 0;
    const grade = calculateEvaluationGrade(percentage);
    return { total, maxTotal, percentage, grade };
  }, [criteriaScores]);

  // Helper to run auto-calculation for a staff member
  const runAutoCalculation = (staffIdToCalc: string) => {
    const targetStaff = staff.find((s: any) => s.id === staffIdToCalc);
    const staffName = targetStaff?.name || '';
    const result = autoCalculateMonthlyScores(
      staffIdToCalc,
      staffName,
      selectedMonth,
      attendance,
      dailyProgressRecords,
      jobs,
      criteriaScores
    );
    setCriteriaScores(result.scores);
    setAutoCalcDetails(result.details);
    return result;
  };

  // Switch employee selection in modal
  const handleStaffSelectChange = (newStaffId: string) => {
    setSelectedStaffId(newStaffId);
    runAutoCalculation(newStaffId);
  };

  // Open modal for new score
  const handleOpenAddModal = (preselectedStaffId?: string) => {
    setModalMode('create');
    setActiveEvalId(null);
    const staffId = preselectedStaffId || (eligibleStaff[0]?.id || '');
    setSelectedStaffId(staffId);
    
    // Auto-calculate scores for preselected staff
    const targetStaff = staff.find((s: any) => s.id === staffId);
    const result = autoCalculateMonthlyScores(
      staffId,
      targetStaff?.name || '',
      selectedMonth,
      attendance,
      dailyProgressRecords,
      jobs
    );
    setCriteriaScores(result.scores);
    setAutoCalcDetails(result.details);

    setManagerRemarks('');
    setIsWinnerChecked(false);
    setBadgeTitle('Star Performer');
    setIsModalOpen(true);
  };

  // Open modal to edit existing evaluation
  const handleOpenEditModal = (evalRecord: EmployeeEvaluationRecord) => {
    setModalMode('edit');
    setActiveEvalId(evalRecord.id);
    setSelectedStaffId(evalRecord.employee_id);
    
    const scores: Record<string, number> = {};
    DEFAULT_SCORING_CRITERIA.forEach(c => {
      scores[c.id] = getCriterionScore(evalRecord.criteria_scores, c.id) ?? Math.round(c.maxScore * 0.85);
    });
    setCriteriaScores(scores);

    const targetStaff = staff.find((s: any) => s.id === evalRecord.employee_id);
    const result = autoCalculateMonthlyScores(
      evalRecord.employee_id,
      targetStaff?.name || evalRecord.employee_name,
      selectedMonth,
      attendance,
      dailyProgressRecords,
      jobs,
      scores
    );
    setAutoCalcDetails(result.details);

    setManagerRemarks(evalRecord.manager_remarks || '');
    setIsWinnerChecked(evalRecord.is_winner || false);
    setBadgeTitle(evalRecord.badge || 'Star Performer');
    setIsModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveEvalId(null);
  };

  // Auto-score all eligible staff in bulk
  const handleAutoScoreAllEligible = async () => {
    if (!eligibleStaff.length) return;
    try {
      let createdCount = 0;
      for (const st of eligibleStaff) {
        const existing = monthEvaluations.find(e => e.employee_id === st.id);
        const auto = autoCalculateMonthlyScores(
          st.id,
          st.name,
          selectedMonth,
          attendance,
          dailyProgressRecords,
          jobs
        );
        let total = 0;
        let maxTotal = 0;
        DEFAULT_SCORING_CRITERIA.forEach(c => {
          total += (auto.scores[c.id] ?? 0);
          maxTotal += c.maxScore;
        });
        const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100 * 10) / 10 : 0;
        const grade = calculateEvaluationGrade(percentage);

        const evalPayload: Partial<EmployeeEvaluationRecord> = {
          ...(existing ? { id: existing.id } : {}),
          employee_id: st.id,
          employee_name: st.name,
          employee_role: st.role || 'Team Member',
          month: selectedMonth,
          year: parseInt(selectedMonth.split('-')[0], 10) || 2026,
          criteria_scores: auto.scores,
          total_score: total,
          max_score: maxTotal,
          percentage: percentage,
          is_winner: existing ? existing.is_winner : false,
          badge: grade.badge,
          manager_remarks: existing?.manager_remarks || `Automated studio scorecard for ${availableMonths.find(m => m.key === selectedMonth)?.label}.`,
          evaluated_by: currentUser.name || (isAdmin ? 'Admin' : 'Manager'),
          evaluated_by_role: currentUserRole
        };
        await addOrUpdateEvaluation(evalPayload);
        createdCount++;
      }
      setCelebrationMessage(`⚡ Successfully auto-scored ${createdCount} staff member(s) based on attendance, daily reports, and job SLAs!`);
      setTimeout(() => setCelebrationMessage(null), 6000);
    } catch (err) {
      console.error('Failed to auto-score all:', err);
    }
  };

  // Submit Evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;

    const targetStaff = staff.find((s: any) => s.id === selectedStaffId);
    if (!targetStaff) return;

    setIsSubmitting(true);
    try {
      const evalPayload: Partial<EmployeeEvaluationRecord> = {
        ...(activeEvalId ? { id: activeEvalId } : {}),
        employee_id: targetStaff.id,
        employee_name: targetStaff.name,
        employee_role: targetStaff.role || 'Team Member',
        month: selectedMonth,
        year: parseInt(selectedMonth.split('-')[0], 10) || 2026,
        criteria_scores: criteriaScores,
        total_score: modalCalculations.total,
        max_score: modalCalculations.maxTotal,
        percentage: modalCalculations.percentage,
        is_winner: isWinnerChecked,
        badge: badgeTitle,
        manager_remarks: managerRemarks,
        evaluated_by: currentUser.name || (isAdmin ? 'Admin' : 'Manager'),
        evaluated_by_role: currentUserRole
      };

      await addOrUpdateEvaluation(evalPayload);
      handleCloseModal();

      if (isWinnerChecked) {
        setCelebrationMessage(`🎉 ${targetStaff.name} has been crowned Employee of the Month!`);
        setTimeout(() => setCelebrationMessage(null), 5000);
      }
    } catch (err) {
      console.error('Failed to save evaluation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Crown winner action
  const handleCrownWinner = async (evalId: string, name: string) => {
    try {
      await crownWinner(evalId);
      setCelebrationMessage(`🏆 ${name} is officially crowned Employee of the Month for ${availableMonths.find(m => m.key === selectedMonth)?.label}!`);
      setTimeout(() => setCelebrationMessage(null), 6000);
    } catch (err) {
      console.error('Failed to crown winner:', err);
    }
  };

  // Confirm delete evaluation
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteEvaluation(deleteTargetId);
      setDeleteTargetId(null);
    } catch (err) {
      console.error('Failed to delete evaluation:', err);
    }
  };

  return (
    <div className="w-full relative pb-12 animate-in fade-in duration-200">
      
      {/* Toast Notification Banner */}
      {celebrationMessage && (
        <div className="mb-6 bg-primary/15 border border-primary/30 text-gray-800 font-semibold px-5 py-3 rounded-2xl shadow-sm flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm">{celebrationMessage}</span>
          </div>
          <button 
            onClick={() => setCelebrationMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Standard App Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1 flex items-center gap-2.5">
            <Trophy className="w-7 h-7 text-primary" />
            Employee of the Month
          </h1>
          <p className="text-sm text-gray-500">
            Recognizing exceptional performance, studio craftsmanship, and criteria scorecard benchmarks.
          </p>
        </div>

        {/* Controls: Month Selector & Add Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white/50 border border-white/60 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer pr-1 text-gray-800 text-sm font-semibold"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {canEvaluate && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoScoreAllEligible}
                className="px-3.5 py-2 bg-white/70 hover:bg-white text-gray-700 border border-white/80 rounded-xl text-sm font-semibold shadow-2xs hover:shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="Automatically calculate and score all staff for this month"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Auto-Score All Staff</span>
              </button>
              <button
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Evaluate Scores
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reigning Champion Hero Card */}
      {reigningWinner ? (
        <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm bg-white/40 backdrop-blur-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
            
            {/* Left: Champion Profile & Citation */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left flex-1">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-primary/25">
                  {reigningWinner.employee_name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-md border-2 border-white">
                  <Crown className="w-4 h-4 fill-slate-900" />
                </div>
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Employee of the Month • {availableMonths.find(m => m.key === selectedMonth)?.label}</span>
                </div>

                <h2 className="text-2xl font-bold text-gray-800">
                  {reigningWinner.employee_name}
                </h2>
                
                <p className="text-sm font-medium text-gray-500">
                  {reigningWinner.employee_role}
                </p>

                {reigningWinner.badge && (
                  <div className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white/70 text-gray-700 border border-gray-200">
                    ✨ {reigningWinner.badge}
                  </div>
                )}

                {reigningWinner.manager_remarks && (
                  <div className="pt-2">
                    <p className="text-xs sm:text-sm text-gray-700 italic bg-white/50 p-3 rounded-xl border border-white/80 leading-relaxed">
                      "{reigningWinner.manager_remarks}"
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 pl-1">
                      Evaluated by {reigningWinner.evaluated_by || 'Leadership'} ({reigningWinner.evaluated_by_role || 'Studio Admin'})
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Score Breakdown Box */}
            <div className="w-full lg:w-72 flex-shrink-0 bg-white/60 border border-white/80 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Evaluation Score</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${calculateEvaluationGrade(reigningWinner.percentage).color}`}>
                  {calculateEvaluationGrade(reigningWinner.percentage).label}
                </span>
              </div>

              <div className="text-center py-1">
                <div className="text-3xl font-extrabold text-gray-800">
                  {reigningWinner.total_score}
                  <span className="text-sm font-medium text-gray-400"> / {reigningWinner.max_score || 100}</span>
                </div>
                <div className="text-xs font-semibold text-primary mt-0.5 flex items-center justify-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{reigningWinner.percentage}% Studio Performance Index</span>
                </div>
              </div>

              {/* Criteria mini bars */}
              <div className="space-y-1.5 pt-1">
                {DEFAULT_SCORING_CRITERIA.map((criterion) => {
                  const score = getCriterionScore(reigningWinner.criteria_scores, criterion.id) ?? 0;
                  const pct = Math.round((score / criterion.maxScore) * 100);
                  return (
                    <div key={criterion.id} className="text-xs">
                      <div className="flex justify-between text-gray-600 mb-0.5">
                        <span className="truncate pr-2 font-medium">{criterion.name}</span>
                        <span className="font-bold text-gray-700 flex-shrink-0">{score}/{criterion.maxScore}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200/60 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-300" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {canEvaluate && (
                <div className="pt-1">
                  <button
                    onClick={() => handleOpenEditModal(reigningWinner)}
                    className="w-full py-1.5 bg-white/70 hover:bg-white text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                    <span>Edit Evaluation</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      ) : (
        /* Empty State Banner */
        <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm bg-white/40 backdrop-blur-md p-8 mb-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-gray-800">
              No Winner Crowned Yet for {availableMonths.find(m => m.key === selectedMonth)?.label}
            </h3>
            <p className="text-xs text-gray-500">
              {canEvaluate 
                ? 'Submit employee criteria scorecards below and crown this month\'s champion.'
                : 'Evaluations are currently being reviewed by leadership.'}
            </p>
          </div>
          {canEvaluate && (
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee Scorecard</span>
            </button>
          )}
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {topThree.length >= 2 && (
        <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm bg-white/40 backdrop-blur-md p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Top Performers Podium
            </h2>
            <span className="text-xs font-medium text-gray-500">
              {availableMonths.find(m => m.key === selectedMonth)?.label} Rankings
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
            
            {/* Rank 2 (Silver) */}
            {topThree[1] && (
              <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-5 shadow-sm text-center space-y-2.5 order-2 md:order-1">
                <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 font-bold flex items-center justify-center mx-auto text-sm">
                  #2
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{topThree[1].employee_name}</h4>
                  <p className="text-xs text-gray-500">{topThree[1].employee_role}</p>
                </div>
                <div className="bg-white/70 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-xl font-bold text-gray-800">{topThree[1].total_score}</span>
                  <span className="text-xs text-gray-400"> / {topThree[1].max_score}</span>
                  <div className="text-[11px] font-semibold text-gray-500">{topThree[1].percentage}% Score</div>
                </div>
                {canEvaluate && !topThree[1].is_winner && (
                  <button
                    onClick={() => handleCrownWinner(topThree[1].id, topThree[1].employee_name)}
                    className="w-full py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                  >
                    👑 Crown Winner
                  </button>
                )}
              </div>
            )}

            {/* Rank 1 (Gold) */}
            {topThree[0] && (
              <div className="bg-white/80 backdrop-blur-xl border-2 border-primary/40 rounded-2xl p-6 shadow-md shadow-primary/10 text-center space-y-3 order-1 md:order-2 md:-translate-y-1">
                <div className="w-12 h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center mx-auto text-base shadow-md shadow-primary/20">
                  👑 #1
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-base">{topThree[0].employee_name}</h4>
                  <p className="text-xs font-semibold text-primary">{topThree[0].employee_role}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-2xs">
                  <span className="text-2xl font-black text-gray-800">{topThree[0].total_score}</span>
                  <span className="text-xs text-gray-400"> / {topThree[0].max_score}</span>
                  <div className="text-xs font-bold text-primary mt-0.5">{topThree[0].percentage}% Performance</div>
                </div>
                {canEvaluate && !topThree[0].is_winner && (
                  <button
                    onClick={() => handleCrownWinner(topThree[0].id, topThree[0].employee_name)}
                    className="w-full py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-md shadow-primary/20 cursor-pointer"
                  >
                    👑 Crown as Winner
                  </button>
                )}
              </div>
            )}

            {/* Rank 3 (Bronze) */}
            {topThree[2] && (
              <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-5 shadow-sm text-center space-y-2.5 order-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center mx-auto text-sm">
                  #3
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{topThree[2].employee_name}</h4>
                  <p className="text-xs text-gray-500">{topThree[2].employee_role}</p>
                </div>
                <div className="bg-white/70 p-2.5 rounded-xl border border-gray-100">
                  <span className="text-xl font-bold text-gray-800">{topThree[2].total_score}</span>
                  <span className="text-xs text-gray-400"> / {topThree[2].max_score}</span>
                  <div className="text-[11px] font-semibold text-gray-500">{topThree[2].percentage}% Score</div>
                </div>
                {canEvaluate && !topThree[2].is_winner && (
                  <button
                    onClick={() => handleCrownWinner(topThree[2].id, topThree[2].employee_name)}
                    className="w-full py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                  >
                    👑 Crown Winner
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Monthly Scorecard Leaderboard Table */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm overflow-hidden bg-white/40 backdrop-blur-md mb-6">
        
        {/* Table Controls Header */}
        <div className="p-4 border-b border-white/40 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Monthly Scorecard & Leaderboard
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Rankings and score breakdowns across evaluation criteria for {availableMonths.find(m => m.key === selectedMonth)?.label}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 w-40 sm:w-52"
              />
            </div>

            {/* Role Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 bg-white/50 border border-white/60 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="designer">Design</option>
              <option value="print">Printing</option>
              <option value="manager">Management</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/30 border-b border-white/40 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Staff Member</th>
                {DEFAULT_SCORING_CRITERIA.map((criterion) => (
                  <th key={criterion.id} className="py-3 px-3 text-center whitespace-nowrap">
                    <div>{criterion.name}</div>
                    <span className="text-[10px] font-normal text-gray-400">({criterion.maxScore} pts)</span>
                  </th>
                ))}
                <th className="py-3 px-3 text-center">Total</th>
                <th className="py-3 px-3 text-center">Grade</th>
                <th className="py-3 px-4">Evaluated By</th>
                {canEvaluate && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30 text-sm">
              {filteredEvaluations.length > 0 ? (
                filteredEvaluations.map((item, idx) => {
                  const grade = calculateEvaluationGrade(item.percentage);
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-white/20 transition-colors ${item.is_winner ? 'bg-primary/5' : ''}`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold">
                          {idx === 0 ? (
                            <span className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center text-xs shadow-2xs">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-gray-400 pl-2 text-xs">#{idx + 1}</span>
                          )}
                          {item.is_winner && (
                            <span title="Crowned Winner">
                              <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Staff Member */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                            {item.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                              <span>{item.employee_name}</span>
                              {item.badge && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{item.employee_role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Criteria Scores */}
                      {DEFAULT_SCORING_CRITERIA.map((criterion) => {
                        const score = getCriterionScore(item.criteria_scores, criterion.id);
                        return (
                          <td key={criterion.id} className="py-3 px-3 text-center whitespace-nowrap font-medium text-xs text-gray-700">
                            <span className="font-bold text-gray-800">{score !== undefined ? score : '—'}</span>
                            <span className="text-[10px] text-gray-400">/{criterion.maxScore}</span>
                          </td>
                        );
                      })}

                      {/* Total Score */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-bold text-gray-800">{item.total_score}</span>
                        <span className="text-xs text-gray-400">/{item.max_score}</span>
                        <div className="text-[10px] text-gray-500">{item.percentage}%</div>
                      </td>

                      {/* Grade Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${grade.color}`}>
                          {grade.label}
                        </span>
                      </td>

                      {/* Evaluated By */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-xs text-gray-700 block">{item.evaluated_by || 'Leadership'}</span>
                        <span className="text-[10px] text-gray-400 block">{item.evaluated_by_role || 'Admin'}</span>
                      </td>

                      {/* Actions */}
                      {canEvaluate && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {!item.is_winner && (
                              <button
                                onClick={() => handleCrownWinner(item.id, item.employee_name)}
                                title="Crown as Winner"
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Crown className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Evaluation"
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => setDeleteTargetId(item.id)}
                                title="Delete Evaluation"
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={DEFAULT_SCORING_CRITERIA.length + (canEvaluate ? 5 : 4)} className="py-10 text-center text-gray-500">
                    <p className="text-sm">No evaluations recorded for this month yet.</p>
                    {canEvaluate && (
                      <button
                        onClick={() => handleOpenAddModal()}
                        className="mt-2 text-primary hover:underline font-semibold text-xs cursor-pointer"
                      >
                        + Evaluate an employee for {availableMonths.find(m => m.key === selectedMonth)?.label}
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Criteria Breakdown Grid */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm bg-white/40 backdrop-blur-md p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/40 pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              Evaluation Criteria Matrix (100 Marks Scale)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              4 studio benchmarks combining automated attendance & job analytics with leadership appraisal.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            100 Marks Total
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {DEFAULT_SCORING_CRITERIA.map((criterion, idx) => (
            <div 
              key={criterion.id} 
              className="bg-white/60 border border-white/80 p-4 rounded-2xl shadow-2xs space-y-2.5 hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase">
                    Pillar 0{idx + 1}
                  </span>
                  <span className="text-sm font-extrabold text-gray-800 bg-white/80 px-2 py-0.5 rounded-lg border border-gray-100 shadow-2xs">
                    {criterion.maxScore} Marks
                  </span>
                </div>
                <h4 className="font-bold text-sm text-gray-800">{criterion.name}</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed">{criterion.description}</p>
              </div>

              <div className="pt-2 border-t border-gray-100/80 flex items-center justify-between text-[11px]">
                <span className="text-gray-400 font-medium">Evaluation:</span>
                <span className={`font-semibold px-1.5 py-0.5 rounded ${criterion.isAutoCalculated ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                  {criterion.isAutoCalculated ? '⚡ Auto-Metric' : '👤 Leadership'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard App Modal for Admin & Manager */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  {modalMode === 'edit' ? 'Update Employee Evaluation' : 'Evaluate Employee Score'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scoring month: <span className="font-semibold text-gray-700">{availableMonths.find(m => m.key === selectedMonth)?.label}</span>
                </p>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleSaveEvaluation} className="flex flex-col overflow-hidden flex-1">
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                
                {/* Select Employee */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">
                    Select Employee to Evaluate
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => handleStaffSelectChange(e.target.value)}
                    disabled={modalMode === 'edit'}
                    className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {eligibleStaff.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.role || 'Staff'} ({s.email || 'No email'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Composite Score Card in App Theme */}
                <div className="bg-white/60 border border-white/80 rounded-xl p-4 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                      Composite Score
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-3xl font-extrabold text-gray-800">{modalCalculations.total}</span>
                      <span className="text-xs text-gray-400 font-semibold">/ {modalCalculations.maxTotal} marks</span>
                      <span className="text-xs font-bold text-primary ml-2">({modalCalculations.percentage}%)</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${modalCalculations.grade.color}`}>
                      {modalCalculations.grade.label}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-1">
                      Badge: {modalCalculations.grade.badge}
                    </span>
                  </div>
                </div>

                {/* Criteria Score Sliders */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                      Criteria Score Allocation (100 Marks Scale)
                    </label>
                    <button
                      type="button"
                      onClick={() => runAutoCalculation(selectedStaffId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      title="Auto-calculate Attendance, Daily Rating, and Work Timing from system logs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Auto-Calculate Scores</span>
                    </button>
                  </div>

                  {DEFAULT_SCORING_CRITERIA.map((criterion) => {
                    const currentScore = criteriaScores[criterion.id] ?? 0;
                    return (
                      <div 
                        key={criterion.id}
                        className="bg-white/40 border border-white/60 rounded-xl p-3.5 space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-800">{criterion.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${criterion.isAutoCalculated ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                                {criterion.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                              {criterion.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <input
                              type="number"
                              min="0"
                              max={criterion.maxScore}
                              value={currentScore}
                              onChange={(e) => {
                                const val = Math.min(criterion.maxScore, Math.max(0, Number(e.target.value) || 0));
                                setCriteriaScores(prev => ({ ...prev, [criterion.id]: val }));
                              }}
                              className="w-14 px-2 py-1 bg-white border border-gray-200 rounded-lg text-center font-bold text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-xs text-gray-400">/{criterion.maxScore}</span>
                          </div>
                        </div>

                        {/* Slider Control using App Primary */}
                        <input
                          type="range"
                          min="0"
                          max={criterion.maxScore}
                          step="1"
                          value={currentScore}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCriteriaScores(prev => ({ ...prev, [criterion.id]: val }));
                          }}
                          className="w-full accent-primary cursor-pointer h-1.5 bg-gray-200 rounded-lg"
                        />

                        {/* Live Audit & Breakdown Badges */}
                        {criterion.id === 'attendance' && autoCalcDetails?.attendance && (
                          <div className="text-[11px] bg-emerald-50/80 border border-emerald-200/60 text-emerald-800 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                            <span>📐 <strong>Formula:</strong> 540m shift / 480m work @ 0.0370/min</span>
                            <span className="font-semibold">{autoCalcDetails.attendance.summary}</span>
                          </div>
                        )}
                        {criterion.id === 'daily_rating' && autoCalcDetails?.dailyRating && (
                          <div className="text-[11px] bg-amber-50/80 border border-amber-200/60 text-amber-800 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                            <span>⭐ <strong>Daily Progress:</strong> (avg★ / 5) × 30</span>
                            <span className="font-semibold">{autoCalcDetails.dailyRating.summary}</span>
                          </div>
                        )}
                        {criterion.id === 'work_completion_timing' && autoCalcDetails?.workCompletionTiming && (
                          <div className="text-[11px] bg-blue-50/80 border border-blue-200/60 text-blue-800 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                            <span>⏱️ <strong>Job Turnaround:</strong> On-time delivery SLA</span>
                            <span className="font-semibold">{autoCalcDetails.workCompletionTiming.summary}</span>
                          </div>
                        )}
                        {criterion.id === 'teamwork_behavior_discipline' && (
                          <div className="text-[11px] bg-purple-50/80 border border-purple-200/60 text-purple-800 px-2.5 py-1.5 rounded-lg">
                            <span>👤 <strong>Manager Appraisal:</strong> Rate peer collaboration, behavior, discipline, and skill improvement.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Manager / Admin Commendation Remarks */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">
                    Manager / Admin Commendation Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={managerRemarks}
                    onChange={(e) => setManagerRemarks(e.target.value)}
                    placeholder="E.g. Exceptional speed and precision on urgent brand jobs. Great leadership and team communication throughout the month."
                    className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800"
                  />
                </div>

                {/* Crown as Winner Toggle in App Style */}
                <div className="bg-white/40 border border-white/60 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Crown className="w-5 h-5 text-amber-500" />
                    <div>
                      <label htmlFor="crown-toggle" className="text-xs font-bold text-gray-800 cursor-pointer block">
                        Crown as Employee of the Month Winner
                      </label>
                      <p className="text-[11px] text-gray-500">
                        Elevates this employee to the champion podium for {availableMonths.find(m => m.key === selectedMonth)?.label}.
                      </p>
                    </div>
                  </div>
                  <input
                    id="crown-toggle"
                    type="checkbox"
                    checked={isWinnerChecked}
                    onChange={(e) => setIsWinnerChecked(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 accent-primary cursor-pointer"
                  />
                </div>

              </div>

              {/* Standard Modal Footer */}
              <div className="p-5 border-t border-white/40 bg-white/30 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-white/60 hover:bg-white text-gray-700 font-semibold rounded-xl text-sm border border-white/60 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary text-white font-bold rounded-xl text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : (modalMode === 'edit' ? 'Update Evaluation' : 'Save Evaluation')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Employee Evaluation?"
        message="Are you sure you want to remove this scorecard? This action cannot be undone."
        confirmText="Yes, Delete Score"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

    </div>
  );
}
