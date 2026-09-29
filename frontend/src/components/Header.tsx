import { Menu, Bell, Clock, X, User, LogOut, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { calculateLatePunchIn } from '../utils/attendanceUtils';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Header({ setCurrentPage, isCollapsed, setIsCollapsed }: { setCurrentPage?: (page: string) => void, isCollapsed?: boolean, setIsCollapsed?: (val: boolean) => void }) {
  const { isPunchedIn, setIsPunchedIn, punchInTime, setPunchInTime, activeJobTracker, setActiveJobTracker, jobs, updateJob, addWorkLog, addAttendance, updateAttendance, attendance, currentUserRole, currentUser, staff, hasPermission } = useData();
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

  const handlePunchToggle = async () => {
    if (isPunchedIn) {
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
        } else if (finalJobId.startsWith('activity-')) {
          if (finalJobId === 'activity-courier-drop') finalJobTitle = '📦 Courier Drop-off';
          else if (finalJobId === 'activity-courier-collect') finalJobTitle = '📦 Courier Collection / Pickup';
          else if (finalJobId === 'activity-outdoor-visit') finalJobTitle = '🚗 Client Visit / Outdoor Duty';
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
      const todayStr = new Date().toISOString().split('T')[0];
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

      setPunchInTime(null);
    } else {
      // Punch In - open job modal
      setShowJobModal(true);
    }
  };

  const confirmPunchIn = async () => {
    if (!selectedJobId) return;
    const now = Date.now();
    setIsPunchedIn(true);
    setPunchInTime(now);
    setActiveJobTracker({ jobId: selectedJobId, startTime: now });
    await updateJob(selectedJobId, { status: 'Progress' });
    setShowJobModal(false);
    setSelectedJobId('');

    // Resolve current user
    const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
    const loggedStaffName = currentUser?.name || staff.find(s => s.id === loggedStaffId)?.name || 'Unknown';

    // Save attendance check-in to DB via API
    const todayStr = new Date(now).toISOString().split('T')[0];
    const checkInStr = new Date(now).toTimeString().slice(0, 5);

    // Calculate late status
    const lateCalc = calculateLatePunchIn(
      checkInStr,
      officeStartTime,
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

    const existingRecord = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffId && a.date === todayStr);
    if (existingRecord) {
      const existingPunches = existingRecord.punches || [];
      // Auto-turn off / close any previous active sessions using checkInStr
      const closedPunches = existingPunches.map((p: any) => {
        if (!p.out) {
          return { ...p, out: checkInStr };
        }
        return p;
      });
      const newPunches = [...closedPunches, { in: checkInStr, out: '' }];
      await updateAttendance(existingRecord.id, {
        status: lateCalc.isLate && latePenaltyAction === 'half_day' ? 'Half Day' : (existingRecord.status || 'Present'),
        check_in: existingRecord.checkIn || existingRecord.check_in || checkInStr,
        punches: newPunches,
        is_late: existingRecord.isLate || lateCalc.isLate,
        late_minutes: existingRecord.lateMinutes || lateCalc.lateMinutes,
        penalty_amount: (existingRecord.penaltyAmount || 0) + lateCalc.penaltyAmount,
        warning_note: existingRecord.warningNote || lateCalc.warningNote
      });
    } else {
      await addAttendance({
        staff_id: loggedStaffId,
        staff_name: loggedStaffName,
        date: todayStr,
        status: lateCalc.status || 'Present',
        check_in: checkInStr,
        check_out: '',
        punches: [{ in: checkInStr, out: '' }],
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
      } else if (activeJobTracker.jobId.startsWith('activity-')) {
        let prevTitle = 'Field Duty';
        if (activeJobTracker.jobId === 'activity-courier-drop') prevTitle = '📦 Courier Drop-off';
        else if (activeJobTracker.jobId === 'activity-courier-collect') prevTitle = '📦 Courier Collection / Pickup';
        else if (activeJobTracker.jobId === 'activity-outdoor-visit') prevTitle = '🚗 Client Visit / Outdoor Duty';

        const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
        const loggedStaffName = currentUser?.name || staff.find(s => s.id === loggedStaffId)?.name || 'Unknown';
        const todayStr = new Date(now).toISOString().split('T')[0];

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
    
    setShowJobModal(false);
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
          if (!title && activeJobTracker.jobId.startsWith('activity-')) {
            if (activeJobTracker.jobId === 'activity-courier-drop') title = '📦 Courier Drop-off';
            else if (activeJobTracker.jobId === 'activity-courier-collect') title = '📦 Courier Collection';
            else if (activeJobTracker.jobId === 'activity-outdoor-visit') title = '🚗 Client Visit';
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
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm transition-all shadow-sm ${
              isPunchedIn 
                ? 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200' 
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isPunchedIn ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            {isPunchedIn ? 'Punched In' : 'Punch In'}
          </button>
        )}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-gray-600 hover:text-gray-900 transition-colors relative p-1"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full shadow-sm shadow-red-500/50"></span>
          </button>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <p className="text-sm font-bold text-gray-800">Notifications</p>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">2 New</span>
              </div>
              <div className="py-2 max-h-80 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-50">
                  <p className="text-xs font-semibold text-gray-800">New lead assigned</p>
                  <p className="text-[10px] text-gray-500 mt-1">Tech Solutions Inc. has been assigned to you.</p>
                  <p className="text-[9px] font-medium text-primary mt-1">10 minutes ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <p className="text-xs font-semibold text-gray-800">Invoice Paid</p>
                  <p className="text-[10px] text-gray-500 mt-1">Invoice #INV-2026-001 has been paid.</p>
                  <p className="text-[9px] font-medium text-gray-400 mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="border-t border-gray-100 p-2">
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="w-full text-center text-xs font-bold text-primary hover:text-primary/80 transition-colors py-1"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/60 shadow-sm hover:border-primary/60 transition-colors"
          >
            <img src={`https://i.pravatar.cc/150?u=${displayUserEmail}`} alt="User profile" className="w-full h-full object-cover" />
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
      {showJobModal && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-base text-gray-800 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                {activeJobTracker ? 'Switch Active Job / Field Duty' : 'Select Job or Activity for Punch In'}
              </h3>
              <button onClick={() => setShowJobModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                  <option value="activity-courier-drop">📦 Courier Drop-off (Field Duty)</option>
                  <option value="activity-courier-collect">📦 Courier Collection / Pickup</option>
                  <option value="activity-outdoor-visit">🚗 Client Visit / Outdoor Duty</option>
                </optgroup>
                <optgroup label="📋 Assigned In-Office Jobs">
                  {jobs.filter(j => j.status !== 'Done' && j.id !== activeJobTracker?.jobId).map(job => (
                    <option key={job.id} value={job.id}>{job.title} ({job.status})</option>
                  ))}
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
                onClick={() => setShowJobModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
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
              Office Hours Start: <strong>{officeStartTime}</strong> | Buffer Allowed: <strong>{lateBufferMinutes} mins</strong>
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
