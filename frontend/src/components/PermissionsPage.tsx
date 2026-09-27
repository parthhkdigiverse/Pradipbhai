import React from 'react';
import { Shield, Key, Check, X } from 'lucide-react';
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

export function PermissionsPage() {
  const { toggleRolePermission, rolePermissions, currentUserRole, hasPermission } = useData();

  // Read a role's permission directly from the role matrix (not the logged-in user's individual overrides)
  const getRolePermission = (role: string, action: string): boolean => {
    const roleMap = rolePermissions[role] || {};
    if (roleMap[action] !== undefined) return !!roleMap[action];
    return role === 'Admin';
  };

  // Only users with 'Edit Permissions' can toggle the matrix
  const canEdit = hasPermission(currentUserRole, 'Edit Permissions');

  return (
    <div className="h-full flex flex-col relative z-10 animate-in fade-in duration-500 max-w-6xl mx-auto w-full pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Shield className="w-5 h-5" />
            </div>
            Security &amp; Permissions
          </h1>
          <p className="text-gray-500 mt-2 flex items-center gap-2 text-sm font-medium">
            Manage role-based access control for your team.
          </p>
        </div>
      </div>

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
                        const isAllowed = getRolePermission(role, action);
                        return (
                          <td key={role} className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => canEdit && toggleRolePermission(role, action)}
                              disabled={!canEdit}
                              title={!canEdit ? 'No permission to edit' : (isAllowed ? 'Revoke' : 'Grant')}
                              className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors ${
                                isAllowed
                                  ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              } ${!canEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
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
    </div>
  );
}
