import { useState, useMemo, Fragment, useEffect } from 'react';
import { 
  Users, 
  Search, 
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Briefcase,
  Edit,
  Trash2,
  Check,
  X,
  Plus,
  TrendingUp,
  Activity,
  Calendar,
  Building,
  FilterX
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateFormatter';

export function ClientsPage() {
  const { dateFormat } = useSettings();
  const { clients, setClients, setJobs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Modals & Inline Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectClientId, setProjectClientId] = useState<string | null>(null);
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<any>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    status: 'Onboarding'
  });

  const [projectFormData, setProjectFormData] = useState({
    name: '',
    category: 'Designing',
    status: 'Planning',
    budget: '',
    deadline: ''
  });

  const resetForm = () => {
    setFormData({
      company: '',
      contact: '',
      email: '',
      phone: '',
      status: 'Onboarding'
    });
    setEditingClientId(null);
  };

  const handleOpenModal = (clientId: string | null = null) => {
    if (clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setFormData({
          company: client.company,
          contact: client.contact,
          email: client.email,
          phone: client.phone,
          status: client.status
        });
        setEditingClientId(clientId);
      }
    } else {
      resetForm();
    }
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleOpenProjectModal = (clientId: string, projectIndex: number | null = null) => {
    if (projectIndex !== null) {
      const client = clients.find(c => c.id === clientId);
      if (client && client.projects) {
        setProjectFormData(client.projects[projectIndex]);
      }
      setEditingProjectIndex(projectIndex);
    } else {
      setProjectFormData({
        name: '',
        category: 'Designing',
        status: 'Planning',
        budget: '',
        deadline: new Date().toISOString().split('T')[0]
      });
      setEditingProjectIndex(null);
    }
    setProjectClientId(clientId);
    setIsProjectModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCloseProjectModal = () => {
    setIsProjectModalOpen(false);
    setProjectClientId(null);
    setEditingProjectIndex(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) handleCloseModal();
        if (isProjectModalOpen) handleCloseProjectModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isProjectModalOpen]);

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectClientId) {
      setClients(clients.map(c => {
        if (c.id === projectClientId) {
          if (editingProjectIndex !== null) {
            const newProjects = [...(c.projects || [])];
            newProjects[editingProjectIndex] = { ...projectFormData };
            return { ...c, projects: newProjects };
          } else {
            const newJob = {
              id: Math.random().toString(36).substr(2, 9),
              createdBy: 'System',
              createdAt: new Date().toISOString().split('T')[0],
              title: projectFormData.name,
              type: projectFormData.category,
              description: 'Automatically created job for new project.',
              clientId: c.id,
              projectId: projectFormData.name,
              status: 'Pending',
              teamId: '',
              dueDate: projectFormData.deadline || new Date().toISOString().split('T')[0],
              paymentStatus: 'Unpaid',
              totalAmount: projectFormData.budget ? parseFloat(projectFormData.budget) : 0,
              paidAmount: 0,
              printerId: null,
              productId: ''
            };
            
            // Note: We need to use a function updater or just call setJobs if we have the latest state, but we don't have jobs inside setClients directly without depending on closure. It's safe since handleSaveProject has the latest closure of `jobs` when called.
            setJobs(prevJobs => [...prevJobs, newJob]);

            return {
              ...c,
              projects: [...(c.projects || []), { ...projectFormData }]
            };
          }
        }
        return c;
      }));
    }
    handleCloseProjectModal();
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClientId) {
      setClients(clients.map(c => c.id === editingClientId ? { ...c, ...formData } : c));
    } else {
      setClients([
        {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
          projects: [],
          clientSince: new Date().toISOString().split('T')[0]
        },
        ...clients
      ]);
    }
    handleCloseModal();
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('Are you sure you want to delete this client? This cannot be undone.')) {
      setClients(clients.filter(c => c.id !== id));
      setOpenMenuId(null);
    }
  };

  const handleStartInlineEdit = (client: any) => {
    setEditingRowId(client.id);
    setEditRowData({ ...client });
    setOpenMenuId(null);
  };

  const handleSaveInlineEdit = () => {
    if (editingRowId && editRowData) {
      setClients(clients.map(c => c.id === editingRowId ? { ...c, ...editRowData } : c));
    }
    setEditingRowId(null);
    setEditRowData(null);
  };

  // Derived Data
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        client.company.toLowerCase().includes(searchLower) ||
        client.contact.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
      if (filterStatus !== 'All' && client.status !== filterStatus) return false;
      
      const matchDateFrom = !filterDateFrom || (client.clientSince && new Date(client.clientSince) >= new Date(filterDateFrom));
      const matchDateTo = !filterDateTo || (client.clientSince && new Date(client.clientSince) <= new Date(filterDateTo));

      return matchDateFrom && matchDateTo;
    });
  }, [clients, searchTerm, filterStatus, filterDateFrom, filterDateTo]);

  const stats = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'Active' || c.status === 'Onboarding');
    const totalRevenue = activeClients.reduce((sum, c) => {
      const clientRevenue = (c.projects || []).reduce((pSum: number, p: any) => pSum + parseFloat(p.budget || '0'), 0);
      return sum + clientRevenue;
    }, 0);
    const mrr = Math.round(totalRevenue / 12); // Mock MRR calculation
    const avgLTV = activeClients.length > 0 ? Math.round(totalRevenue / activeClients.length) : 0;
    
    // New clients this month
    const thisMonth = new Date().getMonth();
    const newClients = clients.filter(c => new Date(c.clientSince).getMonth() === thisMonth).length;

    return [
      { title: "Active Clients", value: activeClients.length.toString(), trend: "+2", trendUp: true, icon: <Building className="w-5 h-5" />, color: "text-blue-600" },
      { title: "Monthly Recurring Revenue", value: `₹${mrr.toLocaleString()}`, trend: "+15%", trendUp: true, icon: <Activity className="w-5 h-5" />, color: "text-emerald-600" },
      { title: "Average LTV", value: `₹${avgLTV.toLocaleString()}`, trend: "+5%", trendUp: true, icon: <TrendingUp className="w-5 h-5" />, color: "text-indigo-600" },
      { title: "New Clients (Monthly)", value: newClients.toString(), trend: "-1", trendUp: false, icon: <Users className="w-5 h-5" />, color: "text-amber-600" },
    ];
  }, [clients]);

  const getStatusBadge = (client: any) => {
    const status = client.status;
    let colorClass = "";
    switch (status) {
      case "Active": colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; break;
      case "Onboarding": colorClass = "bg-blue-100 text-blue-700 border-blue-200"; break;
      case "Inactive": colorClass = "bg-gray-100 text-gray-700 border-gray-200"; break;
      default: colorClass = "bg-slate-100 text-slate-700 border-slate-200"; break;
    }

    return (
      <select 
        value={status} 
        onChange={(e) => {
          const newStatus = e.target.value;
          setClients((prev) => prev.map(c => c.id === client.id ? { ...c, status: newStatus } : c));
        }}
        onClick={(e) => e.stopPropagation()}
        className={`${colorClass} px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wide focus:outline-none cursor-pointer appearance-none pr-5 relative`}
        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .3rem top 50%', backgroundSize: '.65rem auto' }}
      >
        <option value="Active">Active</option>
        <option value="Onboarding">Onboarding</option>
        <option value="Inactive">Inactive</option>
      </select>
    );
  };

  const getProjectStatusBadge = (status: string) => {
    switch (status) {
      case "Active": 
      case "In Progress": return <span className="text-blue-600 font-semibold text-xs">{status}</span>;
      case "Completed": return <span className="text-emerald-600 font-semibold text-xs">{status}</span>;
      case "Planning": return <span className="text-amber-600 font-semibold text-xs">{status}</span>;
      default: return <span className="text-gray-600 font-semibold text-xs">{status}</span>;
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Client Management</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass-panel rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-500 text-sm font-medium">{stat.title}</div>
              <div className={`p-2 rounded-lg bg-white/50 ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800 mb-2">{stat.value}</div>
            <div className={`flex items-center gap-1 text-xs font-semibold ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {stat.trend} <span className="text-gray-400 font-normal ml-1">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col min-h-[500px]">
        {/* Advanced Filters Panel */}
        <div className="border-b border-white/40 bg-white/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FilterX className="w-4 h-4 text-gray-500" />
              Filter Clients
            </h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={resetFilters}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5"
              >
                Reset Filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Client Since From</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Client Since To</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
            </div>
          </div>
          
          <div className="mt-3 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by company, contact, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 bg-white/10 p-4 pt-0">
          <div className="glass-panel border border-white/60 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50 text-xs">
                  <th className="px-5 py-4">Client Details</th>
                  <th className="px-5 py-4">Primary Contact</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Client Since</th>
                  <th className="px-5 py-4">Lifetime Revenue</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Building className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="font-medium text-gray-600">No clients found</p>
                        <p className="text-sm">Adjust your filters or add a new client.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(client => (
                    <Fragment key={client.id}>
                      <tr className="border-b border-white/20 hover:bg-white/40 transition-colors">
                        {editingRowId === client.id ? (
                          <>
                            <td className="px-5 py-4">
                              <input type="text" value={editRowData.company} onChange={e => setEditRowData({...editRowData, company: e.target.value})} className="w-full px-2 py-1 bg-white/70 border border-blue-200 rounded text-sm font-bold text-gray-800" placeholder="Company Name" />
                            </td>
                            <td className="px-5 py-4">
                              <input type="text" value={editRowData.contact} onChange={e => setEditRowData({...editRowData, contact: e.target.value})} className="w-full mb-1 px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" placeholder="Contact Name" />
                              <input type="email" value={editRowData.email} onChange={e => setEditRowData({...editRowData, email: e.target.value})} className="w-full mb-1 px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" placeholder="Email" />
                              <input type="tel" value={editRowData.phone} onChange={e => setEditRowData({...editRowData, phone: e.target.value})} className="w-full px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" placeholder="Phone" />
                            </td>
                            <td className="px-5 py-4">
                              <select value={editRowData.status} onChange={e => setEditRowData({...editRowData, status: e.target.value})} className="w-full px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800">
                                <option value="Onboarding">Onboarding</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {formatDate(editRowData.clientSince, dateFormat)}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-emerald-700 bg-emerald-50/50 rounded">
                              ₹{(editRowData.projects || []).reduce((sum: number, p: any) => sum + parseFloat(p.budget || '0'), 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={handleSaveInlineEdit} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors" title="Save"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingRowId(null)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => setExpandedRowId(expandedRowId === client.id ? null : client.id)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                  {expandedRowId === client.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <div>
                                  <span className="font-bold text-gray-800 text-sm block">{client.company}</span>
                                  <span className="text-[11px] text-gray-500 font-medium block mt-0.5">{client.projects?.length || 0} active projects</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-gray-700">{client.contact}</span>
                                <div className="flex flex-col gap-1 mt-1">
                                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                    <Mail className="w-3 h-3" /> {client.email}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                    <Phone className="w-3 h-3" /> {client.phone}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">{getStatusBadge(client)}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {formatDate(client.clientSince, dateFormat)}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-emerald-700">
                              ₹{(client.projects || []).reduce((sum: number, p: any) => sum + parseFloat(p.budget || '0'), 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-right relative">
                              <button onClick={() => handleStartInlineEdit(client)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => setOpenMenuId(openMenuId === client.id ? null : client.id)} className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ml-1">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              
                              {openMenuId === client.id && (
                                <div className="absolute right-6 top-10 w-32 glass-panel border border-white/60 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                                  <button onClick={() => handleOpenModal(client.id)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2">
                                    <Edit className="w-4 h-4" /> Full Edit
                                  </button>
                                  <button onClick={() => handleDeleteClient(client.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Expandable Project List */}
                      {expandedRowId === client.id && (
                        <tr className="bg-white/40">
                          <td colSpan={6} className="px-8 py-6 border-b border-white/20">
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 text-blue-600" /> Active Projects
                                </h4>
                                <button onClick={() => handleOpenProjectModal(client.id)} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                  <Plus className="w-3 h-3" /> New Project
                                </button>
                              </div>
                              
                              {client.projects && client.projects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {client.projects.map((proj: any, idx: number) => (
                                    <div key={idx} className="bg-white/60 border border-white/60 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer">
                                      <div>
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex-1 min-w-0 pr-2">
                                            <h5 className="font-bold text-gray-800 text-sm truncate">{proj.name}</h5>
                                            <div className="mt-0.5">{getProjectStatusBadge(proj.status)}</div>
                                          </div>
                                          <button onClick={() => handleOpenProjectModal(client.id, idx)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors shrink-0" title="Edit Project">
                                            <Edit className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <div className="flex flex-col gap-1.5 mt-2">
                                          {proj.category && (
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="text-gray-500 font-medium">Category:</span>
                                              <span className="font-semibold text-gray-700">{proj.category}</span>
                                            </div>
                                          )}
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500 font-medium">Budget:</span>
                                            <span className="font-bold text-emerald-700">₹{parseFloat(proj.budget || '0').toLocaleString()}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-gray-500 font-medium">Deadline:</span>
                                            <span className="font-bold text-gray-700">{formatDate(proj.deadline, dateFormat)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-white/40 border border-white/50 rounded-xl p-6 text-center">
                                  <p className="text-sm text-gray-500 font-medium">No active projects linked to this client.</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-xl font-bold text-gray-800">
                {editingClientId ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveClient} className="p-5 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Company Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Primary Contact</label>
                    <input type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                      <option value="Onboarding">Onboarding</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Phone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/40 mt-6">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white/50 rounded-xl transition-all border border-transparent hover:border-gray-200">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md">
                  {editingClientId ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseProjectModal}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-lg font-bold text-gray-800">
                {editingProjectIndex !== null ? 'Edit Project' : 'Add New Project'}
              </h2>
              <button onClick={handleCloseProjectModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProject} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Project Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={projectFormData.name} onChange={e => setProjectFormData({...projectFormData, name: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="e.g. Website Redesign" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Category</label>
                  <select value={projectFormData.category} onChange={e => setProjectFormData({...projectFormData, category: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="Designing">Designing</option>
                    <option value="Printing">Printing</option>
                    <option value="Des+Print">Des+Print</option>
                    <option value="Social Media">Social Media</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Status</label>
                  <select disabled title="Status is calculated automatically from Jobs" value={projectFormData.status} onChange={e => setProjectFormData({...projectFormData, status: e.target.value})} className="w-full px-3 py-2 bg-gray-100/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-400 cursor-not-allowed">
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Budget (₹) <span className="text-rose-500">*</span></label>
                  <input required type="number" value={projectFormData.budget} onChange={e => setProjectFormData({...projectFormData, budget: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="500000" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Deadline <span className="text-rose-500">*</span></label>
                <input required type="date" value={projectFormData.deadline} onChange={e => setProjectFormData({...projectFormData, deadline: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/40 mt-6">
                <button type="button" onClick={handleCloseProjectModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white/50 rounded-xl transition-all border border-transparent hover:border-gray-200">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md">
                  {editingProjectIndex !== null ? 'Save Changes' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
