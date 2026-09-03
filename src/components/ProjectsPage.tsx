import { useState, useMemo } from 'react';
import { Search, Briefcase, IndianRupee, Edit, X, FilterX } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateFormatter';

export function ProjectsPage() {
  const { dateFormat } = useSettings();
  const { clients, updateProject } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
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
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    category: 'Designing',
    status: 'Planning',
    budget: '',
    deadline: ''
  });

  // Extract non-social media projects
  const allProjects = useMemo(() => {
    const projects: any[] = [];
    clients.forEach(client => {
      if (client.projects && client.projects.length > 0) {
        client.projects.forEach((proj: any, idx: number) => {
          if (proj.category !== 'Social Media') {
            projects.push({
              ...proj,
              clientId: client.id,
              clientName: client.company,
              clientContact: client.contact,
              clientEmail: client.email,
              clientPhone: client.phone,
              originalProjectIndex: idx
            });
          }
        });
      }
    });
    return projects;
  }, [clients]);

  // Apply filters
  const filteredProjects = useMemo(() => {
    return allProjects.filter(proj => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        proj.name.toLowerCase().includes(searchLower) ||
        proj.clientName.toLowerCase().includes(searchLower) ||
        proj.clientContact.toLowerCase().includes(searchLower);

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

  const handleCloseProjectModal = () => {
    setIsProjectModalOpen(false);
    setEditingClientIndex(null);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClientIndex) {
      updateProject(editingClientIndex.clientId, editingClientIndex.projectIndex, projectFormData);
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
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm p-4 mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Projects
          </h3>
          <div className="flex items-center gap-4">
            <button 
              onClick={resetFilters}
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-lg text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
              <option value="All">All Statuses</option>
              <option value="Planning">Planning</option>
              <option value="In Progress">In Progress</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
              <option value="All">All Categories</option>
              <option value="Designing">Designing</option>
              <option value="Printing">Printing</option>
              <option value="Des+Print">Des+Print</option>
            </select>
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

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6">#</th>
                <th className="py-4 px-6">Project Name</th>
                <th className="py-4 px-6">Client Name</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Budget</th>
                <th className="py-4 px-6">Deadline</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((proj, idx) => (
                  <tr key={idx} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="py-4 px-6 text-sm font-bold text-gray-800">{proj.name}</td>
                    <td className="py-4 px-6 text-gray-500 font-medium">
                      {proj.clientName}
                      <span className="block text-[10px] text-gray-400">{proj.clientContact}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100/50 px-2 py-0.5 rounded">{proj.category}</span>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-emerald-700 flex items-center">
                      <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                      {parseFloat(proj.budget || '0').toLocaleString()}
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
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
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
              <h2 className="text-lg font-bold text-gray-800">Edit Project</h2>
              <button onClick={handleCloseProjectModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProject} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Project Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={projectFormData.name} onChange={e => setProjectFormData({...projectFormData, name: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Category</label>
                  <select value={projectFormData.category} onChange={e => setProjectFormData({...projectFormData, category: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
                    <option value="Designing">Designing</option>
                    <option value="Printing">Printing</option>
                    <option value="Des+Print">Des+Print</option>
                  </select>
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
