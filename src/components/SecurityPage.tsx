import React, { useState } from 'react';
import { Shield, ShieldAlert, MonitorSmartphone, Key, Check, X } from 'lucide-react';

const mockRoles = ['Admin', 'Manager', 'Designer', 'Printer'];
const mockPermissions = [
  { module: 'Dashboard', actions: ['View Metrics', 'Export Data'] },
  { module: 'Jobs', actions: ['Create Job', 'Edit Job', 'Delete Job'] },
  { module: 'Staff & Payroll', actions: ['View Staff', 'Manage Payroll', 'Edit Permissions'] },
  { module: 'Clients', actions: ['View Clients', 'Edit Clients', 'Delete Clients'] },
];

const mockRoleMatrix: Record<string, Record<string, boolean>> = {
  'Admin': { 'View Metrics': true, 'Export Data': true, 'Create Job': true, 'Edit Job': true, 'Delete Job': true, 'View Staff': true, 'Manage Payroll': true, 'Edit Permissions': true, 'View Clients': true, 'Edit Clients': true, 'Delete Clients': true },
  'Manager': { 'View Metrics': true, 'Export Data': false, 'Create Job': true, 'Edit Job': true, 'Delete Job': false, 'View Staff': true, 'Manage Payroll': false, 'Edit Permissions': false, 'View Clients': true, 'Edit Clients': true, 'Delete Clients': false },
  'Designer': { 'View Metrics': false, 'Export Data': false, 'Create Job': true, 'Edit Job': false, 'Delete Job': false, 'View Staff': false, 'Manage Payroll': false, 'Edit Permissions': false, 'View Clients': false, 'Edit Clients': false, 'Delete Clients': false },
  'Printer': { 'View Metrics': false, 'Export Data': false, 'Create Job': false, 'Edit Job': false, 'Delete Job': false, 'View Staff': false, 'Manage Payroll': false, 'Edit Permissions': false, 'View Clients': false, 'Edit Clients': false, 'Delete Clients': false },
};

const mockSessions = [
  { id: '1', device: 'MacBook Pro 16"', browser: 'Chrome 120.0', location: 'Mumbai, India', ip: '115.112.x.x', lastActive: 'Active now', current: true },
  { id: '2', device: 'iPhone 14 Pro', browser: 'Safari 17.1', location: 'Mumbai, India', ip: '49.36.x.x', lastActive: '2 hours ago', current: false },
  { id: '3', device: 'Windows Desktop', browser: 'Edge 119.0', location: 'Delhi, India', ip: '103.45.x.x', lastActive: '2 days ago', current: false },
];

export function SecurityPage() {
  const [matrix, setMatrix] = useState(mockRoleMatrix);
  const [sessions, setSessions] = useState(mockSessions);

  const togglePermission = (role: string, action: string) => {
    setMatrix(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [action]: !prev[role][action]
      }
    }));
  };

  const revokeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="h-full flex flex-col relative z-10 animate-in fade-in duration-500 max-w-6xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
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
        <div className="glass-panel border border-white/60 rounded-2xl shadow-xl shadow-primary/5 p-6 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-800">Role-Based Access Control</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-4 px-4 font-bold text-gray-700 bg-gray-50/50 rounded-tl-xl border-b border-gray-100">Permission / Role</th>
                  {mockRoles.map((role, idx) => (
                    <th key={role} className={`py-4 px-4 font-bold text-center text-gray-700 bg-gray-50/50 border-b border-gray-100 ${idx === mockRoles.length - 1 ? 'rounded-tr-xl' : ''}`}>
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockPermissions.map((group) => (
                  <React.Fragment key={group.module}>
                    <tr>
                      <td colSpan={mockRoles.length + 1} className="py-3 px-4 bg-primary/5 text-xs font-bold text-primary uppercase tracking-wider border-b border-gray-100">
                        {group.module}
                      </td>
                    </tr>
                    {group.actions.map((action) => (
                      <tr key={action} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-700 font-medium">{action}</td>
                        {mockRoles.map((role) => (
                          <td key={role} className="py-3 px-4 text-center">
                            <button 
                              onClick={() => togglePermission(role, action)}
                              className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                                matrix[role]?.[action] 
                                  ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {matrix[role]?.[action] ? <Check className="w-4 h-4" /> : <X className="w-3 h-3" />}
                            </button>
                          </td>
                        ))}
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
