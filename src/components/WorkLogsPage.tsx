import { useData } from '../context/DataContext';
import { Calendar, Clock, Briefcase } from 'lucide-react';

export function WorkLogsPage() {
  const { workLogs } = useData();

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Work Logs (Timesheet)</h1>
          <p className="text-gray-500 font-medium">View your punch-in history and tracked hours.</p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl relative z-10 flex flex-col h-[calc(100vh-140px)]">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50 text-xs">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Job</th>
                <th className="py-4 px-6">Punch In</th>
                <th className="py-4 px-6">Punch Out</th>
                <th className="py-4 px-6 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workLogs && workLogs.length > 0 ? (
                workLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 text-gray-800 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {log.date}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-blue-600">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-400" />
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
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">
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
