import { useState, useMemo, useEffect } from 'react';
import { Search, Briefcase, IndianRupee, Edit, Trash2, X, Plus, TrendingUp } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateFormatter';
import { SearchableSelect } from './SearchableSelect';
import { QuickAddClientModal } from './QuickAddClientModal';
import { Pagination } from './Pagination';

export function ProjectsPage() {
  const { dateFormat } = useSettings();
  const { clients, jobs, products, addProject, updateProject, deleteProject, currentUserRole, hasPermission } = useData();
  const isEmployee = currentUserRole !== 'Admin' && currentUserRole !== 'Manager';
  const canCreateEditProjects = hasPermission(currentUserRole, 'Create/Edit Projects');
  const canDeleteProjects = hasPermission(currentUserRole, 'Delete Projects') || currentUserRole === 'Admin';
  const [searchTerm, setSearchTerm] = useState('');
  
  // Quick Add Client Modal State
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');

  // Filter States
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCategory, filterDateFrom, filterDateTo]);

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
    productId: '',
    category: 'Designing',
    status: 'Planning',
    budget: '',
    deadline: ''
  });

  // Extract all projects with live job financials
  const allProjects = useMemo(() => {
    const projects: any[] = [];
    clients.forEach(client => {
      if (client.projects && client.projects.length > 0) {
        client.projects.forEach((proj: any, idx: number) => {
          // Aggregate financials from all linked jobs
          const linkedJobs = jobs.filter(
            (j: any) => j.clientId === client.id && (j.projectId === proj.name || j.projectId === proj.id || j.projectId === proj.title)
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

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  const handleOpenProjectModal = (project: any) => {
    setProjectFormData({
      name: project.name,
      productId: project.productId || '',
      category: project.category,
      status: project.status,
      budget: isEmployee ? '' : (project.budget || ''),
      deadline: project.deadline
    });
    setEditingClientIndex({ clientId: project.clientId, projectIndex: project.originalProjectIndex });
    setIsProjectModalOpen(true);
  };

  const handleCreateNewProject = () => {
    setProjectFormData({
      name: '',
      productId: '',
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
    const dataToSave = { ...projectFormData };
    if (isEmployee) {
      if (editingClientIndex) {
        const client = clients.find(c => c.id === editingClientIndex.clientId);
        const origProj = client?.projects?.[editingClientIndex.projectIndex];
        dataToSave.budget = origProj?.budget || '0';
      } else {
        dataToSave.budget = '0';
      }
    }
    if (editingClientIndex) {
      updateProject(editingClientIndex.clientId, editingClientIndex.projectIndex, dataToSave);
    } else if (selectedClientId) {
      addProject(selectedClientId, dataToSave);
    }
    handleCloseProjectModal();
  };

  const handleDeleteProject = async (proj: any) => {
    const jobWarning = proj.jobCount > 0 
      ? `\n\nNotice: There are ${proj.jobCount} job(s) currently linked to this project.`
      : '';
    if (window.confirm(`Are you sure you want to delete project "${proj.name || proj.title}"?${jobWarning}`)) {
      await deleteProject(proj.id || proj.name, proj.clientId);
    }
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
          {canCreateEditProjects && (
            <button 
              onClick={handleCreateNewProject}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Project
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel border border-white/60 rounded-2xl shadow-sm mb-6 p-3 sm:p-4 bg-white/40 backdrop-blur-md flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/70 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-400"
          />
        </div>

        <div className="w-full sm:w-44 shrink-0">
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

        <div className="w-full sm:w-44 shrink-0">
          <SearchableSelect
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { value: 'All', label: 'All Categories' },
              { value: 'Designing', label: 'Designing' },
              { value: 'Printing', label: 'Printing' },
              { value: 'Des+Print', label: 'Des+Print' },
              { value: 'Social Media', label: 'Social Media' }
            ]}
          />
        </div>

        <div className="flex items-center gap-2 bg-white/70 border border-white/80 rounded-xl px-3 py-1.5 shrink-0 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Due:</span>
          <input 
            type="date" 
            value={filterDateFrom} 
            onChange={(e) => setFilterDateFrom(e.target.value)} 
            className="bg-transparent focus:outline-none text-xs font-semibold text-gray-800 cursor-pointer" 
            title="Deadline From" 
          />
          <span className="text-gray-400 text-xs font-bold">to</span>
          <input 
            type="date" 
            value={filterDateTo} 
            onChange={(e) => setFilterDateTo(e.target.value)} 
            className="bg-transparent focus:outline-none text-xs font-semibold text-gray-800 cursor-pointer" 
            title="Deadline To" 
          />
        </div>

        {(searchTerm !== '' || filterStatus !== 'All' || filterCategory !== 'All' || filterDateFrom !== '' || filterDateTo !== '') && (
          <button 
            onClick={resetFilters}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
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
                {!isEmployee && <th className="py-4 px-6">Budget / Financials</th>}
                <th className="py-4 px-6">Jobs</th>
                <th className="py-4 px-6">Deadline</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.length > 0 ? (
                paginatedProjects.map((proj, idx) => {
                  const budget = parseFloat(proj.budget || '0');
                  const paidPct = proj.totalBilled > 0 ? Math.min(100, Math.round((proj.totalPaid / proj.totalBilled) * 100)) : 0;
                  return (
                  <tr key={idx} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 text-gray-400 font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-gray-800 block">{proj.name}</span>
                      <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        proj.category === 'Designing' ? 'bg-emerald-100 text-emerald-700' :
                        proj.category === 'Des+Print' ? 'bg-purple-100 text-purple-700' :
                        proj.category === 'Social Media' ? 'bg-pink-100 text-pink-700' :
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
                    {!isEmployee && (
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
                    )}
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
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {canCreateEditProjects && (
                          <button 
                            onClick={() => handleOpenProjectModal(proj)}
                            className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700 transition-colors shadow-2xs cursor-pointer"
                            title="Edit Project"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDeleteProjects && (
                          <button 
                            onClick={() => handleDeleteProject(proj)}
                            className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center hover:bg-rose-100 hover:text-rose-700 transition-colors shadow-2xs cursor-pointer"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!canCreateEditProjects && !canDeleteProjects && (
                          <span className="text-gray-400 font-medium cursor-default" title="Read Only">—</span>
                        )}
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

        <Pagination
          currentPage={currentPage}
          totalItems={filteredProjects.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemsPerPageOptions={[10, 25, 50, 100]}
          itemName="projects"
        />
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Select Client <span className="text-rose-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => { setQuickClientName(''); setIsQuickClientModalOpen(true); }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600" /> Add Client
                    </button>
                  </div>
                  <SearchableSelect
                    value={selectedClientId}
                    onChange={setSelectedClientId}
                    options={clients.map(c => ({ value: c.id, label: c.company || c.name || c.contact || 'Client' }))}
                    placeholder="Select client..."
                    onCreateOption={(query) => {
                      setQuickClientName(query);
                      setIsQuickClientModalOpen(true);
                    }}
                    createOptionLabel="Add Client"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Product (Optional)</label>
                <SearchableSelect
                  value={projectFormData.productId || ''}
                  onChange={val => {
                    const selectedProd = products.find(p => p.id === val);
                    const autoBudget = (!isEmployee && selectedProd && selectedProd.price !== undefined && selectedProd.price !== null && selectedProd.price !== '')
                      ? String(selectedProd.price)
                      : (isEmployee ? '' : projectFormData.budget);
                    setProjectFormData(prev => ({
                      ...prev,
                      productId: val,
                      budget: autoBudget
                    }));
                  }}
                  options={[
                    { value: '', label: isEmployee ? 'Select product...' : 'Select product to auto-fetch price...' },
                    ...products.map(p => ({
                      value: p.id,
                      label: (!isEmployee && p.price !== undefined && p.price !== null && p.price !== '')
                        ? `${p.name} (₹${Number(p.price).toLocaleString('en-IN')})`
                        : p.name
                    }))
                  ]}
                  placeholder="Select product..."
                />
              </div>
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
                      { value: 'Des+Print', label: 'Des+Print' },
                      { value: 'Social Media', label: 'Social Media' }
                    ]}
                  />
                </div>
              </div>
              <div className={`grid ${!isEmployee ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
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
                {!isEmployee && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Budget (₹)</label>
                    <input type="number" value={projectFormData.budget} onChange={e => setProjectFormData({...projectFormData, budget: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Deadline</label>
                <input type="date" value={projectFormData.deadline} onChange={e => setProjectFormData({...projectFormData, deadline: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
              </div>
              
              <div className="flex items-center justify-between pt-5 border-t border-white/40 mt-6">
                <div>
                  {editingClientIndex && canDeleteProjects && (
                    <button
                      type="button"
                      onClick={() => {
                        const projToDelete = allProjects.find(
                          p => p.clientId === editingClientIndex.clientId && p.originalProjectIndex === editingClientIndex.projectIndex
                        );
                        if (projToDelete) {
                          handleDeleteProject(projToDelete);
                          handleCloseProjectModal();
                        }
                      }}
                      className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-1.5 border border-rose-200 cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Project
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleCloseProjectModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white/50 rounded-xl transition-all border border-transparent hover:border-gray-200 cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary rounded-xl transition-all shadow-md cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Client Modal */}
      <QuickAddClientModal
        isOpen={isQuickClientModalOpen}
        onClose={() => setIsQuickClientModalOpen(false)}
        initialName={quickClientName}
        onClientCreated={(newClient) => {
          if (newClient?.id) {
            setSelectedClientId(newClient.id);
          }
          setIsQuickClientModalOpen(false);
        }}
      />
    </div>
  );
}
