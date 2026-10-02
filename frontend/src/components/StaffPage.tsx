import { useState, useMemo } from 'react';
import { Plus, Search, Edit, X, UserCheck, IndianRupee, Mail, Phone, Calendar, FilterX, ChevronDown, Eye, EyeOff, Trash2, Shield, Sparkles, RotateCcw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { SearchableSelect } from './SearchableSelect';

const ROLES = ['Admin', 'Manager', 'Employee'];

const SYSTEM_PERMISSIONS_MODULES = [
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

export function StaffPage() {
  const { staff, addStaff, updateStaff, deleteStaff, currentUserRole, hasPermission } = useData();
  const canCreateEditStaff = hasPermission(currentUserRole, 'Create/Edit Staff');
  const canDeleteStaff = hasPermission(currentUserRole, 'Delete Staff');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRole, setFilterRole] = useState('All');

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterRole('All');
    setFilterDateFrom('');
    setFilterDateTo('');
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [formData, setFormData] = useState<{
    name: string;
    role: string;
    email: string;
    phone: string;
    status: string;
    joinDate: string;
    baseSalary: string;
    password: string;
    permissions: Record<string, boolean>;
  }>({
    name: '',
    role: 'Employee',
    email: '',
    phone: '',
    status: 'Active',
    joinDate: new Date().toISOString().split('T')[0],
    baseSalary: '',
    password: '',
    permissions: {}
  });

  const uniqueRoles = useMemo(() => {
    return Array.from(new Set([...ROLES, ...staff.map(s => s.role)]));
  }, [staff]);

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || s.status === filterStatus;
      const matchRole = filterRole === 'All' || s.role === filterRole;
      
      const matchDateFrom = !filterDateFrom || (s.joinDate && new Date(s.joinDate) >= new Date(filterDateFrom));
      const matchDateTo = !filterDateTo || (s.joinDate && new Date(s.joinDate) <= new Date(filterDateTo));

      return matchSearch && matchStatus && matchRole && matchDateFrom && matchDateTo;
    });
  }, [staff, searchTerm, filterStatus, filterRole, filterDateFrom, filterDateTo]);

  const handleRoleChange = (selectedRole: string) => {
    setFormData(prev => ({
      ...prev,
      role: selectedRole
    }));
  };

  const handleOpenModal = (staffId: string | null = null) => {
    if (staffId) {
      const emp = staff.find(s => s.id === staffId);
      if (emp) {
        setFormData({
          name: emp.name,
          role: emp.role || 'Employee',
          email: emp.email,
          phone: emp.phone,
          status: emp.status,
          joinDate: emp.joinDate,
          baseSalary: emp.baseSalary?.toString() || '',
          password: (emp as any).password || '',
          permissions: (emp as any).permissions || {}
        });
        setEditingStaffId(staffId);
      }
    } else {
      setFormData({
        name: '',
        role: 'Employee',
        email: '',
        phone: '',
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0],
        baseSalary: '',
        password: '',
        permissions: {}
      });
      setEditingStaffId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaffId(null);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const staffData = {
      ...formData,
      baseSalary: parseFloat(formData.baseSalary) || 0
    };

    if (editingStaffId) {
      await updateStaff(editingStaffId, staffData);
    } else {
      await addStaff(staffData);
    }
    handleCloseModal();
  };

  const getStatusBadge = (emp: any) => {
    const status = emp.status;
    let colorClass = "";
    switch(status) {
      case 'Active': colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200'; break;
      case 'Inactive': colorClass = 'bg-rose-100 text-rose-700 border-rose-200'; break;
      case 'On Leave': colorClass = 'bg-amber-100 text-amber-700 border-amber-200'; break;
      default: colorClass = 'bg-gray-100 text-gray-700 border-gray-200'; break;
    }
    
    return (
      <select 
        value={status} 
        onChange={(e) => {
          const newStatus = e.target.value;
          updateStaff(emp.id, { status: newStatus });
        }}
        onClick={(e) => e.stopPropagation()}
        className={`${colorClass} px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide focus:outline-none cursor-pointer appearance-none pr-5 relative text-center`}
        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .3rem top 50%', backgroundSize: '.55rem auto' }}
      >
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
        <option value="On Leave">On Leave</option>
      </select>
    );
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Staff Management</h1>
        </div>
        <div className="flex items-center gap-3">
          {canCreateEditStaff && (
            <button 
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md overflow-hidden">
        <button onClick={() => setShowFilters(f => !f)} className="w-full flex items-center justify-between p-4 hover:bg-white/20 transition-colors cursor-pointer select-none">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Staff
          </h3>
          <div className="flex items-center gap-4">
            {(searchTerm !== '' || filterStatus !== 'All' || filterRole !== 'All' || filterDateFrom !== '' || filterDateTo !== '') && (
              <button 
                onClick={(e) => { e.stopPropagation(); resetFilters(); }}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Clear Filters
              </button>
            )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
          </div>
        </button>
        <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <SearchableSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'On Leave', label: 'On Leave' }
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Role</label>
            <SearchableSelect
              value={filterRole}
              onChange={setFilterRole}
              options={[
                { value: 'All', label: 'All Roles' },
                ...uniqueRoles.map(r => ({ value: r, label: r }))
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Join Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Join Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
          </div>
        </div>
        
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search staff by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-500"
          />
        </div>
          </div>
        </div>
      </div>

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6">Employee</th>
                <th className="py-4 px-6">Role</th>
                <th className="py-4 px-6">Contact Info</th>
                <th className="py-4 px-6">Join Date</th>
                <th className="py-4 px-6">Base Salary</th>
                <th className="py-4 px-6">Password</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-800 text-sm">{emp.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-gray-600 bg-gray-100/50 px-2 py-0.5 rounded text-[11px]">{emp.role}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-500">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {emp.email}</span>
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {emp.phone}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {emp.joinDate}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-emerald-700 flex items-center">
                        <IndianRupee className="w-3 h-3 mr-0.5" />
                        {emp.baseSalary.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-800 font-bold tracking-wider">
                          {visiblePasswords[emp.id] ? (emp.password || '••••••••') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(emp.id)}
                          className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-md hover:bg-white/80"
                          title={visiblePasswords[emp.id] ? "Hide Password" : "Show Password"}
                        >
                          {visiblePasswords[emp.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {getStatusBadge(emp)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {(canCreateEditStaff || canDeleteStaff) ? (
                        <div className="flex items-center justify-center gap-2">
                          {canCreateEditStaff && (
                            <button 
                              onClick={() => handleOpenModal(emp.id)}
                              className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                              title="Edit Staff"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteStaff && (
                            <button 
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${emp.name}?`)) {
                                  deleteStaff(emp.id);
                                }
                              }}
                              className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 hover:text-rose-700 transition-colors opacity-0 group-hover:opacity-100"
                              title="Delete Staff"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 font-medium cursor-default" title="Read Only">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <UserCheck className="w-12 h-12 text-gray-300 mb-4" />
                      <p>No staff members found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800">{editingStaffId ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveStaff} className="flex flex-col overflow-hidden flex-1">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Full Name <span className="text-rose-500">*</span></label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Role / Designation <span className="text-rose-500">*</span></label>
                    <SearchableSelect
                      value={formData.role}
                      onChange={handleRoleChange}
                      options={ROLES.map(r => ({ value: r, label: r }))}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Status</label>
                    <SearchableSelect
                      value={formData.status}
                      onChange={val => setFormData({...formData, status: val})}
                      options={[
                        { value: 'Active', label: 'Active' },
                        { value: 'Inactive', label: 'Inactive' },
                        { value: 'On Leave', label: 'On Leave' }
                      ]}
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Email <span className="text-rose-500">*</span></label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Phone <span className="text-rose-500">*</span></label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Join Date <span className="text-rose-500">*</span></label>
                    <input required type="date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Base Salary (₹) <span className="text-rose-500">*</span></label>
                    <input required type="number" min="0" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Password / Access Key</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Set login password..." 
                        value={formData.password} 
                        onChange={e => setFormData({...formData, password: e.target.value})} 
                        className="w-full pl-3 pr-10 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Individual Permission Overrides Section (Full Width Standalone Section) */}
                <div className="mt-6 pt-5 border-t border-gray-200/60 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        Individual Permission Overrides
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Customize permissions for this staff member. Unset permissions inherit from role (<span className="font-semibold text-gray-700">{formData.role}</span>).
                      </p>
                    </div>
                    {Object.keys(formData.permissions || {}).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, permissions: {} }))}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-all border border-rose-200/80 shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Overrides
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 bg-slate-50/60 rounded-2xl p-3.5 border border-slate-200/70 shadow-inner">
                    {SYSTEM_PERMISSIONS_MODULES.map(group => (
                      <div key={group.module} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {group.module}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {group.actions.length} {group.actions.length === 1 ? 'Action' : 'Actions'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {group.actions.map(action => {
                            const roleDefault = hasPermission(formData.role, action);
                            const isOverridden = formData.permissions?.[action] !== undefined;
                            const effectiveVal = isOverridden ? !!formData.permissions[action] : roleDefault;

                            const handleToggle = () => {
                              setFormData(prev => {
                                const currentPerms = { ...(prev.permissions || {}) };
                                if (currentPerms[action] !== undefined) {
                                  currentPerms[action] = !currentPerms[action];
                                } else {
                                  currentPerms[action] = !roleDefault;
                                }
                                return { ...prev, permissions: currentPerms };
                              });
                            };

                            return (
                              <div 
                                key={action} 
                                onClick={handleToggle}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                  isOverridden 
                                    ? 'bg-primary/5 border-primary/40 shadow-xs' 
                                    : 'bg-gray-50/50 hover:bg-white border-gray-200/80 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                  <input
                                    type="checkbox"
                                    checked={effectiveVal}
                                    onChange={handleToggle}
                                    onClick={e => e.stopPropagation()}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer shrink-0"
                                  />
                                  <span className="font-semibold text-gray-800 text-xs truncate" title={action}>
                                    {action}
                                  </span>
                                </div>
                                
                                <div className="shrink-0">
                                  {isOverridden ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5" /> Custom
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 border border-gray-200/60">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 flex justify-end gap-3 border-t border-white/40 bg-white/30 flex-shrink-0">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary text-white text-sm font-bold rounded-xl shadow-sm transition-all">
                  {editingStaffId ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
