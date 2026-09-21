import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Clock, LogOut, RefreshCw } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const WARNING_COUNTDOWN_SECONDS = 60;

export function InactivityTimeoutGuard() {
  const { inactivityTimeoutEnabled, inactivityTimeoutMinutes } = useSettings();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_COUNTDOWN_SECONDS);
  
  const lastActiveRef = useRef<number>(Date.now());
  const warningActiveRef = useRef<boolean>(false);

  const handleLogout = useCallback(() => {
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
    if (warningActiveRef.current) {
      warningActiveRef.current = false;
      setShowWarning(false);
      setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
    }
  }, []);

  // Listen to mouse clicks, mouse movements, keyboard presses, scroll & touch
  useEffect(() => {
    if (!inactivityTimeoutEnabled) return;

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
  }, [inactivityTimeoutEnabled]);

  // Periodic check loop
  useEffect(() => {
    if (!inactivityTimeoutEnabled) {
      setShowWarning(false);
      warningActiveRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      if (!isAuth) return;

      const elapsed = Date.now() - lastActiveRef.current;
      const timeoutMs = inactivityTimeoutMinutes * 60 * 1000;

      if (elapsed >= timeoutMs && !warningActiveRef.current) {
        warningActiveRef.current = true;
        setShowWarning(true);
        setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [inactivityTimeoutEnabled, inactivityTimeoutMinutes]);

  // Warning countdown timer
  useEffect(() => {
    if (!showWarning) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning, handleLogout]);

  if (!showWarning) return null;

  const progressPercent = (secondsRemaining / WARNING_COUNTDOWN_SECONDS) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative glass-panel bg-white/95 border border-white shadow-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full text-center overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Warning Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5 border border-amber-500/20 shadow-lg shadow-amber-500/10 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2 flex items-center justify-center gap-2">
          Session Inactivity Warning
        </h2>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          No mouse click or keyboard activity detected for <span className="font-bold text-gray-900">{inactivityTimeoutMinutes} minutes</span>. For your security, you will be automatically logged out.
        </p>

        {/* Live Countdown Progress Ring / Box */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 mb-6 shadow-inner">
          <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Automatic Logout In
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
            Stay Logged In
          </button>
          
          <button
            onClick={handleLogout}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
