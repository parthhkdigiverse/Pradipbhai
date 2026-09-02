import { useState, useMemo, useEffect, Fragment } from 'react';
import { 
  Users, Target, Search, Filter, MoreHorizontal, Phone, Mail,
  Calendar, Plus, Flame, IndianRupee, TrendingUp, Edit, X, Trash2, Check,
  ChevronDown, ChevronUp, Clock, History
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateFormatter';

export function LeadsPage() {
  const { dateFormat } = useSettings();
  const { leads, setLeads, convertLeadToClient } = useData();
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Master Filter State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    category: [] as string[],
    source: [] as string[],
    dateFrom: '',
    dateTo: ''
  });
  
  const activeFilterCount = filters.status.length + filters.category.length + filters.source.length + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  // Inline Row Edit State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<any>(null);

  // Expandable Row State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Expandable Category State
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const handleStartInlineEdit = (lead: any) => {
    setEditingRowId(lead.id);
    setEditRowData({ ...lead });
    setOpenMenuId(null);
  };

  const handleSaveInlineEdit = () => {
    if (editingRowId && editRowData) {
      // Find the original lead to see if status changed
      const originalLead = leads.find(l => l.id === editingRowId);
      
      setLeads((prevLeads) => prevLeads.map(l => {
        if (l.id === editingRowId) {
          const updatedLead: any = { ...l, ...editRowData };
          if (editRowData.followUpDate || editRowData.followUpNote) {
            updatedLead.followUps = [
              { date: editRowData.followUpDate, note: editRowData.followUpNote },
              ...(l.followUps || [])
            ];
            delete updatedLead.followUpDate;
            delete updatedLead.followUpNote;
          }
          return updatedLead;
        }
        return l;
      }));

      // Call convertLeadToClient if the status changed to 'Client Won'
      if (originalLead && originalLead.status !== editRowData.status && editRowData.status === 'Client Won') {
        convertLeadToClient({ ...originalLead, ...editRowData });
      }
    }
    setEditingRowId(null);
    setEditRowData(null);
  };

  const handleCancelInlineEdit = () => {
    setEditingRowId(null);
    setEditRowData(null);
  };

  const [formData, setFormData] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    source: '',
    category: 'Warm Lead',
    status: 'Lead',
    expectedIncome: '',
    isHot: false,
    followUpDate: '',
    followUpNote: ''
  });

  // Action Menu State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      company: '',
      contact: '',
      email: '',
      phone: '',
      source: '',
      category: 'Warm Lead',
      status: 'Lead',
      expectedIncome: '',
      isHot: false,
      followUpDate: '',
      followUpNote: ''
    });
    setEditingLeadId(null);
  };

  const toggleHotLead = (id: string) => {
    setLeads(leads.map(l => l.id === id ? { ...l, isHot: !l.isHot } : l));
  };

  const handleOpenModal = (leadId: string | null = null) => {
    if (leadId) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setFormData({
          company: lead.company,
          contact: lead.contact,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          category: lead.category,
          status: lead.status,
          expectedIncome: lead.expectedIncome,
          isHot: lead.isHot,
          followUpDate: '',
          followUpNote: ''
        });
        setEditingLeadId(leadId);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) handleCloseModal();
        if (isFilterModalOpen) setIsFilterModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isFilterModalOpen]);

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLeadId) {
      const originalLead = leads.find(l => l.id === editingLeadId);
      
      setLeads((prevLeads) => prevLeads.map(l => {
        if (l.id === editingLeadId) {
          const updatedLead: any = { ...l, ...formData };
          if (formData.followUpDate || formData.followUpNote) {
            updatedLead.followUps = [
              { date: formData.followUpDate, note: formData.followUpNote },
              ...(l.followUps || [])
            ];
            delete updatedLead.followUpDate;
            delete updatedLead.followUpNote;
          }
          return updatedLead;
        }
        return l;
      }));
      
      if (originalLead && originalLead.status !== formData.status && formData.status === 'Client Won') {
        convertLeadToClient({ ...originalLead, ...formData });
      }
    } else {
      const newLead = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        priority: formData.isHot ? 'High' : 'Medium',
        createdByUserName: 'Admin',
        date: new Date().toISOString().split('T')[0],
        followUps: formData.followUpDate || formData.followUpNote ? [{ date: formData.followUpDate, note: formData.followUpNote }] : []
      };
      // @ts-ignore (ignoring temporary form fields)
      delete newLead.followUpDate;
      // @ts-ignore
      delete newLead.followUpNote;
      setLeads([newLead, ...leads]);
    }
    handleCloseModal();
  };

  const handleDeleteLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id));
    setOpenMenuId(null);
  };

  // Filtering Logic
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Search Filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        lead.company.toLowerCase().includes(searchLower) ||
        lead.contact.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower) ||
        lead.phone.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Master Filters
      if (filters.status.length > 0 && !filters.status.includes(lead.status)) return false;
      if (filters.category.length > 0 && !filters.category.includes(lead.category)) return false;
      if (filters.source.length > 0 && !filters.source.includes(lead.source)) return false;
      if (filters.dateFrom && new Date(lead.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(lead.date) > new Date(filters.dateTo)) return false;

      // 3. Tab Filter
      if (activeTab === 'active') {
        return lead.status !== 'Client Won' && lead.status !== 'Client Lost';
      }
      if (activeTab === 'converted') {
        return lead.status === 'Client Won';
      }
      if (activeTab === 'hot') {
        return lead.isHot && lead.status !== 'Client Won' && lead.status !== 'Client Lost';
      }
      if (activeTab === 'overdue') {
        // Mock logic for overdue: high priority or on hold
        return (lead.priority === 'High' || lead.status === 'On Hold') && lead.status !== 'Client Won';
      }
      return true;
    });
  }, [leads, activeTab, searchTerm, filters]);

  const groupedLeads = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredLeads.forEach(lead => {
      if (!groups[lead.category]) groups[lead.category] = [];
      groups[lead.category].push(lead);
    });
    
    // Custom sort order
    const order = ['Hot Lead', 'Warm Lead', 'Cold Lead'];
    return Object.entries(groups).sort((a, b) => {
       const idxA = order.indexOf(a[0]);
       const idxB = order.indexOf(b[0]);
       return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });
  }, [filteredLeads]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: prev[category] === false ? true : false }));
  };

  // Dynamic Stats
  const dynamicStats = useMemo(() => {
    const target = 50000;
    const revenue = leads
      .filter(l => l.status === 'Client Won')
      .reduce((sum, l) => sum + (parseFloat(l.expectedIncome) || 0), 0);
    
    const activeCount = leads.filter(l => l.status !== 'Client Won' && l.status !== 'Client Lost').length;
    const progress = Math.min(100, Math.round((revenue / target) * 100));

    return [
      { title: "Monthly Revenue", value: `₹${revenue.toLocaleString()}`, trend: "+12.5%", trendUp: true, icon: <IndianRupee className="w-5 h-5" />, color: "text-emerald-600" },
      { title: "Monthly Progress", value: `${progress}%`, trend: `₹${revenue.toLocaleString()}`, trendUp: progress >= 50, icon: <Target className="w-5 h-5" />, color: "text-indigo-600" },
      { title: "Active Leads", value: activeCount.toString(), trend: "+5", trendUp: true, icon: <Users className="w-5 h-5" />, color: "text-blue-600" },
      { title: "Target (Monthly)", value: `₹${target.toLocaleString()}`, trend: "September", trendUp: true, icon: <TrendingUp className="w-5 h-5" />, color: "text-teal-600" },
    ];
  }, [leads]);

  const getStatusBadge = (lead: any) => {
    const status = lead.status;
    let colorClass = "";
    switch (status) {
      case "Client Won": colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; break;
      case "Client Lost": colorClass = "bg-rose-100 text-rose-700 border-rose-200"; break;
      case "Proposal Sent": colorClass = "bg-amber-100 text-amber-700 border-amber-200"; break;
      case "Contacted": colorClass = "bg-indigo-100 text-indigo-700 border-indigo-200"; break;
      case "On Hold": colorClass = "bg-blue-100 text-blue-700 border-blue-200"; break;
      default: colorClass = "bg-slate-100 text-slate-700 border-slate-200"; break;
    }

    return (
      <select 
        value={status} 
        onChange={(e) => {
          const newStatus = e.target.value;
          if (newStatus === 'Client Won') {
             convertLeadToClient({ ...lead, status: newStatus });
          }
          setLeads((prev) => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
        }}
        className={`${colorClass} px-2 py-1 rounded text-xs font-semibold border focus:outline-none cursor-pointer appearance-none pr-5 relative`}
        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .3rem top 50%', backgroundSize: '.65rem auto' }}
      >
        <option value="New">New</option>
        <option value="Contacted">Contacted</option>
        <option value="Proposal Sent">Proposal Sent</option>
        <option value="On Hold">On Hold</option>
        <option value="Client Won">Client Won</option>
        <option value="Client Lost">Client Lost</option>
      </select>
    );
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Sales Management</h1>
          <div className="text-sm text-gray-500 bg-white/40 px-3 py-1.5 rounded-full border border-white/60 backdrop-blur-md inline-block">
            Home &gt; <span className="text-gray-800 font-medium">Sales</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="font-semibold text-sm">Add Lead</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {dynamicStats.map((stat, i) => (
          <div key={i} className="glass-panel rounded-2xl p-5 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-all duration-300">
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
        <div className="px-5 pt-5 pb-0 border-b border-white/40 bg-white/20">
          <div className="flex items-center gap-6">
            {['active', 'converted', 'hot', 'overdue'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 text-sm font-semibold capitalize border-b-2 transition-all ${
                  activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab} Leads
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-5 flex items-center justify-between gap-4 bg-white/10">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500"
            />
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsFilterModalOpen(true)}
               className={`flex items-center gap-2 px-3 py-2 border rounded-xl text-sm font-medium transition-all ${activeFilterCount > 0 ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-white/50 border-white/60 text-gray-700 hover:bg-white/80'}`}
             >
               <Filter className="w-4 h-4" /> 
               Filters
               {activeFilterCount > 0 && (
                 <span className="bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                   {activeFilterCount}
                 </span>
               )}
             </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1 p-4 bg-white/10">
          {groupedLeads.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Users className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-600">No leads found</p>
              <p className="text-sm">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedLeads.map(([category, categoryLeads]) => (
                <div key={category} className="glass-panel border border-white/60 rounded-xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-white/40 hover:bg-white/60 transition-colors border-b border-white/20"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${expandedCategories[category] !== false ? '' : '-rotate-90'}`} />
                      <h3 className="font-bold text-gray-800">{category}</h3>
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{categoryLeads.length}</span>
                    </div>
                  </button>
                  
                  {expandedCategories[category] !== false && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/10 border-b border-white/20 text-[11px] uppercase text-gray-500 font-bold tracking-wider">
                            <th className="px-5 py-3">Lead Info</th>
                            <th className="px-5 py-3">Contact</th>
                            <th className="px-5 py-3">Source</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Follow-up</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryLeads.map((lead) => (
                            <Fragment key={lead.id}>
                            <tr className="border-b border-white/20 hover:bg-white/30 transition-colors">
                              {editingRowId === lead.id ? (
                                <>
                                  <td className="px-5 py-3">
                                    <input type="text" value={editRowData.company} onChange={e => setEditRowData({...editRowData, company: e.target.value})} className="w-full mb-2 px-2 py-1 bg-white/70 border border-blue-200 rounded text-sm text-gray-800" placeholder="Company" />
                                    <button type="button" onClick={() => setEditRowData({...editRowData, isHot: !editRowData.isHot})} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors border ${editRowData.isHot ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`} title="Toggle Hot Lead">
                                      <Flame className={`w-3.5 h-3.5 ${editRowData.isHot ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
                                      {editRowData.isHot ? 'Hot Lead' : 'Mark Hot'}
                                    </button>
                                  </td>
                                  <td className="px-5 py-3">
                                    <input type="text" value={editRowData.contact} onChange={e => setEditRowData({...editRowData, contact: e.target.value})} className="w-full mb-1 px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" placeholder="Contact" />
                                    <input type="email" value={editRowData.email} onChange={e => setEditRowData({...editRowData, email: e.target.value})} className="w-full mb-1 px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" placeholder="Email" />
                                    <input type="tel" value={editRowData.phone} onChange={e => setEditRowData({...editRowData, phone: e.target.value})} className="w-full px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" placeholder="Phone" />
                                  </td>
                                  <td className="px-5 py-3">
                                    <input type="text" value={editRowData.source} onChange={e => setEditRowData({...editRowData, source: e.target.value})} className="w-full px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" placeholder="Source" />
                                  </td>
                                  <td className="px-5 py-3">
                                    <select value={editRowData.status} onChange={e => setEditRowData({...editRowData, status: e.target.value})} className="w-full px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800">
                                      <option value="Lead">Lead</option>
                                      <option value="Contacted">Contacted</option>
                                      <option value="Proposal Sent">Proposal Sent</option>
                                      <option value="On Hold">On Hold</option>
                                      <option value="Client Won">Client Won</option>
                                      <option value="Client Lost">Client Lost</option>
                                    </select>
                                  </td>
                                  <td className="px-5 py-3">
                                    <input type="date" value={editRowData.followUpDate || ''} onChange={e => setEditRowData({...editRowData, followUpDate: e.target.value})} className="w-full mb-1 px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" />
                                    <input type="text" value={editRowData.followUpNote || ''} onChange={e => setEditRowData({...editRowData, followUpNote: e.target.value})} className="w-full px-2 py-1 bg-white/70 border border-blue-200 rounded text-xs text-gray-800" placeholder="Add new note..." />
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button onClick={handleSaveInlineEdit} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors" title="Save">
                                        <Check className="w-4 h-4" />
                                      </button>
                                      <button onClick={handleCancelInlineEdit} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Cancel">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-5 py-3">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <button 
                                          onClick={() => setExpandedRowId(expandedRowId === lead.id ? null : lead.id)}
                                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        >
                                          {expandedRowId === lead.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        <span className="font-bold text-gray-800 text-sm">{lead.company}</span>
                                        <button 
                                          onClick={() => toggleHotLead(lead.id)}
                                          className={`p-1 rounded-full transition-colors ${lead.isHot ? 'bg-orange-50 text-orange-500 hover:bg-orange-100' : 'text-gray-300 hover:text-orange-400 hover:bg-gray-100'}`}
                                          title={lead.isHot ? "Remove Hot Lead" : "Mark as Hot Lead"}
                                        >
                                          <Flame className={`w-3.5 h-3.5 ${lead.isHot ? 'fill-orange-500' : ''}`} />
                                        </button>
                                      </div>
                                      <div className="flex flex-col gap-1 mt-1 pl-6">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                          <Calendar className="w-3 h-3" />
                                          Created: {formatDate(lead.date, dateFormat)}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex flex-col">
                                      <span className="text-[13px] font-bold text-gray-700">{lead.contact}</span>
                                      <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                          <Mail className="w-3 h-3" /> {lead.email}
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                          <Phone className="w-3 h-3" /> {lead.phone}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                      <span className="text-[12px] font-medium text-gray-600">{lead.source || '-'}</span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    {getStatusBadge(lead)}
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex flex-col max-w-[200px]">
                                      {lead.followUps && lead.followUps.length > 0 ? (
                                        <>
                                          <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold mb-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatDate(lead.followUps[0].date, dateFormat)}
                                          </div>
                                          {lead.followUps[0].note && (
                                            <p className="text-[11px] text-gray-600 truncate" title={lead.followUps[0].note}>
                                              {lead.followUps[0].note}
                                            </p>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">No follow-up set</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-right relative">
                                    <button 
                                      onClick={() => handleStartInlineEdit(lead)}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Inline Edit"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)}
                                      className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    
                                    {openMenuId === lead.id && (
                                      <div className="absolute right-6 top-12 w-32 glass-panel border border-white/60 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                                        <button 
                                          onClick={() => handleOpenModal(lead.id)}
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                                        >
                                          <Edit className="w-4 h-4" /> Full Edit
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteLead(lead.id)}
                                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50/50 flex items-center gap-2"
                                        >
                                          <Trash2 className="w-4 h-4" /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                            {expandedRowId === lead.id && (
                              <tr className="bg-white/40">
                                <td colSpan={6} className="px-8 py-6 border-b border-white/20">
                                  <div className="flex flex-col">
                                    <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                      <History className="w-4 h-4 text-blue-600" /> Follow-up History
                                    </h4>
                                    {lead.followUps && lead.followUps.length > 0 ? (
                                      <div className="space-y-4">
                                        {lead.followUps.map((fu: any, idx: number) => (
                                          <div key={idx} className="flex gap-4 relative">
                                            {idx !== lead.followUps.length - 1 && (
                                              <div className="absolute left-1.5 top-5 bottom-[-20px] w-0.5 bg-blue-200"></div>
                                            )}
                                            <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 relative z-10 shrink-0"></div>
                                            <div className="bg-white/60 border border-white/60 rounded-xl p-3 flex-1 shadow-sm">
                                              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 mb-1">
                                                <Clock className="w-3.5 h-3.5" /> {formatDate(fu.date, dateFormat)}
                                              </div>
                                              <p className="text-sm text-gray-700">{fu.note}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 italic">No follow-up history available for this lead.</p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-xl font-bold text-gray-800">
                {editingLeadId ? 'Edit Lead' : 'Add New Lead'}
              </h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLead} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Company Name <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="Acme Corp" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Contact Person <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input required type="text" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="John Doe" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="john@example.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="+1 234-567-8900" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Source</label>
                  <input type="text" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="e.g. Website, Referral" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Expected Income</label>
                  <input type="number" value={formData.expectedIncome} onChange={e => setFormData({...formData, expectedIncome: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="10000" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="Lead">Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Client Won">Client Won</option>
                    <option value="Client Lost">Client Lost</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Follow-up Date</label>
                  <input type="date" value={formData.followUpDate} onChange={e => setFormData({...formData, followUpDate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="Hot Lead">Hot Lead</option>
                    <option value="Warm Lead">Warm Lead</option>
                    <option value="Cold Lead">Cold Lead</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Follow-up Note</label>
                  <input type="text" value={formData.followUpNote} onChange={e => setFormData({...formData, followUpNote: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" placeholder="e.g. Discuss pricing structure..." />
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setFormData({...formData, isHot: !formData.isHot})} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border ${formData.isHot ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                >
                  <Flame className={`w-4 h-4 ${formData.isHot ? 'text-orange-500 fill-orange-500' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium">{formData.isHot ? 'Hot Lead' : 'Mark as Hot Lead'}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/40 mt-6">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white/50 rounded-xl transition-all border border-transparent hover:border-gray-200">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md">
                  {editingLeadId ? 'Save Changes' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" /> Advanced Filters
              </h2>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Categories */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1">Category</h3>
                  <div className="space-y-2">
                    {['Hot Lead', 'Warm Lead', 'Cold Lead'].map(cat => (
                      <label key={cat} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={filters.category.includes(cat)}
                          onChange={(e) => {
                            if (e.target.checked) setFilters({...filters, category: [...filters.category, cat]});
                            else setFilters({...filters, category: filters.category.filter(c => c !== cat)});
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1">Status</h3>
                  <div className="space-y-2">
                    {['Lead', 'Contacted', 'Proposal Sent', 'On Hold', 'Client Won', 'Client Lost'].map(status => (
                      <label key={status} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={filters.status.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) setFilters({...filters, status: [...filters.status, status]});
                            else setFilters({...filters, status: filters.status.filter(s => s !== status)});
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        {status}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date & Source */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1">Source</h3>
                    <div className="space-y-2">
                      {['Website', 'Referral', 'Cold Call', 'Event'].map(source => (
                        <label key={source} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={filters.source.includes(source)}
                            onChange={(e) => {
                              if (e.target.checked) setFilters({...filters, source: [...filters.source, source]});
                              else setFilters({...filters, source: filters.source.filter(s => s !== source)});
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          {source}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-1">Created Date</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-gray-500">From</label>
                        <input 
                          type="date" 
                          value={filters.dateFrom} 
                          onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                          className="w-full px-2 py-1 bg-white/50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-700" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-semibold text-gray-500">To</label>
                        <input 
                          type="date" 
                          value={filters.dateTo} 
                          onChange={e => setFilters({...filters, dateTo: e.target.value})}
                          className="w-full px-2 py-1 bg-white/50 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-700" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-white/40 bg-white/20">
              <button 
                onClick={() => setFilters({ status: [], category: [], source: [], dateFrom: '', dateTo: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                Clear All
              </button>
              <button 
                onClick={() => setIsFilterModalOpen(false)} 
                className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

