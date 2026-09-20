import React, { useState } from 'react';
import { Shield, ShieldAlert, MonitorSmartphone, Key, Check, X } from 'lucide-react';
import { useData } from '../context/DataContext';

const ROLES = ['Admin', 'Manager', 'Employee'];
const SYSTEM_PERMISSIONS = [
  { module: 'DASHBOARD', actions: ['View Dashboard', 'View Metrics', 'Export Data'] },
  { module: 'PROJECTS', actions: ['View Projects', 'Create/Edit Projects'] },
  { module: 'JOBS', actions: ['View Jobs', 'Create Job', 'Edit Job', 'Delete Job'] },
  { module: 'CATALOG (PRODUCT)', actions: ['View Catalog', 'Manage Products'] },
  { module: 'VENDORS', actions: ['View Vendors', 'Manage Vendors'] },
  { module: 'STAFF', actions: ['View Staff', 'Create/Edit Staff', 'Delete Staff'] },
  { module: 'ATTENDANCE', actions: ['View Attendance', 'Punch In/Out'] },
  { module: 'WORK LOGS', actions: ['View Work Logs', 'Add Work Log'] },
  { module: 'DAILY PROGRESS', actions: ['View Daily Progress', 'Verify & Rate Reports'] },
  { module: 'PAYROLL', actions: ['View Payroll', 'Manage Payroll'] },
  { module: 'LEAVES', actions: ['View Leaves', 'Apply Leave', 'Approve/Reject Leaves'] },
  { module: 'HOLIDAYS', actions: ['View Holidays', 'Manage Holidays'] },
  { module: 'CLIENTS', actions: ['View Clients', 'Create/Edit Clients', 'Delete Clients'] },
  { module: 'LEADS', actions: ['View Leads', 'Create/Edit Leads', 'Delete Leads'] },
  { module: 'SOCIAL MEDIA', actions: ['View Social Media', 'Manage Social Posts'] },
  { module: 'INVOICES (FINANCE)', actions: ['View Invoices', 'Create/Edit Invoices', 'Delete Invoices'] },
  { module: 'CHAT', actions: ['Access Chat'] },
  { module: 'REPORTS', actions: ['View Reports', 'Export Reports'] },
  { module: 'SECURITY & PERMISSIONS', actions: ['View Security', 'Edit Permissions'] },
  { module: 'SETTINGS', actions: ['View Settings', 'Change System Settings'] },
];

const INITIAL_SESSIONS = [
  { id: '1', device: 'MacBook Pro 16"', browser: 'Chrome 120.0', location: 'Mumbai, India', ip: '115.112.x.x', lastActive: 'Active now', current: true },
  { id: '2', device: 'iPhone 14 Pro', browser: 'Safari 17.1', location: 'Mumbai, India', ip: '49.36.x.x', lastActive: '2 hours ago', current: false },
];

export function PermissionsPage() {
  const { toggleRolePermission, hasPermission } = useData();
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);

  const revokeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="h-full flex flex-col relative z-10 animate-in fade-in duration-500 max-w-6xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Shield className="w-5 h-5" />
            </div>
            Security & Permissions
          </h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2 text-sm font-medium">
            Manage role-based access control and active sessions.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* RBAC Matrix Card */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-primary/5 p-6 relative overflow-hidden bg-white/70">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Key className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Role-Based Access Control</h2>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="py-4 px-5 font-bold text-slate-800 text-base border-b border-gray-200">Permission / Role</th>
                  {ROLES.map((role) => (
                    <th key={role} className="py-4 px-4 font-bold text-center text-slate-800 text-base border-b border-gray-200">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SYSTEM_PERMISSIONS.map((group) => (
                  <React.Fragment key={group.module}>
                    <tr className="bg-[#f0fdf4]/80">
                      <td colSpan={ROLES.length + 1} className="py-3 px-5 text-xs font-bold text-emerald-600 uppercase tracking-wider border-y border-emerald-100/60">
                        {group.module}
                      </td>
                    </tr>
                    {group.actions.map((action) => (
                      <tr key={action} className="border-b border-gray-100 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 text-sm text-slate-700 font-medium pl-6">{action}</td>
                        {ROLES.map((role) => {
                          const isAllowed = hasPermission(role, action);
                          return (
                            <td key={role} className="py-3.5 px-4 text-center">
                              <button 
                                onClick={() => toggleRolePermission(role, action)}
                                className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                                  isAllowed 
                                    ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600' 
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                {isAllowed ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-3 h-3" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Sessions Card */}
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-primary/5 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <MonitorSmartphone className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-gray-800">Active Sessions</h2>
            </div>
            <button className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Revoke All Other Sessions
            </button>
          </div>

          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border border-gray-100 bg-white/40 rounded-xl hover:bg-white/60 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${session.current ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                    <MonitorSmartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-800 text-sm">{session.device}</h4>
                      {session.current && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Current</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {session.browser} • {session.location} • {session.ip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium text-gray-500">{session.lastActive}</span>
                  {!session.current && (
                    <button 
                      onClick={() => revokeSession(session.id)}
                      className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No active sessions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
