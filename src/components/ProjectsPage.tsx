import { useState, useMemo } from 'react';
import { Search, Filter, Briefcase, IndianRupee, Edit, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/dateFormatter';

export function ProjectsPage() {
  const { dateFormat } = useSettings();
  const { clients, updateProject } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    category: [] as string[],
  });

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
      if (filters.status.length > 0 && !filters.status.includes(proj.status)) return false;
      if (filters.category.length > 0 && !filters.category.includes(proj.category)) return false;

      return true;
    });
  }, [allProjects, searchTerm, filters]);

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
      case "In Progress": colorClass = "bg-blue-100 text-blue-700 border-blue-200"; break;
      case "Completed": colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; break;
      case "Planning": colorClass = "bg-amber-100 text-amber-700 border-amber-200"; break;
      case "On Hold": colorClass = "bg-red-100 text-red-700 border-red-200"; break;
      default: colorClass = "bg-gray-100 text-gray-700 border-gray-200"; break;
    }

    return (
      <select 
        value={status} 
        onChange={(e) => {
          const newStatus = e.target.value;
          updateProject(proj.clientId, proj.originalProjectIndex, { ...proj, status: newStatus });
        }}
        onClick={(e) => e.stopPropagation()}
        className={`${colorClass} px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wide focus:outline-none cursor-pointer appearance-none pr-4 relative`}
        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .2rem top 50%', backgroundSize: '.65rem auto' }}
      >
        <option value="Planning">Planning</option>
        <option value="In Progress">In Progress</option>
        <option value="Active">Active</option>
        <option value="On Hold">On Hold</option>
        <option value="Completed">Completed</option>
      </select>
    );
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-600" />
            Projects
          </h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Manage and track all ongoing general projects.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/60 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 w-64 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsFilterModalOpen(true)}
            className={`px-4 py-2 border border-white/60 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm ${
              Object.values(filters).some(arr => arr.length > 0)
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.values(filters).reduce((acc, arr) => acc + arr.length, 0) > 0 && (
              <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                {Object.values(filters).reduce((acc, arr) => acc + arr.length, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((proj, idx) => (
            <div key={idx} className="glass-panel border border-white/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col relative group">
              <div className="flex items-start justify-between mb-4">
                <div className="pr-8">
                  <h3 className="text-lg font-bold text-gray-800 line-clamp-1" title={proj.name}>{proj.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getProjectStatusBadge(proj)}
                    <span className="text-xs font-semibold text-gray-500 bg-gray-100/50 px-2 py-0.5 rounded">{proj.category}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleOpenProjectModal(proj)}
                  className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Edit Project"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 bg-white/40 rounded-xl p-4 mb-4 border border-white/50">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client Details</h4>
                <p className="font-semibold text-gray-800 text-sm mb-1">{proj.clientName}</p>
                <p className="text-gray-600 text-xs mb-0.5">{proj.clientContact}</p>
                <div className="flex flex-col gap-0.5 text-[11px] text-gray-500 mt-2">
                  <span>{proj.clientEmail}</span>
                  <span>{proj.clientPhone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto border-t border-gray-100/50 pt-4">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Budget</span>
                  <span className="text-sm font-bold text-emerald-700 flex items-center">
                    <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                    {parseFloat(proj.budget || '0').toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Deadline</span>
                  <span className="text-sm font-bold text-gray-700">{formatDate(proj.deadline, dateFormat)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white/30 rounded-2xl border border-white/50 border-dashed">
            <Briefcase className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">No projects found</h3>
            <p className="text-gray-500 max-w-sm mx-auto text-sm">
              There are no general projects matching your current filters. Adjust your search or check the Social Media tab.
            </p>
          </div>
        )}
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
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Project Name *</label>
                  <input required type="text" value={projectFormData.name} onChange={e => setProjectFormData({...projectFormData, name: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Category</label>
                  <select value={projectFormData.category} onChange={e => setProjectFormData({...projectFormData, category: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="Designing">Designing</option>
                    <option value="Printing">Printing</option>
                    <option value="Des+Print">Des+Print</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Status</label>
                  <select value={projectFormData.status} onChange={e => setProjectFormData({...projectFormData, status: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Budget (₹)</label>
                  <input type="number" value={projectFormData.budget} onChange={e => setProjectFormData({...projectFormData, budget: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Deadline</label>
                <input type="date" value={projectFormData.deadline} onChange={e => setProjectFormData({...projectFormData, deadline: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-white/40 mt-6">
                <button type="button" onClick={handleCloseProjectModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white/50 rounded-xl transition-all border border-transparent hover:border-gray-200">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-white/40 bg-white/30">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                Filters
              </h2>
              <button onClick={() => setIsFilterModalOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Category Filter */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Category</h3>
                <div className="space-y-2">
                  {['Designing', 'Printing', 'Des+Print'].map(cat => (
                    <label key={cat} className="flex items-center gap-3 p-2 hover:bg-white/40 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-white/60">
                      <input 
                        type="checkbox"
                        checked={filters.category.includes(cat)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({...filters, category: [...filters.category, cat]});
                          } else {
                            setFilters({...filters, category: filters.category.filter(c => c !== cat)});
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Status</h3>
                <div className="space-y-2">
                  {['Planning', 'In Progress', 'Active', 'On Hold', 'Completed'].map(status => (
                    <label key={status} className="flex items-center gap-3 p-2 hover:bg-white/40 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-white/60">
                      <input 
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({...filters, status: [...filters.status, status]});
                          } else {
                            setFilters({...filters, status: filters.status.filter(s => s !== status)});
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/40 bg-white/30 flex items-center justify-between">
              <button 
                onClick={() => setFilters({ status: [], category: [] })}
                className="text-sm font-semibold text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                Clear All
              </button>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold rounded-xl transition-all shadow-md"
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
