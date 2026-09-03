import { useState } from 'react';
import { useData } from '../context/DataContext';
import { Calendar, Clock, Briefcase, User, Filter } from 'lucide-react';

export function WorkLogsPage() {
  const { workLogs } = useData();

  const [userFilter, setUserFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Extract unique users and jobs for filter dropdowns
  const uniqueUsers = Array.from(new Set(workLogs.map(log => log.userName || 'Unknown')));
  const uniqueJobs = Array.from(new Set(workLogs.map(log => log.jobTitle || 'Unknown')));

  const filteredLogs = workLogs.filter(log => {
    const logUser = log.userName || 'Unknown';
    const logJob = log.jobTitle || 'Unknown';
    const matchUser = userFilter ? logUser.toLowerCase().includes(userFilter.toLowerCase()) : true;
    const matchJob = jobFilter ? logJob.toLowerCase().includes(jobFilter.toLowerCase()) : true;
    const matchDate = dateFilter ? log.date === dateFilter : true;
    return matchUser && matchJob && matchDate;
  });

  const formatTime = (seconds: number) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="w-full relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Work Logs (Timesheet)</h1>
          <p className="text-gray-500 font-medium">View your punch-in history and tracked hours.</p>
        </div>
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
      </div>

      <div className="glass-panel p-6 rounded-2xl relative z-10 flex flex-col h-[calc(100vh-140px)]">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50 text-xs">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">User</th>
                <th className="py-4 px-6">Job</th>
                <th className="py-4 px-6">Punch In</th>
                <th className="py-4 px-6">Punch Out</th>
                <th className="py-4 px-6 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 text-gray-800 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {log.date}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                          {(log.userName || 'U').charAt(0).toUpperCase()}
                        </div>
                        {log.userName || 'Unknown'}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-primary">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-primary/70" />
                        {log.jobTitle}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {formatDateTime(log.startTime)}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {formatDateTime(log.endTime)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-gray-700">
                      <div className="flex items-center justify-end gap-1.5 bg-gray-50 px-2 py-1 rounded inline-flex border border-gray-100">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatTime(log.duration)}
                      </div>
                    </td>
                  </tr>
                ))
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
      </div>
    </div>
  );
}
