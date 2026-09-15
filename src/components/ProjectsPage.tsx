import { useState, useMemo } from 'react';
import { Search, Briefcase, IndianRupee, Edit, X, FilterX, ChevronDown, Plus, TrendingUp } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateFormatter';
import { SearchableSelect } from './SearchableSelect';

export function ProjectsPage() {
  const { dateFormat } = useSettings();
  const { clients, jobs, addProject, updateProject } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterCategory('All');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingClientIndex, setEditingClientIndex] = useState<{clientId: string, projectIndex: number} | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    category: 'Designing',
    status: 'Planning',
    budget: '',
    deadline: ''
  });

  // Extract non-social media projects with live job financials
  const allProjects = useMemo(() => {
    const projects: any[] = [];
    clients.forEach(client => {
      if (client.projects && client.projects.length > 0) {
        client.projects.forEach((proj: any, idx: number) => {
          if (proj.category !== 'Social Media') {
            // Aggregate financials from all linked jobs
            const linkedJobs = jobs.filter(
              (j: any) => j.clientId === client.id && j.projectId === proj.name
            );
            const totalBilled = linkedJobs.reduce((sum: number, j: any) => sum + (j.totalAmount || 0), 0);
            const totalPaid   = linkedJobs.reduce((sum: number, j: any) => sum + (j.paidAmount  || 0), 0);
            const jobCount    = linkedJobs.length;
            const doneCount   = linkedJobs.filter((j: any) => j.status === 'Done').length;
            projects.push({
              ...proj,
              clientId: client.id,
              clientName: client.company,
              clientContact: client.contact,
              clientEmail: client.email,
              clientPhone: client.phone,
              originalProjectIndex: idx,
              // live financials
              totalBilled,
              totalPaid,
              balance: totalBilled - totalPaid,
              jobCount,
              doneCount
            });
          }
        });
      }
    });
    return projects;
  }, [clients, jobs]);

  // Apply filters
  const filteredProjects = useMemo(() => {
    return allProjects.filter(proj => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        proj.name.toLowerCase().includes(searchLower) ||
        proj.clientName.toLowerCase().includes(searchLower) ||
        proj.clientContact.toLowerCase().includes(searchLower) ||
        (proj.category && proj.category.toLowerCase().includes(searchLower)) ||
        (proj.status && proj.status.toLowerCase().includes(searchLower)) ||
        (proj.deadline && proj.deadline.includes(searchLower));

      if (!matchesSearch) return false;
      if (filterStatus !== 'All' && proj.status !== filterStatus) return false;
      if (filterCategory !== 'All' && proj.category !== filterCategory) return false;
      if (filterDateFrom && proj.deadline && new Date(proj.deadline) < new Date(filterDateFrom)) return false;
      if (filterDateTo && proj.deadline && new Date(proj.deadline) > new Date(filterDateTo)) return false;

      return true;
    });
  }, [allProjects, searchTerm, filterStatus, filterCategory, filterDateFrom, filterDateTo]);

  const handleOpenProjectModal = (project: any) => {
    setProjectFormData({
      name: project.name,
      category: project.category,
      status: project.status,
      budget: project.budget,
      deadline: project.deadline
    });
    setEditingClientIndex({ clientId: project.clientId, projectIndex: project.originalProjectIndex });
    setIsProjectModalOpen(true);
  };

  const handleCreateNewProject = () => {
    setProjectFormData({
      name: '',
      category: 'Designing',
      status: 'Planning',
      budget: '',
      deadline: ''
    });
    setSelectedClientId(clients[0]?.id || '');
    setEditingClientIndex(null);
    setIsProjectModalOpen(true);
  };

  const handleCloseProjectModal = () => {
    setIsProjectModalOpen(false);
    setEditingClientIndex(null);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClientIndex) {
      updateProject(editingClientIndex.clientId, editingClientIndex.projectIndex, projectFormData);
    } else if (selectedClientId) {
      addProject(selectedClientId, projectFormData);
    }
    handleCloseProjectModal();
  };

  const getProjectStatusBadge = (proj: any) => {
    const status = proj.status;
    let colorClass = "";
    switch (status) {
      case "Active": 
      case "In Progress": colorClass = "bg-primary/10 text-primary border-primary"; break;
      case "Completed": colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; break;
      case "Planning": colorClass = "bg-amber-100 text-amber-700 border-amber-200"; break;
      case "On Hold": colorClass = "bg-red-100 text-red-700 border-red-200"; break;
      default: colorClass = "bg-gray-100 text-gray-700 border-gray-200"; break;
    }

    return (
      <span className={`${colorClass} px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide inline-block text-center shadow-sm`}>
        {status}
      </span>
    );
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Projects
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Manage and track all ongoing general projects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCreateNewProject}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Project
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md overflow-hidden">
        <button onClick={() => setShowFilters(f => !f)} className="w-full flex items-center justify-between p-4 hover:bg-white/20 transition-colors cursor-pointer select-none">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Projects
          </h3>
          <div className="flex items-center gap-4">
            {(searchTerm !== '' || filterStatus !== 'All' || filterCategory !== 'All' || filterDateFrom !== '' || filterDateTo !== '') && (
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
                { value: 'All', label: 'All Statuses' },
                { value: 'Planning', label: 'Planning' },
                { value: 'In Progress', label: 'In Progress' },
                { value: 'Active', label: 'Active' },
                { value: 'On Hold', label: 'On Hold' },
                { value: 'Completed', label: 'Completed' }
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
            <SearchableSelect
              value={filterCategory}
              onChange={setFilterCategory}
              options={[
                { value: 'All', label: 'All Categories' },
                { value: 'Designing', label: 'Designing' },
                { value: 'Printing', label: 'Printing' },
                { value: 'Des+Print', label: 'Des+Print' }
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Deadline From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Deadline To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
          </div>
        </div>
        
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search projects..." 
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
                <th className="py-4 px-6">#</th>
                <th className="py-4 px-6">Project Name</th>
                <th className="py-4 px-6">Client Name</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Budget / Financials</th>
                <th className="py-4 px-6">Jobs</th>
                <th className="py-4 px-6">Deadline</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((proj, idx) => {
                  const budget = parseFloat(proj.budget || '0');
                  const paidPct = proj.totalBilled > 0 ? Math.min(100, Math.round((proj.totalPaid / proj.totalBilled) * 100)) : 0;
                  return (
                  <tr key={idx} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-gray-800 block">{proj.name}</span>
                      <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        proj.category === 'Designing' ? 'bg-emerald-100 text-emerald-700' :
                        proj.category === 'Des+Print' ? 'bg-purple-100 text-purple-700' :
                        'bg-primary/10 text-primary'
                      }`}>{proj.category}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 font-medium">
                      {proj.clientName}
                      <span className="block text-[10px] text-gray-400">{proj.clientContact}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100/50 px-2 py-0.5 rounded">{proj.category}</span>
                    </td>
                    {/* Budget & Live Financials */}
                    <td className="py-4 px-6 min-w-[180px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-semibold uppercase tracking-wide">Budget</span>
                          <span className="font-bold text-gray-600 flex items-center"><IndianRupee className="w-2.5 h-2.5" />{budget.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-semibold uppercase tracking-wide">Billed</span>
                          <span className="font-bold text-primary flex items-center"><IndianRupee className="w-2.5 h-2.5" />{proj.totalBilled.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-400 font-semibold uppercase tracking-wide">Paid</span>
                          <span className="font-bold text-emerald-600 flex items-center"><IndianRupee className="w-2.5 h-2.5" />{proj.totalPaid.toLocaleString()}</span>
                        </div>
                        {proj.balance > 0 && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-gray-400 font-semibold uppercase tracking-wide">Balance</span>
                            <span className="font-bold text-rose-500 flex items-center"><IndianRupee className="w-2.5 h-2.5" />{proj.balance.toLocaleString()}</span>
                          </div>
                        )}
                        {proj.totalBilled > 0 && (
                          <div className="mt-1.5">
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  paidPct === 100 ? 'bg-emerald-500' : paidPct >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                                }`}
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-gray-400 mt-0.5 text-right">{paidPct}% paid</p>
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Job progress */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs font-bold text-gray-700">{proj.doneCount}/{proj.jobCount}</span>
                        <span className="text-[10px] text-gray-400">done</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-gray-700">
                      {formatDate(proj.deadline, dateFormat)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {getProjectStatusBadge(proj)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleOpenProjectModal(proj)}
                          className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit Project"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Briefcase className="w-12 h-12 text-gray-300 mb-4" />
                      <p>No projects found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseProjectModal}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-lg font-bold text-gray-800">
                {editingClientIndex ? 'Edit Project' : 'Add New Project'}
              </h2>
              <button onClick={handleCloseProjectModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProject} className="p-5 space-y-4">
              {!editingClientIndex && (
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Select Client <span className="text-rose-500">*</span></label>
                  <SearchableSelect
                    value={selectedClientId}
                    onChange={setSelectedClientId}
                    options={clients.map(c => ({ value: c.id, label: c.company }))}
                    placeholder="Select client..."
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Project Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={projectFormData.name} onChange={e => setProjectFormData({...projectFormData, name: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Category</label>
                  <SearchableSelect
                    value={projectFormData.category}
                    onChange={val => setProjectFormData({...projectFormData, category: val})}
                    options={[
                      { value: 'Designing', label: 'Designing' },
                      { value: 'Printing', label: 'Printing' },
                      { value: 'Des+Print', label: 'Des+Print' }
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Status</label>
                  <select disabled title="Status is calculated automatically from Jobs" value={projectFormData.status} onChange={e => setProjectFormData({...projectFormData, status: e.target.value})} className="w-full px-3 py-2 bg-gray-100/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-400 cursor-not-allowed">
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Budget (₹)</label>
                  <input type="number" value={projectFormData.budget} onChange={e => setProjectFormData({...projectFormData, budget: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Deadline</label>
                <input type="date" value={projectFormData.deadline} onChange={e => setProjectFormData({...projectFormData, deadline: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/40 mt-6">
                <button type="button" onClick={handleCloseProjectModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white/50 rounded-xl transition-all border border-transparent hover:border-gray-200">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary rounded-xl transition-all shadow-md">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
