import { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Calendar, Clock, Briefcase, User, Filter, X, RefreshCw, ChevronRight } from 'lucide-react';
import { Pagination } from './Pagination';
import { localDateStr } from '../utils/dateUtils';
import { parseJobStartTimeMs } from '../utils/dateFormatter';

function parseTimeOnDateMs(dateStr: string, timeStr?: string): number {
  if (!dateStr || !timeStr) return Date.now();
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) return Date.now();
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

function toTimestampMs(dateStr: string, val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const num = Number(val);
  if (!isNaN(num) && num > 0) return num;
  if (typeof val === 'string') {
    if (val.includes(':') && !val.includes('T') && val.length <= 8) {
      return parseTimeOnDateMs(dateStr, val);
    }
    const parsed = new Date(val).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export function WorkLogsPage() {
  const {
    workLogs,
    attendance,
    jobs,
    staff,
    fieldDuties,
    isPunchedIn,
    punchInTime,
    activeJobTracker,
    currentUser,
    currentUserRole,
    refreshApiData,
  } = useData();

  const [userFilter, setUserFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [liveOnly, setLiveOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Refresh latest attendance/jobs/worklogs when opening page
  useEffect(() => {
    refreshApiData();
  }, []);

  const resolveTaskTitle = (jobId?: string | null, fallbackRole?: string): string => {
    if (!jobId) {
      return fallbackRole === 'Manager' ? 'Management & Supervision' : 'General Work';
    }
    const job = jobs.find((j: any) => j.id === jobId);
    if (job) return job.title || 'Job';

    const duty = (fieldDuties || []).find((d: any) => d.id === jobId);
    if (duty) return duty.name;

    if (jobId === 'activity-courier-drop') return '📦 Courier Drop-off';
    if (jobId === 'activity-courier-collect') return '📦 Courier Collection / Pickup';
    if (jobId === 'activity-outdoor-visit') return '🚗 Client Visit / Outdoor Duty';
    if (jobId === 'manager-shift') return 'Management & Supervision';
    if (jobId.startsWith('activity-') || jobId.startsWith('fd-')) return 'Field Duty';
    return 'General Task';
  };

  // Build live active sessions from current user tracker, open attendance punches, and In-Progress jobs
  const liveSessions = useMemo(() => {
    const todayStr = localDateStr();
    const sessions: any[] = [];
    const seenStaffIds = new Set<string>();
    const seenJobIds = new Set<string>();

    // 1. Current user's live tracker (immediate local state even before API roundtrip finishes)
    if (isPunchedIn && currentUserRole !== 'Admin') {
      const myId = currentUser?.id || staff[0]?.id || '1';
      const myName = currentUser?.name || staff.find((s: any) => s.id === myId)?.name || 'Unknown';
      const startMs = activeJobTracker?.startTime || punchInTime || Date.now();
      const jobId = activeJobTracker?.jobId || (currentUserRole === 'Manager' ? 'manager-shift' : null);
      sessions.push({
        id: `live-self-${myId}`,
        staffId: myId,
        userName: myName,
        staff_name: myName,
        jobId,
        jobTitle: resolveTaskTitle(jobId, currentUserRole),
        date: localDateStr(startMs),
        startTime: startMs,
        endTime: null,
        isLive: true,
      });
      seenStaffIds.add(myId);
      if (jobId) seenJobIds.add(jobId);
    }

    // 2. Open punches from attendance (covers all staff for Admin/Manager)
    (attendance || []).forEach((att: any) => {
      if (!att.date || att.date !== todayStr) return;
      const sId = att.staffId || att.staff_id;
      if (!sId || seenStaffIds.has(sId)) return;

      const punches = Array.isArray(att.punches) ? att.punches : [];
      const openPunch = punches.find((p: any) => !p.out);
      if (!openPunch) return;

      const staffObj = staff.find((s: any) => s.id === sId);
      const sName = att.staffName || att.staff_name || staffObj?.name || 'Staff Member';
      const jobId = openPunch.jobId || null;
      const startMs = openPunch.jobStartedAt
        ? Number(openPunch.jobStartedAt)
        : parseTimeOnDateMs(att.date, openPunch.in || att.checkIn || att.check_in);

      sessions.push({
        id: `live-att-${sId}-${att.date}`,
        staffId: sId,
        userName: sName,
        staff_name: sName,
        jobId,
        jobTitle: resolveTaskTitle(jobId, staffObj?.role),
        date: att.date,
        startTime: startMs,
        endTime: null,
        isLive: true,
      });
      seenStaffIds.add(sId);
      if (jobId) seenJobIds.add(jobId);
    });

    // 3. Any In-Progress jobs with startedAt not already covered by an open punch
    (jobs || []).forEach((j: any) => {
      if (j.status !== 'Progress' && j.status !== 'In Progress') return;
      if (!j.startedAt || seenJobIds.has(j.id)) return;
      const sId = j.teamId || j.assignedStaffId || j.assigned_staff_id;
      if (sId && seenStaffIds.has(sId)) return;

      const startMs = parseJobStartTimeMs(j.startedAt);
      if (!startMs) return;
      const staffObj = sId ? staff.find((s: any) => s.id === sId) : null;
      const sName = staffObj?.name || j.assignedTo || j.assigned_to || 'Staff Member';

      sessions.push({
        id: `live-job-${j.id}`,
        staffId: sId,
        userName: sName,
        staff_name: sName,
        jobId: j.id,
        jobTitle: j.title || 'Job',
        date: localDateStr(startMs),
        startTime: startMs,
        endTime: null,
        isLive: true,
      });
      if (sId) seenStaffIds.add(sId);
      seenJobIds.add(j.id);
    });

    return sessions;
  }, [isPunchedIn, activeJobTracker, punchInTime, currentUser, currentUserRole, attendance, jobs, staff, fieldDuties]);

  // Tick every second only when there is at least one live session
  useEffect(() => {
    if (liveSessions.length === 0) return;
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [liveSessions.length]);

  const sortedCompletedLogs = useMemo(() => {
    return [...(workLogs || [])].sort((a, b) => {
      const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
      if (dateCmp !== 0) return dateCmp;
      const aStart = Number(a.startTime ?? a.start_time ?? 0);
      const bStart = Number(b.startTime ?? b.start_time ?? 0);
      return bStart - aStart;
    });
  }, [workLogs]);

  const allLogs = useMemo(() => {
    return [...liveSessions, ...sortedCompletedLogs];
  }, [liveSessions, sortedCompletedLogs]);

  // Extract unique users and jobs for filter dropdowns
  const uniqueUsers = useMemo(
    () => Array.from(new Set(allLogs.map(log => log.userName || log.staff_name || 'Unknown'))).filter(Boolean),
    [allLogs]
  );
  const uniqueJobs = useMemo(
    () => Array.from(new Set(allLogs.map(log => log.jobTitle || log.job_title || 'Unknown'))).filter(Boolean),
    [allLogs]
  );

  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      if (liveOnly && !log.isLive) return false;
      const logUser = log.userName || log.staff_name || 'Unknown';
      const logJob = log.jobTitle || log.job_title || 'Unknown';
      const matchUser = userFilter ? logUser.toLowerCase().includes(userFilter.toLowerCase()) : true;
      const matchJob = jobFilter ? logJob.toLowerCase().includes(jobFilter.toLowerCase()) : true;
      const matchDate = dateFilter ? log.date === dateFilter : true;
      return matchUser && matchJob && matchDate;
    });
  }, [allLogs, liveOnly, userFilter, jobFilter, dateFilter]);

  // Group filtered work logs to one summary row per day per user
  const groupedLogs = useMemo(() => {
    const groups = new Map<string, any>();

    filteredLogs.forEach((log) => {
      const dateStr = String(log.date || 'Unknown');
      const sId = log.staffId || log.staff_id;
      const uName = log.userName || log.staff_name || 'Unknown';
      const userKey = sId ? String(sId).trim() : uName.trim().toLowerCase();
      const groupKey = `${dateStr}::${userKey}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          date: dateStr,
          staffId: sId,
          userName: uName,
          sessions: [],
          hasLive: false,
        });
      }

      const group = groups.get(groupKey);
      group.sessions.push(log);
      if (log.isLive) group.hasLive = true;
      if ((!group.userName || group.userName === 'Staff Member' || group.userName === 'Unknown') && uName) {
        group.userName = uName;
      }
    });

    const list = Array.from(groups.values()).map((group) => {
      // Sort individual sessions chronologically inside the day (live sessions last or by start time)
      const sortedSessions = [...group.sessions].sort((a, b) => {
        const aStart = toTimestampMs(group.date, a.startTime ?? a.start_time);
        const bStart = toTimestampMs(group.date, b.startTime ?? b.start_time);
        if (aStart !== bStart) return aStart - bStart;
        return Number(Boolean(a.isLive)) - Number(Boolean(b.isLive));
      });

      const firstStartRaw = sortedSessions[0]?.startTime ?? sortedSessions[0]?.start_time;
      const firstStartMs = toTimestampMs(group.date, firstStartRaw);

      let latestEndRaw: any = null;
      let latestEndMs = 0;
      sortedSessions.forEach((s) => {
        if (s.isLive) return;
        const endVal = s.endTime !== undefined ? s.endTime : s.end_time;
        const endMs = toTimestampMs(group.date, endVal);
        if (endVal && endMs >= latestEndMs) {
          latestEndMs = endMs;
          latestEndRaw = endVal;
        }
      });

      const uniqueJobTitles = Array.from(
        new Set(sortedSessions.map((s) => s.jobTitle || s.job_title || 'General Task').filter(Boolean))
      );

      return {
        ...group,
        sessions: sortedSessions,
        firstStartRaw,
        firstStartMs,
        latestEndRaw,
        uniqueJobTitles,
      };
    });

    list.sort((a, b) => {
      const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
      if (dateCmp !== 0) return dateCmp;
      if (a.hasLive !== b.hasLive) return a.hasLive ? -1 : 1;
      return (b.firstStartMs || 0) - (a.firstStartMs || 0);
    });

    return list;
  }, [filteredLogs]);

  const selectedGroup = useMemo(
    () => (selectedGroupKey ? groupedLogs.find((g) => g.key === selectedGroupKey) || null : null),
    [groupedLogs, selectedGroupKey]
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userFilter, jobFilter, dateFilter, liveOnly]);

  const totalPages = Math.max(1, Math.ceil(groupedLogs.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedGroups = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * itemsPerPage;
    return groupedLogs.slice(startIdx, startIdx + itemsPerPage);
  }, [groupedLogs, safeCurrentPage, itemsPerPage]);

  const getLogDurationSec = (log: any): number => {
    const startVal = log.startTime !== undefined ? log.startTime : log.start_time;
    if (log.isLive) {
      return Math.max(0, Math.floor((nowMs - Number(startVal)) / 1000));
    }
    return log.duration !== undefined ? Number(log.duration) : (log.hours ? Number(log.hours) * 3600 : 0);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshApiData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00:00';
    const totalSecs = Math.round(seconds);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (val: any) => {
    if (!val) return '—';
    if (typeof val === 'string' && val.includes(':') && !val.includes('T') && val.length <= 8) {
      return val;
    }
    const num = Number(val);
    const d = !isNaN(num) && num > 0 ? new Date(num) : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="w-full relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Work Logs (Timesheet)</h1>
            {liveSessions.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {liveSessions.length} Live Now
              </span>
            )}
          </div>
          <p className="text-gray-500 font-medium">View live active sessions, punch-in history, and tracked hours.</p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="self-start md:self-auto px-4 py-2 bg-white/70 hover:bg-white border border-white/80 text-gray-700 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-2xl mb-6 relative z-10 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-500 font-bold text-sm mr-2">
          <Filter className="w-4 h-4" /> Filters:
        </div>
        
        <div className="relative">
          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            value={userFilter} 
            onChange={e => setUserFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white shadow-sm appearance-none"
          >
            <option value="">All Users</option>
            {uniqueUsers.map((u: any) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div className="relative">
          <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            value={jobFilter} 
            onChange={e => setJobFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white shadow-sm appearance-none"
          >
            <option value="">All Jobs</option>
            {uniqueJobs.map((j: any) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>

        <div className="relative flex items-center">
          <input 
            type="date" 
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white shadow-sm"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="absolute right-3 text-gray-400 hover:text-gray-600">
              &times;
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setLiveOnly(prev => !prev)}
          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
            liveOnly
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${liveOnly ? 'bg-white animate-pulse' : 'bg-emerald-500'}`} />
          Live Only ({liveSessions.length})
        </button>

        {(userFilter !== '' || jobFilter !== '' || dateFilter !== '' || liveOnly) && (
          <button 
            onClick={() => {
              setUserFilter('');
              setJobFilter('');
              setDateFilter('');
              setLiveOnly(false);
            }}
            className="ml-auto flex items-center gap-2 text-sm font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="glass-panel rounded-2xl relative z-10 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1 p-2 sm:p-4">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50 text-xs">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Work / Jobs</th>
                <th className="py-4 px-6">First In</th>
                <th className="py-4 px-6">Last Out</th>
                <th className="py-4 px-6 text-right">Total Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedGroups.length > 0 ? (
                paginatedGroups.map((group) => {
                  const totalDurationSec = group.sessions.reduce(
                    (sum: number, s: any) => sum + getLogDurationSec(s),
                    0
                  );
                  const primaryJob = group.uniqueJobTitles[0] || 'General Task';
                  const extraJobCount = Math.max(0, group.uniqueJobTitles.length - 1);

                  return (
                    <tr
                      key={group.key}
                      tabIndex={0}
                      onClick={() => setSelectedGroupKey(group.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedGroupKey(group.key);
                        }
                      }}
                      title="Click to view detailed work logs for this user and day"
                      className={`transition-colors group cursor-pointer focus:outline-none focus:bg-primary/5 ${
                        group.hasLive ? 'bg-emerald-50/40 hover:bg-emerald-50/80' : 'hover:bg-white/70'
                      }`}
                    >
                      <td className="py-4 px-6 text-gray-800 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {group.date}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-800">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${group.hasLive ? 'bg-emerald-500/15 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
                            {(group.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span>{group.userName}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                            {group.sessions.length} {group.sessions.length === 1 ? 'log' : 'logs'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-primary">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary/70 flex-shrink-0" />
                          <span className="truncate max-w-xs">{primaryJob}</span>
                          {extraJobCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                              +{extraJobCount} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-medium whitespace-nowrap">
                        {formatDateTime(group.firstStartRaw)}
                      </td>
                      <td className="py-4 px-6 text-gray-600 font-medium whitespace-nowrap">
                        {group.hasLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          formatDateTime(group.latestEndRaw)
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-gray-700 whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <div className={`flex items-center justify-end gap-1.5 px-2.5 py-1 rounded inline-flex border ${
                            group.hasLive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-50 text-gray-700 border-gray-100'
                          }`}>
                            <Clock className={`w-3.5 h-3.5 ${group.hasLive ? 'text-emerald-600 animate-pulse' : 'text-gray-400'}`} />
                            {formatTime(totalDurationSec)}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                        <Clock className="w-8 h-8 text-gray-300" />
                      </div>
                      <p>No work logs found. Punch in to start tracking time.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={safeCurrentPage}
          totalItems={groupedLogs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemsPerPageOptions={[25, 50, 100]}
          itemName="daily work logs"
        />
      </div>

      {/* Detailed Daily Sessions Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedGroupKey(null)}
          />
          <div className="relative bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50/70 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${selectedGroup.hasLive ? 'bg-emerald-500/15 text-emerald-700' : 'bg-primary/10 text-primary'}`}>
                  {(selectedGroup.userName || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-800 truncate">{selectedGroup.userName}</h2>
                    {selectedGroup.hasLive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedGroup.date} • {selectedGroup.sessions.length} {selectedGroup.sessions.length === 1 ? 'session' : 'sessions'} • Total{' '}
                    <span className="font-mono font-bold text-gray-700">
                      {formatTime(
                        selectedGroup.sessions.reduce((sum: number, s: any) => sum + getLogDurationSec(s), 0)
                      )}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroupKey(null)}
                title="Close"
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 sm:p-5">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-wider bg-gray-50/60 text-[11px]">
                    <th className="py-3 px-4 w-10">#</th>
                    <th className="py-3 px-4">Job / Activity</th>
                    <th className="py-3 px-4">Punch In</th>
                    <th className="py-3 px-4">Punch Out</th>
                    <th className="py-3 px-4 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedGroup.sessions.map((session: any, idx: number) => {
                    const startVal = session.startTime !== undefined ? session.startTime : session.start_time;
                    const durationSec = getLogDurationSec(session);

                    return (
                      <tr key={session.id || idx} className={session.isLive ? 'bg-emerald-50/50' : 'hover:bg-gray-50/70'}>
                        <td className="py-3 px-4 font-bold text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-primary">
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                              <span>{session.jobTitle || session.job_title || 'General Task'}</span>
                            </span>
                            {session.description && (
                              <span className="text-[11px] font-normal text-gray-500 mt-0.5">{session.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                          {formatDateTime(startVal)}
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-medium whitespace-nowrap">
                          {session.isLive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              LIVE
                            </span>
                          ) : (
                            formatDateTime(session.endTime !== undefined ? session.endTime : session.end_time)
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-700 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                            session.isLive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200/80'
                          }`}>
                            <Clock className={`w-3 h-3 ${session.isLive ? 'text-emerald-600 animate-pulse' : 'text-gray-400'}`} />
                            {formatTime(durationSec)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/70 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedGroupKey(null)}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
