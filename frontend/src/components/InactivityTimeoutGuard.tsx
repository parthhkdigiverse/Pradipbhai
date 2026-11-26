import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';

const WARNING_COUNTDOWN_SECONDS = 60;

export function InactivityTimeoutGuard() {
  const { inactivityTimeoutEnabled, inactivityTimeoutMinutes } = useSettings();
  const { isPunchedIn, activeJobTracker, performAutoPunchOut, currentUserRole, fieldDuties, openPunchInModal, accessRestrictions } = useData();
  const [showWarning, setShowWarning] = useState(false);
  const [showPunchOutNotice, setShowPunchOutNotice] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_COUNTDOWN_SECONDS);
  
  const lastActiveRef = useRef<number>(Date.now());
  const warningActiveRef = useRef<boolean>(false);
  const isAutoLoggingOutRef = useRef<boolean>(false);
  const isAutoPunchingOutRef = useRef<boolean>(false);
  const latestSystemIdleSecRef = useRef<number | null>(null);
  const wasFieldDutyRef = useRef<boolean>(false);

  const role = (currentUserRole || localStorage.getItem('userRole') || '').trim().toLowerCase();
  const isAdmin = role === 'admin';

  const isFieldDutyActive = isPunchedIn && (activeJobTracker?.jobId?.startsWith('activity-') || activeJobTracker?.jobId?.startsWith('fd-'));

  const handleAutoPunchOut = useCallback(async (useCurrentTime: boolean = false) => {
    if (isAutoPunchingOutRef.current) return;
    isAutoPunchingOutRef.current = true;
    try {
      try {
        (window as any).electronAPI?.inactivityWarningCleared?.();
      } catch {}
      setShowWarning(false);
      warningActiveRef.current = false;
      setShowPunchOutNotice(true);

      try {
        (window as any).electronAPI?.showNotification?.({
          title: '⏰ Inactivity Punch-Out',
          body: `You were automatically punched out due to ${inactivityTimeoutMinutes}m of inactivity. Your login session is still active.`
        });
      } catch {}

      if (isPunchedIn || activeJobTracker) {
        const now = Date.now();
        const idleSec = latestSystemIdleSecRef.current;
        const effectiveEndTime = useCurrentTime
          ? now
          : (typeof idleSec === 'number' && idleSec > 0
              ? Math.min(now, now - idleSec * 1000)
              : Math.min(now, lastActiveRef.current));
        try {
          await performAutoPunchOut(effectiveEndTime);
        } catch (e) {
          console.error('Failed auto punch out on inactivity timeout:', e);
        }
      }
    } finally {
      isAutoPunchingOutRef.current = false;
    }
  }, [inactivityTimeoutMinutes, isPunchedIn, activeJobTracker, performAutoPunchOut]);

  const handleAutoPunchOutRef = useRef(handleAutoPunchOut);
  useEffect(() => {
    handleAutoPunchOutRef.current = handleAutoPunchOut;
  }, [handleAutoPunchOut]);

  const handleLogout = useCallback(() => {
    try {
      (window as any).electronAPI?.inactivityWarningCleared?.();
    } catch {}
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/';
  }, []);

  const resetActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
    latestSystemIdleSecRef.current = 0;
    if (warningActiveRef.current) {
      warningActiveRef.current = false;
      setShowWarning(false);
      setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
      try {
        (window as any).electronAPI?.inactivityWarningCleared?.();
      } catch {}
    }
  }, []);

  // Continuously refresh activity timestamp when entering or exiting field/courier duty
  useEffect(() => {
    if (isFieldDutyActive) {
      wasFieldDutyRef.current = true;
      lastActiveRef.current = Date.now();
      latestSystemIdleSecRef.current = 0;
      if (warningActiveRef.current) {
        warningActiveRef.current = false;
        setShowWarning(false);
        setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
        try {
          (window as any).electronAPI?.inactivityWarningCleared?.();
        } catch {}
      }
    } else if (wasFieldDutyRef.current) {
      wasFieldDutyRef.current = false;
      lastActiveRef.current = Date.now();
      latestSystemIdleSecRef.current = 0;
    }
  }, [isFieldDutyActive]);

  // Listen to mouse clicks, mouse movements, keyboard presses, scroll & touch
  useEffect(() => {
    if (!inactivityTimeoutEnabled || isAdmin) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const onUserActivity = () => {
      // Only reset activity timestamp if the warning modal is NOT currently showing
      if (!warningActiveRef.current) {
        lastActiveRef.current = Date.now();
      }
    };

    events.forEach(evt => window.addEventListener(evt, onUserActivity, { passive: true }));
    return () => {
      events.forEach(evt => window.removeEventListener(evt, onUserActivity));
    };
  }, [inactivityTimeoutEnabled, isAdmin]);

  // Listen to system-wide idle updates pushed from Electron main process
  // This detects keyboard typing & mouse clicks across the ENTIRE OS even when the CRM app is minimized!
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI || typeof electronAPI.onSystemIdle !== 'function') return;

    const unsubscribe = electronAPI.onSystemIdle((idleSec: number) => {
      if (typeof idleSec === 'number' && !isNaN(idleSec) && idleSec >= 0) {
        latestSystemIdleSecRef.current = idleSec;
        // If user was active recently on the OS (keyboard or mouse input within 2 seconds)
        if (idleSec < 2) {
          lastActiveRef.current = Date.now();
          if (warningActiveRef.current) {
            warningActiveRef.current = false;
            setShowWarning(false);
            setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
            try {
              electronAPI.inactivityWarningCleared?.();
            } catch {}
          }
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Allowed End Time check loop (Only for Courier / Field Duty activities when Time Restrictions are enabled)
  useEffect(() => {
    if (isAdmin) return;

    const checkEndTimeRestrictions = async () => {
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      if (!isAuth || isAutoLoggingOutRef.current) return;

      // Auto logout at allowed end time ONLY applies to field/courier duties, NOT general jobs
      if (!isFieldDutyActive) return;

      const currentDuty = (fieldDuties || []).find((d: any) => d.id === activeJobTracker?.jobId);
      if (currentDuty && currentDuty.auto_logout === false) return;

      let restrictions: any = accessRestrictions;
      if (!restrictions) {
        const cachedRestrictions = localStorage.getItem('accessRestrictions');
        if (cachedRestrictions) {
          try {
            restrictions = JSON.parse(cachedRestrictions);
          } catch {}
        }
      }

      // Only enforce auto-logout if Time-based Access Restrictions are explicitly enabled
      if (!restrictions || restrictions.enableTimeRestrictions !== true) return;

      const endTime = restrictions.endTime || '18:00';
      const [endHStr, endMStr] = endTime.split(':');
      const endH = parseInt(endHStr, 10);
      const endM = parseInt(endMStr, 10);
      if (isNaN(endH) || isNaN(endM)) return;

      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const endMins = endH * 60 + endM;

      if (currentMins >= endMins && !isAdmin) {
        isAutoLoggingOutRef.current = true;
        if (isPunchedIn) {
          try {
            await performAutoPunchOut();
          } catch {}
        }
        handleLogout();
      }
    };

    const interval = setInterval(checkEndTimeRestrictions, 30000);
    return () => clearInterval(interval);
  }, [isPunchedIn, isFieldDutyActive, isAdmin, performAutoPunchOut, handleLogout, fieldDuties, activeJobTracker, accessRestrictions]);

  // Periodic check loop for idle inactivity (Admins are completely exempt, and only active when user is punched in)
  useEffect(() => {
    const isPunchedInOrActive = isPunchedIn || Boolean(activeJobTracker);
    if (!inactivityTimeoutEnabled || isAdmin || !isPunchedInOrActive) {
      if (showWarning) {
        setShowWarning(false);
        warningActiveRef.current = false;
        try {
          (window as any).electronAPI?.inactivityWarningCleared?.();
        } catch {}
      }
      return;
    }

    const interval = setInterval(async () => {
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      const currentRole = (localStorage.getItem('userRole') || currentUserRole || '').trim().toLowerCase();
      if (!isAuth || isFieldDutyActive || currentRole === 'admin') return;

      const electronAPI = (window as any).electronAPI;
      let idleSec = latestSystemIdleSecRef.current;

      // Also pull directly via getSystemIdleTime if in Electron for real-time accuracy
      if (electronAPI && typeof electronAPI.getSystemIdleTime === 'function') {
        try {
          const queriedIdle = await electronAPI.getSystemIdleTime();
          if (typeof queriedIdle === 'number' && !isNaN(queriedIdle) && queriedIdle >= 0) {
            idleSec = queriedIdle;
            latestSystemIdleSecRef.current = queriedIdle;
          }
        } catch {}
      }

      // If user had system keyboard or mouse activity within last 2 seconds
      if (typeof idleSec === 'number' && idleSec < 2) {
        lastActiveRef.current = Date.now();
        if (warningActiveRef.current) {
          warningActiveRef.current = false;
          setShowWarning(false);
          setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
          try {
            electronAPI?.inactivityWarningCleared?.();
          } catch {}
        }
      }

      // Calculate elapsed idle time:
      // In Electron: idleSec is the EXACT seconds since the user's last keyboard/mouse action on the OS.
      // In Web browser: fallback to Date.now() - lastActiveRef.current (DOM events).
      const elapsedMs = (typeof idleSec === 'number' && idleSec >= 0)
        ? (idleSec * 1000)
        : (Date.now() - lastActiveRef.current);

      const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;

      if (elapsedMs >= timeoutMs && !warningActiveRef.current) {
        warningActiveRef.current = true;
        setShowWarning(true);
        setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
        try {
          electronAPI?.inactivityWarningShown?.();
        } catch {}
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [inactivityTimeoutEnabled, inactivityTimeoutMinutes, isFieldDutyActive, isAdmin, currentUserRole, isPunchedIn, activeJobTracker, showWarning]);

  // Warning countdown timer (uses stable ref so DataContext updates never reset the 1s tick)
  useEffect(() => {
    if (!showWarning || isAdmin) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleAutoPunchOutRef.current(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning, isAdmin]);

  const progressPercent = (secondsRemaining / WARNING_COUNTDOWN_SECONDS) * 100;

  return (
    <>
      {showWarning && !isAdmin && (
        <div data-no-esc-close="true" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative glass-panel bg-white/95 border border-white shadow-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Top Warning Icon Badge */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5 border border-amber-500/20 shadow-lg shadow-amber-500/10 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2 flex items-center justify-center gap-2">
              Inactivity Punch-Out Warning
            </h2>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              No mouse click or keyboard activity detected for <span className="font-bold text-gray-900">{inactivityTimeoutMinutes} minutes</span>. To ensure accurate work records, you will be automatically punched out.
            </p>

            {/* Live Countdown Progress Ring / Box */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-6 shadow-inner">
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Automatic Punch-Out In
              </div>
              <div className="text-3xl font-black text-amber-900 font-mono my-1">
                {secondsRemaining}s
              </div>
              <div className="w-full bg-amber-200/70 h-2 rounded-full overflow-hidden mt-2">
                <div 
                  className="bg-amber-600 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={resetActivity}
                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Stay Punched In
              </button>
              
              <button
                onClick={() => void handleAutoPunchOut(true)}
                className="px-4 py-3 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                Punch Out Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Punch-Out Information Notice Modal */}
      {showPunchOutNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-gray-100 shadow-2xl rounded-3xl p-6 sm:p-7 max-w-md w-full text-center overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4 shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-1.5">
              Auto Punch-Out Completed
            </h3>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              You were automatically punched out due to <strong>{inactivityTimeoutMinutes} minutes</strong> of inactivity. Your work time has been safely logged, and your login session remains active.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowPunchOutNotice(false);
                  openPunchInModal();
                }}
                className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" /> Punch In Again
              </button>
              <button
                type="button"
                onClick={() => setShowPunchOutNotice(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
