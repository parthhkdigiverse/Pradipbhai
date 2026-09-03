import { Menu, Bell, Square, Clock, X, User, LogOut } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Header({ setCurrentPage }: { setCurrentPage?: (page: string) => void }) {
  const { isPunchedIn, setIsPunchedIn, punchInTime, setPunchInTime, activeJobTracker, setActiveJobTracker, jobs, setJobs, setWorkLogs } = useData();
  const [elapsedJobTime, setElapsedJobTime] = useState(0);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');

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

  const handlePunchToggle = () => {
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
        finalJobTitle = job?.title || 'Unknown Job';
        
        // Save time to job
        const jobDuration = Math.floor((endTime - activeJobTracker.startTime) / 1000);
        setJobs(prev => prev.map(j => j.id === finalJobId ? { ...j, trackedTime: (j.trackedTime || 0) + jobDuration, status: 'Pending' } : j));
        setActiveJobTracker(null);
      }

      // Add to work logs
      setWorkLogs(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        userName: 'John Doe',
        jobId: finalJobId,
        jobTitle: finalJobTitle,
        startTime: punchInTime || endTime,
        endTime,
        duration
      }]);

      setPunchInTime(null);
    } else {
      // Punch In - open job modal
      setShowJobModal(true);
    }
  };

  const confirmPunchIn = () => {
    if (!selectedJobId) return;
    const now = Date.now();
    setIsPunchedIn(true);
    setPunchInTime(now);
    setActiveJobTracker({ jobId: selectedJobId, startTime: now });
    setJobs(prev => prev.map(j => j.id === selectedJobId ? { ...j, status: 'Progress' } : j));
    setShowJobModal(false);
    setSelectedJobId('');
  };

  const handleStopTracker = () => {
    if (activeJobTracker) {
      // Save time, but don't punch out
      const elapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
      setJobs(prev => prev.map(j => j.id === activeJobTracker.jobId ? { ...j, trackedTime: (j.trackedTime || 0) + elapsed, status: 'Pending' } : j));
      setActiveJobTracker(null);
    }
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
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Active Job Tracker */}
        {activeJobTracker && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full shadow-sm">
            <div className="flex items-center gap-1.5 text-blue-700">
              <Clock className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-bold font-mono">{formatTime(elapsedJobTime)}</span>
            </div>
            <button 
              onClick={handleStopTracker}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
              title="Stop Job Tracker"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          </div>
        )}

        {/* Punch In / Out Button */}
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
        <button className="text-gray-600 hover:text-gray-900 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-sm shadow-red-500/50"></span>
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/60 shadow-sm hover:border-blue-400/60 transition-colors"
          >
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User profile" className="w-full h-full object-cover" />
          </button>
          
          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-sm font-bold text-gray-800">John Doe</p>
                <p className="text-xs text-gray-500 truncate">john.doe@techsolutions.com</p>
              </div>
              <div className="py-1">
                <button 
                  onClick={() => {
                    setCurrentPage?.('profile');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" /> My Profile
                </button>
                <button 
                  onClick={() => {
                    // Mock logout
                    setShowProfileMenu(false);
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

      {/* Job Selection Modal */}
      {showJobModal && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg text-gray-800">Select Job for Punch In</h3>
              <button onClick={() => setShowJobModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-semibold text-gray-600 mb-2">Assigned Jobs</label>
              <select 
                value={selectedJobId} 
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select a job...</option>
                {jobs.filter(j => j.status !== 'Done').map(job => (
                  <option key={job.id} value={job.id}>{job.title} - {job.status}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 p-4 bg-gray-50 border-t border-gray-100 justify-end">
              <button 
                onClick={() => setShowJobModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmPunchIn}
                disabled={!selectedJobId}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-sm font-bold rounded-lg transition-colors shadow-sm shadow-emerald-500/20"
              >
                Confirm Punch In
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
