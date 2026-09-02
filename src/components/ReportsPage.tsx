import { useState, useMemo } from 'react';
import { Search, LineChart, Briefcase, CheckCircle, Clock } from 'lucide-react';
import { useData } from '../context/DataContext';

export function ReportsPage() {
  const { clients } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Flatten all projects from all clients into a single array
  const allProjects = useMemo(() => {
    const projectsList: any[] = [];
    clients.forEach(client => {
      if (client.projects && client.projects.length > 0) {
        client.projects.forEach((project: any) => {
          projectsList.push({
            ...project,
            clientId: client.id,
            clientName: client.company,
          });
        });
      }
    });
    // Sort by deadline ideally, or just leave as is
    return projectsList;
  }, [clients]);

  // Metrics calculations
  const totalProjects = allProjects.length;
  const completedProjects = allProjects.filter(p => p.status === 'Completed').length;
  const inProgressProjects = allProjects.filter(p => p.status === 'In Progress' || p.status === 'Active').length;
  const planningProjects = allProjects.filter(p => p.status === 'Planning').length;

  const filteredProjects = useMemo(() => {
    return allProjects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [allProjects, searchTerm, filterStatus]);

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Project Reports</h1>
          <div className="text-sm text-gray-500 bg-white/40 px-3 py-1.5 rounded-full border border-white/60 backdrop-blur-md inline-block">
            Home &gt; Main &gt; <span className="text-gray-800 font-medium">Reports</span>
          </div>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-panel p-5 rounded-[1.5rem] border border-white/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Total Projects</p>
            <h3 className="text-3xl font-bold text-gray-800">{totalProjects}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
            <Briefcase className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <div className="glass-panel p-5 rounded-[1.5rem] border border-white/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-500 mb-1">In Progress & Active</p>
            <h3 className="text-3xl font-bold text-blue-600">{inProgressProjects}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="glass-panel p-5 rounded-[1.5rem] border border-white/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-500 mb-1">Completed</p>
            <h3 className="text-3xl font-bold text-emerald-600">{completedProjects}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
        <div className="glass-panel p-5 rounded-[1.5rem] border border-white/60 shadow-sm flex items-center justify-between opacity-80">
          <div>
            <p className="text-sm font-semibold text-amber-500 mb-1">Planning</p>
            <h3 className="text-3xl font-bold text-amber-600">{planningProjects}</h3>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 flex items-center justify-between gap-3 mb-4 bg-white/40 border border-white/60 rounded-[1.5rem] backdrop-blur-md shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by project or client name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none text-gray-700 w-32"
          >
            <option value="All">All Status</option>
            <option value="In Progress">In Progress</option>
            <option value="Active">Active</option>
            <option value="Planning">Planning</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6 w-12">#</th>
                <th className="py-4 px-6">Client Name</th>
                <th className="py-4 px-6">Project Name</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Deadline</th>
                <th className="py-4 px-6 text-right">Budget (₹)</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project, index) => (
                  <tr key={`${project.clientId}-${index}`} className="hover:bg-white/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-gray-400">{index + 1}</td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-gray-800 text-sm">{project.clientName}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-blue-600 hover:underline cursor-pointer">{project.name}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {project.category}
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {project.deadline}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-gray-800">
                      {parseInt(project.budget || '0').toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                        (project.status === 'In Progress' || project.status === 'Active') ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <LineChart className="w-12 h-12 text-gray-300 mb-4" />
                      <p>No projects found matching criteria.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
