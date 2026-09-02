import { useState, useMemo } from 'react';
import { Plus, Search, Edit, X, UserCheck, IndianRupee, Mail, Phone, Calendar } from 'lucide-react';
import { useData } from '../context/DataContext';

export function StaffPage() {
  const { staff, setStaff } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    status: 'Active',
    joinDate: new Date().toISOString().split('T')[0],
    baseSalary: ''
  });

  const filteredStaff = useMemo(() => {
    return staff.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staff, searchTerm]);

  const handleOpenModal = (staffId: string | null = null) => {
    if (staffId) {
      const emp = staff.find(s => s.id === staffId);
      if (emp) {
        setFormData({
          name: emp.name,
          role: emp.role,
          email: emp.email,
          phone: emp.phone,
          status: emp.status,
          joinDate: emp.joinDate,
          baseSalary: emp.baseSalary.toString()
        });
        setEditingStaffId(staffId);
      }
    } else {
      setFormData({
        name: '',
        role: '',
        email: '',
        phone: '',
        status: 'Active',
        joinDate: new Date().toISOString().split('T')[0],
        baseSalary: ''
      });
      setEditingStaffId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaffId(null);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const staffData = {
      ...formData,
      baseSalary: parseFloat(formData.baseSalary) || 0
    };

    if (editingStaffId) {
      setStaff(prev => prev.map(s => s.id === editingStaffId ? { ...s, ...staffData } : s));
    } else {
      const newStaff = {
        id: Math.random().toString(36).substr(2, 9),
        ...staffData
      };
      setStaff(prev => [...prev, newStaff]);
    }
    handleCloseModal();
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Inactive': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'On Leave': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Staff Management</h1>
          <div className="text-sm text-gray-500 bg-white/40 px-3 py-1.5 rounded-full border border-white/60 backdrop-blur-md inline-block">
            Home &gt; HR &gt; <span className="text-gray-800 font-medium">Staff</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      <div className="p-5 flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search staff by name or role..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500 shadow-sm"
          />
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
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wide ${getStatusBadge(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleOpenModal(emp.id)}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 hover:text-blue-700 transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit Staff"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
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
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-lg font-bold text-gray-800">{editingStaffId ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveStaff} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Full Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Role / Designation *</label>
                  <input required type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Email *</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Phone *</label>
                  <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Join Date *</label>
                  <input required type="date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Base Salary (₹) *</label>
                  <input required type="number" min="0" value={formData.baseSalary} onChange={e => setFormData({...formData, baseSalary: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/40">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all">
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
