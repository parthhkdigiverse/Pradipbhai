import { Menu, Bell, Clock, X, User, LogOut, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { calculateLatePunchIn } from '../utils/attendanceUtils';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { localDateStr } from '../utils/dateUtils';

export function Header({ setCurrentPage, isCollapsed, setIsCollapsed }: { setCurrentPage?: (page: string) => void, isCollapsed?: boolean, setIsCollapsed?: (val: boolean) => void }) {
  const { isPunchedIn, setIsPunchedIn, punchInTime, setPunchInTime, activeJobTracker, setActiveJobTracker, jobs, updateJob, addWorkLog, addAttendance, updateAttendance, attendance, currentUserRole, currentUser, staff, hasPermission, leaveRequests, dailyProgressRecords, addDailyProgress, updateDailyProgress, isPunchInModalOpen, setIsPunchInModalOpen, fieldDuties } = useData();
  const { officeStartTime, lateBufferMinutes, enableLatePenalty, latePenaltyAction, latePenaltyAmount } = useSettings();
  const canPunch = hasPermission(currentUserRole, 'Punch In/Out');
  const [elapsedJobTime, setElapsedJobTime] = useState(0);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [lateWarningAlert, setLateWarningAlert] = useState<{ note: string; lateMins: number; penalty: number; action: string } | null>(null);

  const userEmail = localStorage.getItem('userEmail') || 'admin@alphacreative.com';
  const displayUserName = currentUser?.name || 'System Admin';
  const displayUserEmail = currentUser?.email || userEmail;
  const userKey = currentUser?.id || displayUserEmail;

  const [headerAvatarUrl, setHeaderAvatarUrl] = useState<string>(() => {
    return (
      localStorage.getItem(`user_avatar_${userKey}`) ||
      (currentUser as any)?.avatarUrl ||
      (currentUser as any)?.avatar_url ||
      `https://i.pravatar.cc/150?u=${displayUserEmail}`
    );
  });

  useEffect(() => {
    const syncAvatar = () => {
      const saved = localStorage.getItem(`user_avatar_${userKey}`);
      if (saved) {
        setHeaderAvatarUrl(saved);
      } else {
        setHeaderAvatarUrl(`https://i.pravatar.cc/150?u=${displayUserEmail}`);
      }
    };
    window.addEventListener('avatarChanged', syncAvatar);
    return () => window.removeEventListener('avatarChanged', syncAvatar);
  }, [userKey, displayUserEmail]);

  // Dynamic Notifications calculation
  const userStaffName = currentUser?.name;
  const userStaffId = currentUser?.id;
  const isUserAdmin = currentUserRole === 'Admin' || currentUserRole === 'Manager';

  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`read_notifs_${userStaffId || 'guest'}`) || '[]');
    } catch {
      return [];
    }
  });

  const computedNotifications = useMemo(() => {
    const list: Array<{ id: string; title: string; message: string; time: string; type: 'job' | 'late' | 'leave' | 'progress'; unread: boolean }> = [];

    // 1. Assigned Jobs
    const myJobs = jobs.filter((j: any) => 
      j.status !== 'Completed' && j.status !== 'Delivered' && (
        isUserAdmin || 
        j.assignedTo === userStaffName || 
        j.assigned_to === userStaffName || 
        (j.assignedStaffIds && j.assignedStaffIds.includes(userStaffId))
      )
    ).slice(0, 4);

    myJobs.forEach((j: any) => {
      const isUnread = !readNotificationIds.includes(`job-${j.id}`);
      list.push({
        id: `job-${j.id}`,
        title: `Active Job: ${j.title || j.id}`,
        message: `Status: ${j.status || 'Pending'} • Client: ${j.clientName || j.client || 'Standard'}`,
        time: j.created_at ? new Date(j.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Task',
        type: 'job',
        unread: isUnread
      });
    });

    // 1.5. Jobs Pending Review for Admin/Manager
    if (isUserAdmin) {
      const reviewJobs = jobs.filter((j: any) => j.status === 'Under Review').slice(0, 3);
      reviewJobs.forEach((j: any) => {
        const notifId = `job-review-${j.id}`;
        list.push({
          id: notifId,
          title: `🔍 Job Submitted for Review: ${j.title || j.id}`,
          message: `Work completed by team. Needs manager/admin review and approval.`,
          time: j.dueDate || 'Needs Review',
          type: 'job',
          unread: !readNotificationIds.includes(notifId)
        });
      });
    }

    // 2. Today's Attendance / Late check
    const todayStr = localDateStr();
    const myAttToday = attendance.find((a: any) => 
      ((a.staffId || a.staff_id) === userStaffId || (a.staffName || a.staff_name) === userStaffName) && 
      a.date === todayStr
    );
    if (myAttToday && (myAttToday.isLate || myAttToday.is_late || (myAttToday.lateMinutes && myAttToday.lateMinutes > 0))) {
      const attId = `att-late-${myAttToday.id || todayStr}`;
      const isUnread = !readNotificationIds.includes(attId);
      list.push({
        id: attId,
        title: '⚠️ Late Punch-In Logged',
        message: myAttToday.warningNote || myAttToday.warning_note || `Late punch-in logged (${myAttToday.lateMinutes || myAttToday.late_minutes || 0}m late).`,
        time: myAttToday.checkIn || myAttToday.check_in || 'Today',
        type: 'late',
        unread: isUnread
      });
    }

    // 3. Leave Requests Notifications
    if (leaveRequests && Array.isArray(leaveRequests)) {
      if (isUserAdmin) {
        // Pending leave applications requiring admin/manager review
        const pendingLeaves = leaveRequests.filter((l: any) => l.status === 'Pending').slice(0, 3);
        pendingLeaves.forEach((l: any) => {
          const leaveId = `leave-${l.id}`;
          list.push({
            id: leaveId,
            title: `📋 Leave Request: ${l.staffName || 'Staff'}`,
            message: `${l.type || 'Casual'} Leave from ${l.fromDate} to ${l.toDate} (${l.days} days).`,
            time: l.appliedOn || 'Pending Review',
            type: 'leave',
            unread: !readNotificationIds.includes(leaveId)
          });
        });
      } else {
        // Status updates on employee's leave requests
        const myLeaves = leaveRequests.filter((l: any) => (l.staffId === userStaffId || l.staffName === userStaffName)).slice(0, 3);
        myLeaves.forEach((l: any) => {
          const leaveId = `leave-status-${l.id}`;
          list.push({
            id: leaveId,
            title: `📋 Leave Application ${l.status}`,
            message: `${l.type} Leave (${l.fromDate} to ${l.toDate}): Status is ${l.status}.`,
            time: l.reviewedOn || l.appliedOn || 'Recent',
            type: 'leave',
            unread: !readNotificationIds.includes(leaveId)
          });
        });
      }
    }

    // 4. Daily Progress Report Notifications
    if (dailyProgressRecords && Array.isArray(dailyProgressRecords)) {
      if (isUserAdmin) {
        const pendingProgress = dailyProgressRecords.filter((p: any) => (p.verificationStatus || p.verification_status) === 'Pending').slice(0, 3);
        pendingProgress.forEach((p: any) => {
          const progId = `prog-${p.id}`;
          list.push({
            id: progId,
            title: `📊 Daily Progress: ${p.employeeName || p.employee_name || 'Staff Member'}`,
            message: `Submitted progress report for ${p.date}. Pending verification.`,
            time: p.submittedAt || p.submitted_at || 'Today',
            type: 'progress',
            unread: !readNotificationIds.includes(progId)
          });
        });
      } else {
        const myProgress = dailyProgressRecords.filter((p: any) => (p.employeeName || p.employee_name) === userStaffName && (p.verificationStatus || p.verification_status) === 'Verified').slice(0, 2);
        myProgress.forEach((p: any) => {
          const progId = `prog-verified-${p.id}`;
          list.push({
            id: progId,
            title: `⭐ Daily Report Verified`,
            message: `Your progress report for ${p.date} was verified by ${p.verifiedBy || p.verified_by || 'Manager'}${p.rating ? ` (Rating: ${p.rating}★)` : ''}.`,
            time: p.date || 'Recent',
            type: 'progress',
            unread: !readNotificationIds.includes(progId)
          });
        });
      }
    }

    return list;
  }, [jobs, attendance, leaveRequests, dailyProgressRecords, currentUser, isUserAdmin, userStaffName, userStaffId, readNotificationIds]);

  const unreadCount = computedNotifications.filter(n => n.unread).length;

  const markAllNotificationsRead = () => {
    const allIds = computedNotifications.map(n => n.id);
    setReadNotificationIds(allIds);
    localStorage.setItem(`read_notifs_${userStaffId || 'guest'}`, JSON.stringify(allIds));
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeJobTracker) {
      interval = setInterval(() => {
        setElapsedJobTime(Math.floor((Date.now() - activeJobTracker.startTime) / 1000));
      }, 1000);
    } else {
      setElapsedJobTime(0);
    }
    return () => clearInterval(interval);
  }, [activeJobTracker]);

  const isPunchedInOrActive = isPunchedIn || Boolean(activeJobTracker);

  const handlePunchToggle = async () => {
    if (isPunchedInOrActive) {
      // Punch Out
      setIsPunchedIn(false);
      const endTime = Date.now();
      const duration = punchInTime ? Math.floor((endTime - punchInTime) / 1000) : 0;
      
      let finalJobId = 'N/A';
      let finalJobTitle = 'N/A';

      if (activeJobTracker) {
        finalJobId = activeJobTracker.jobId;
        const job = jobs.find(j => j.id === finalJobId);
        if (job) {
          finalJobTitle = job.title;
          const jobDuration = Math.floor((endTime - activeJobTracker.startTime) / 1000);
          await updateJob(finalJobId, { trackedTime: (job.trackedTime || 0) + jobDuration, status: 'Pending' });
        } else if (finalJobId.startsWith('activity-') || finalJobId.startsWith('fd-')) {
          const duty = (fieldDuties || []).find(d => d.id === finalJobId);
          if (duty) finalJobTitle = duty.name;
          else finalJobTitle = 'Field Duty';
        } else {
          finalJobTitle = 'General Work';
        }
        setActiveJobTracker(null);
      }

      // Resolve current user
      const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
      const loggedStaffName = currentUser?.name || staff.find(s => s.id === loggedStaffId)?.name || 'Unknown';

      // Save work log to DB via API
      const todayStr = localDateStr();
      const checkOutStr = new Date(endTime).toTimeString().slice(0, 5);
      const checkInStr = punchInTime ? new Date(punchInTime).toTimeString().slice(0, 5) : checkOutStr;

      await addWorkLog({
        staff_id: loggedStaffId,
        staff_name: loggedStaffName,
        job_id: finalJobId,
        job_title: finalJobTitle,
        date: todayStr,
        start_time: punchInTime || endTime,
        end_time: endTime,
        duration,
        hours: duration / 3600
      });

      // Save attendance check-out to DB via API
      const newPunchSession = { in: checkInStr, out: checkOutStr };
      const existingRecord = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffId && a.date === todayStr);

      if (existingRecord) {
        const existingPunches = existingRecord.punches || [];
        let hasClosedActive = false;
        const newPunches = existingPunches.map((p: any) => {
          if (!p.out) {
            hasClosedActive = true;
            return { ...p, out: checkOutStr };
          }
          return p;
        });
        if (!hasClosedActive) {
          newPunches.push(newPunchSession);
        }
        await updateAttendance(existingRecord.id, {
          status: 'Present',
          check_in: existingRecord.checkIn || existingRecord.check_in || checkInStr,
          check_out: checkOutStr,
          punches: newPunches
        });
      } else {
        await addAttendance({
          staff_id: loggedStaffId,
          staff_name: loggedStaffName,
          date: todayStr,
          status: 'Present',
          check_in: checkInStr,
          check_out: checkOutStr,
          punches: [newPunchSession]
        });
      }

      // Auto-sync Daily Progress report for today
      try {
        const addedHours = Number((duration / 3600).toFixed(1)) || 0.1;
        const existingProg = (dailyProgressRecords || []).find((p: any) => 
          (p.employeeName?.toLowerCase() === loggedStaffName.toLowerCase()) && p.date === todayStr
        );
        if (existingProg) {
          const currentTasksDone = Array.isArray(existingProg.tasksDone) ? existingProg.tasksDone : [];
          const updatedTasksDone = Array.from(new Set([...currentTasksDone, finalJobTitle]));
          const updatedHours = Number(((existingProg.hoursLogged || 0) + addedHours).toFixed(1));
          await updateDailyProgress(existingProg.id, {
            tasks_done: updatedTasksDone,
            hours_logged: updatedHours
          });
        } else {
          await addDailyProgress({
            employee_name: loggedStaffName,
            role: currentUser?.role || 'Staff Member',
            date: todayStr,
            tasks_done: [finalJobTitle],
            tasks_pending: [],
            hours_logged: addedHours,
            verification_status: 'Pending',
            rating: 0
          });
        }
      } catch (err) {
        console.error('Failed to auto-sync daily progress:', err);
      }

      setPunchInTime(null);
    } else {
      // Punch In - open job modal
      setIsPunchInModalOpen(true);
    }
  };

  const confirmPunchIn = async () => {
    if (!selectedJobId) return;
    const now = Date.now();
    setIsPunchedIn(true);
    setPunchInTime(now);
    setActiveJobTracker({ jobId: selectedJobId, startTime: now });
    
    if (!selectedJobId.startsWith('activity-')) {
      await updateJob(selectedJobId, { status: 'Progress' });
    }
    
    setShowJobModal(false);
    setIsPunchInModalOpen(false);
    setSelectedJobId('');

    // Resolve current user
    const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
    const loggedStaffName = currentUser?.name || staff.find(s => s.id === loggedStaffId)?.name || 'Unknown';

    // Save attendance check-in to DB via API
    const todayStr = localDateStr(now);
    const checkInStr = new Date(now).toTimeString().slice(0, 5);

    const existingRecord = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffId && a.date === todayStr);

    if (existingRecord) {
      // Subsequent punch-in of the day: keep first punch-in's late status and penalties
      const existingPunches = existingRecord.punches || [];
      const closedPunches = existingPunches.map((p: any) => {
        if (!p.out) {
          return { ...p, out: checkInStr };
        }
        return p;
      });
      const newPunches = [...closedPunches, { in: checkInStr, out: '', jobId: selectedJobId }];
      await updateAttendance(existingRecord.id, {
        status: existingRecord.status || 'Present',
        check_in: existingRecord.checkIn || existingRecord.check_in || checkInStr,
        punches: newPunches,
        is_late: existingRecord.isLate || existingRecord.is_late || false,
        late_minutes: existingRecord.lateMinutes || existingRecord.late_minutes || 0,
        penalty_amount: existingRecord.penaltyAmount || existingRecord.penalty_amount || 0,
        warning_note: existingRecord.warningNote || existingRecord.warning_note || ''
      });
    } else {
      // First punch-in of the day: calculate late status
      const loggedStaff = staff.find((s: any) => s.id === (currentUser?.id || '') || (s.email && s.email.toLowerCase() === currentUser?.email?.toLowerCase()));
      const effectiveStartTime = loggedStaff?.officeStartTime || loggedStaff?.office_start_time || (currentUser as any)?.officeStartTime || officeStartTime;

      const lateCalc = calculateLatePunchIn(
        checkInStr,
        effectiveStartTime,
        lateBufferMinutes,
        enableLatePenalty,
        latePenaltyAction,
        latePenaltyAmount
      );

      if (lateCalc.isLate) {
        setLateWarningAlert({
          note: lateCalc.warningNote,
          lateMins: lateCalc.lateMinutes,
          penalty: lateCalc.penaltyAmount,
          action: latePenaltyAction
        });
      }

      await addAttendance({
        staff_id: loggedStaffId,
        staff_name: loggedStaffName,
        date: todayStr,
        status: lateCalc.status || 'Present',
        check_in: checkInStr,
        check_out: '',
        punches: [{ in: checkInStr, out: '', jobId: selectedJobId }],
        is_late: lateCalc.isLate,
        late_minutes: lateCalc.lateMinutes,
        penalty_amount: lateCalc.penaltyAmount,
        warning_note: lateCalc.warningNote
      });
    }
  };

  const handleSwitchJob = async () => {
    if (!selectedJobId) return;
    const now = Date.now();

    // Save time for previous tracked job / activity
    if (activeJobTracker) {
      const elapsed = Math.floor((now - activeJobTracker.startTime) / 1000);
      const prevJob = jobs.find(j => j.id === activeJobTracker.jobId);
      if (prevJob) {
        await updateJob(activeJobTracker.jobId, {
          trackedTime: (prevJob.trackedTime || 0) + elapsed,
          status: 'Pending'
        });
      } else if (activeJobTracker.jobId.startsWith('activity-') || activeJobTracker.jobId.startsWith('fd-')) {
        let prevTitle = 'Field Duty';
        const duty = (fieldDuties || []).find(d => d.id === activeJobTracker.jobId);
        if (duty) prevTitle = duty.name;

        const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
        const loggedStaffName = currentUser?.name || staff.find(s => s.id === loggedStaffId)?.name || 'Unknown';
        const todayStr = localDateStr(now);

        await addWorkLog({
          staff_id: loggedStaffId,
          staff_name: loggedStaffName,
          job_id: activeJobTracker.jobId,
          job_title: prevTitle,
          date: todayStr,
          start_time: activeJobTracker.startTime,
          end_time: now,
          duration: elapsed,
          hours: elapsed / 3600
        });
      }
    }

    // Switch to new job / activity
    setActiveJobTracker({ jobId: selectedJobId, startTime: now });
    const nextJob = jobs.find(j => j.id === selectedJobId);
    if (nextJob) {
      await updateJob(selectedJobId, { status: 'Progress' });
    }

    // Update active punch jobId for restoration on refresh
    const loggedStaffIdForSwitch = currentUser?.id || staff[0]?.id || '1';
    const todayStrForSwitch = localDateStr(now);
    const existingAtt = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffIdForSwitch && a.date === todayStrForSwitch);
    if (existingAtt && existingAtt.punches) {
      const updatedPunches = existingAtt.punches.map((p: any) => {
        if (!p.out) return { ...p, jobId: selectedJobId };
        return p;
      });
      await updateAttendance(existingAtt.id, { punches: updatedPunches });
    }

    
    setShowJobModal(false);
    setIsPunchInModalOpen(false);
    setSelectedJobId('');
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="h-20 glass-header flex items-center justify-between px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsCollapsed?.(!isCollapsed)}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Active Job Tracker */}
        {activeJobTracker && (() => {
          const activeJob = jobs.find(j => j.id === activeJobTracker.jobId);
          let title = activeJob?.title;
          if (!title && (activeJobTracker.jobId.startsWith('activity-') || activeJobTracker.jobId.startsWith('fd-'))) {
            const duty = (fieldDuties || []).find(d => d.id === activeJobTracker.jobId);
            if (duty) title = duty.name;
            else title = 'Field Duty';
          }
          return (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/40 px-3 py-1.5 rounded-full shadow-sm max-w-sm">
              <Clock className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-gray-700 truncate max-w-[130px]" title={title || 'Job'}>
                {title || 'Active Duty'}
              </span>
              <span className="text-xs font-bold font-mono text-primary shrink-0">{formatTime(elapsedJobTime)}</span>
              
              <button 
                onClick={() => {
                  setSelectedJobId('');
                  setShowJobModal(true);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-primary bg-white/90 hover:bg-white border border-primary/30 px-2 py-0.5 rounded-full transition-all shrink-0 shadow-2xs hover:scale-105"
                title="Switch / Change Active Activity"
              >
                <ArrowRightLeft className="w-3 h-3 text-primary" />
                <span>Switch</span>
              </button>
            </div>
          );
        })()}

        {/* Punch In / Out Button */}
        {canPunch && (
          <button 
            onClick={handlePunchToggle}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm cursor-pointer ${
              isPunchedInOrActive 
                ? 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200' 
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isPunchedInOrActive ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            {isPunchedInOrActive ? 'Punch Out' : 'Punch In'}
          </button>
        )}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-gray-600 hover:text-gray-900 transition-colors relative p-1"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full shadow-sm shadow-red-500/50"></span>
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Notifications
                </p>
                {unreadCount > 0 ? (
                  <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {unreadCount} New
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    All Read
                  </span>
                )}
              </div>
              <div className="py-1 max-h-80 overflow-y-auto divide-y divide-gray-50">
                {computedNotifications.length > 0 ? (
                  computedNotifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => {
                        if (n.type === 'job' && setCurrentPage) setCurrentPage('jobs');
                        if (n.type === 'late' && setCurrentPage) setCurrentPage('attendance');
                        if (n.type === 'leave' && setCurrentPage) setCurrentPage('leaves');
                        if (n.type === 'progress' && setCurrentPage) setCurrentPage('daily-progress');
                        setShowNotifications(false);
                      }}
                      className={`px-4 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer flex flex-col gap-0.5 ${n.unread ? 'bg-primary/[0.02]' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold ${n.type === 'late' ? 'text-amber-700' : 'text-gray-800'}`}>
                          {n.title}
                        </p>
                        {n.unread && <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>}
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-2">{n.message}</p>
                      <p className="text-[9px] font-semibold text-gray-400 mt-1">{n.time}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-400 text-xs">
                    <p className="font-medium">No notifications right now.</p>
                  </div>
                )}
              </div>
              {computedNotifications.length > 0 && (
                <div className="border-t border-gray-100 p-2 bg-gray-50/30">
                  <button 
                    onClick={markAllNotificationsRead}
                    className="w-full text-center text-xs font-bold text-primary hover:text-primary/80 transition-colors py-1 cursor-pointer"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/60 shadow-sm hover:border-primary/60 transition-colors"
          >
            <img src={headerAvatarUrl} alt="User profile" className="w-full h-full object-cover" />
          </button>
          
          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-sm font-bold text-gray-800">{displayUserName}</p>
                <p className="text-xs text-gray-500 truncate mb-2">{displayUserEmail}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-primary/10 text-primary border border-primary/20">
                    {currentUserRole || 'Admin'}
                  </span>
                </div>
              </div>
              <div className="py-1">
                <button 
                  onClick={() => {
                    setCurrentPage?.('profile');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> My Profile
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userId');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userRole');
                    localStorage.removeItem('isAuthenticated');
                    window.location.href = '/';
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Job Selection / Switch Modal */}
      {(showJobModal || isPunchInModalOpen) && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-base text-gray-800 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                {activeJobTracker ? 'Switch Active Job / Field Duty' : 'Select Job or Activity for Punch In'}
              </h3>
              <button onClick={() => { setShowJobModal(false); setIsPunchInModalOpen(false); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                {activeJobTracker ? 'Select New Job or Duty:' : 'Select Assigned Job or Field Duty'}
              </label>
              <select 
                value={selectedJobId} 
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 bg-white cursor-pointer"
              >
                <option value="" disabled>Select Job or Duty...</option>
                <optgroup label="🚚 Out-of-Office / Courier Duty">
                  {(fieldDuties || []).map(duty => (
                    <option key={duty.id} value={duty.id}>{duty.name}</option>
                  ))}
                </optgroup>
                <optgroup label="📋 Assigned In-Office Jobs">
                  {jobs
                    .filter(j => j.type !== 'Printing' && j.type?.toLowerCase() !== 'printing' && j.status !== 'Done' && j.status !== 'Completed' && j.status !== 'Under Review' && j.status !== 'Awaiting Design' && j.id !== activeJobTracker?.jobId)
                    .filter(j => {
                      if (currentUserRole === 'Admin' || currentUserRole === 'Manager') return true;
                      const staffId = currentUser?.id || staff.find(s => s.email?.toLowerCase() === (currentUser?.email || '').toLowerCase())?.id;
                      const staffName = currentUser?.name || staff.find(s => s.id === staffId)?.name || '';
                      return (
                        (staffId && (j.teamId === staffId || j.assignedStaffId === staffId || j.assigned_staff_id === staffId)) ||
                        (staffName && j.createdBy && j.createdBy.toLowerCase() === staffName.toLowerCase()) ||
                        (currentUser?.email && j.assignedStaffEmail && j.assignedStaffEmail.toLowerCase() === currentUser.email.toLowerCase())
                      );
                    })
                    .map(job => (
                      <option key={job.id} value={job.id}>{job.title} ({job.status})</option>
                    ))
                  }
                </optgroup>
              </select>
              
              <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <span className="shrink-0 text-base">💡</span>
                <p className="leading-relaxed">
                  Selecting <strong>Courier Drop/Pickup</strong> or <strong>Outdoor Duty</strong> keeps your working hours calculating continuously even while you are away from your computer, and logs the duty in your work logs.
                </p>
              </div>
            </div>
            <div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-100 justify-end">
              <button 
                type="button"
                onClick={() => { setShowJobModal(false); setIsPunchInModalOpen(false); }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={activeJobTracker ? handleSwitchJob : confirmPunchIn}
                disabled={!selectedJobId}
                className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {activeJobTracker ? 'Switch Duty' : 'Confirm Punch In'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Late Punch-In Penalty/Warning Modal */}
      {lateWarningAlert && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-800 mb-1">⚠️ Late Punch-In Notice</h3>
            <p className="text-xs text-amber-700 font-semibold mb-4 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60">
              Office Hours Start: <strong>{staff.find((s: any) => s.id === (currentUser?.id || '') || (s.email && s.email.toLowerCase() === currentUser?.email?.toLowerCase()))?.officeStartTime || (currentUser as any)?.officeStartTime || officeStartTime}</strong> | Buffer Allowed: <strong>{lateBufferMinutes} mins</strong>
            </p>

            <div className="space-y-3 text-xs text-gray-600 bg-gray-50 p-3.5 rounded-xl border border-gray-100 mb-5">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-500">Late Duration:</span>
                <span className="font-bold text-amber-700">{lateWarningAlert.lateMins} minutes late</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-500">Penalty Action:</span>
                <span className="font-bold uppercase tracking-wider text-rose-600">
                  {lateWarningAlert.action === 'deduction' ? `Deduction (₹${lateWarningAlert.penalty})` : lateWarningAlert.action === 'half_day' ? 'Half Day Marked' : 'Warning Alert'}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 text-[11px] text-gray-500 italic">
                "{lateWarningAlert.note}"
              </div>
            </div>

            <button
              onClick={() => setLateWarningAlert(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
