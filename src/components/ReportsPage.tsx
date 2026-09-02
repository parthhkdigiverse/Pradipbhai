import { useState, useMemo } from 'react';
import { Search, LineChart, Briefcase, CheckCircle, Clock, FileText, Download, FilterX } from 'lucide-react';
import { useData } from '../context/DataContext';

export function ReportsPage() {
  const { clients, jobs, staff, products, vendors } = useData();
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'projects' | 'jobs'>('jobs');

  // --- PROJECTS TAB STATE ---
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatus, setProjectStatus] = useState('All');

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
    return projectsList;
  }, [clients]);

  const totalProjects = allProjects.length;
  const completedProjects = allProjects.filter(p => p.status === 'Completed').length;
  const inProgressProjects = allProjects.filter(p => p.status === 'In Progress' || p.status === 'Active').length;
  const planningProjects = allProjects.filter(p => p.status === 'Planning').length;

  const filteredProjects = useMemo(() => {
    return allProjects.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) || 
                          p.clientName.toLowerCase().includes(projectSearch.toLowerCase());
      const matchStatus = projectStatus === 'All' || p.status === projectStatus;
      return matchSearch && matchStatus;
    });
  }, [allProjects, projectSearch, projectStatus]);

  // --- JOBS TAB STATE ---
  const [jobSearch, setJobSearch] = useState('');
  const [jobFilterStatus, setJobFilterStatus] = useState('All');
  const [jobFilterClient, setJobFilterClient] = useState('All');
  const [jobFilterStaff, setJobFilterStaff] = useState('All');
  const [jobFilterProduct, setJobFilterProduct] = useState('All');
  const [jobFilterBilling, setJobFilterBilling] = useState('All');
  const [jobFilterType, setJobFilterType] = useState('All');

  const resetJobFilters = () => {
    setJobSearch('');
    setJobFilterStatus('All');
    setJobFilterClient('All');
    setJobFilterStaff('All');
    setJobFilterProduct('All');
    setJobFilterBilling('All');
    setJobFilterType('All');
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase());
      const matchStatus = jobFilterStatus === 'All' || job.status === jobFilterStatus;
      const matchClient = jobFilterClient === 'All' || job.clientId === jobFilterClient;
      const matchStaff = jobFilterStaff === 'All' || job.teamId === jobFilterStaff;
      const matchProduct = jobFilterProduct === 'All' || job.productId === jobFilterProduct;
      const matchBilling = jobFilterBilling === 'All' || job.paymentStatus === jobFilterBilling;
      const matchType = jobFilterType === 'All' || job.type === jobFilterType;
      
      return matchSearch && matchStatus && matchClient && matchStaff && matchProduct && matchBilling && matchType;
    });
  }, [jobs, jobSearch, jobFilterStatus, jobFilterClient, jobFilterStaff, jobFilterProduct, jobFilterBilling, jobFilterType]);

  const totalFilteredJobAmount = useMemo(() => {
    return filteredJobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
  }, [filteredJobs]);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.company || 'Unknown';
  const getPrinterName = (id: string) => vendors.find(v => v.id === id)?.name || '—';

  return (
    <div className="w-full relative flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Reports</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-white/40 backdrop-blur-md p-1 rounded-xl border border-white/60 shadow-sm">
          <button 
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'projects' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Project Reports
          </button>
          <button 
            onClick={() => setActiveTab('jobs')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'jobs' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Job Reports
          </button>
        </div>
      </div>

      {activeTab === 'projects' && (
        <div className="flex flex-col flex-1 animate-in fade-in zoom-in-95 duration-200">
          {/* Top Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 flex-shrink-0">
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
          <div className="p-4 flex items-center justify-between gap-3 mb-4 bg-white/40 border border-white/60 rounded-[1.5rem] backdrop-blur-md shadow-sm flex-shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by project or client name..." 
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
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
      )}

      {activeTab === 'jobs' && (
        <div className="flex flex-col flex-1 animate-in fade-in zoom-in-95 duration-200">
          {/* Advanced Filters Panel */}
          <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm p-4 mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <FilterX className="w-4 h-4 text-gray-500" />
                Filter Reports
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mr-2">Total Amount:</span>
                  <span className="text-xl font-bold text-gray-800">₹{totalFilteredJobAmount.toLocaleString()}</span>
                </div>
                <button 
                  onClick={resetJobFilters}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
                <select value={jobFilterStatus} onChange={(e) => setJobFilterStatus(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                  <option value="All">All</option>
                  <option value="Pending">Pending</option>
                  <option value="Progress">Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancel">Cancel</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Clients</label>
                <select value={jobFilterClient} onChange={(e) => setJobFilterClient(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                  <option value="All">All Clients</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Staff</label>
                <select value={jobFilterStaff} onChange={(e) => setJobFilterStaff(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                  <option value="All">All Staffs</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Product</label>
                <select value={jobFilterProduct} onChange={(e) => setJobFilterProduct(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                  <option value="All">All Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Billing</label>
                <select value={jobFilterBilling} onChange={(e) => setJobFilterBilling(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                  <option value="All">All</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Job Type</label>
                <select value={jobFilterType} onChange={(e) => setJobFilterType(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                  <option value="All">All Types</option>
                  <option value="Designing">Designing</option>
                  <option value="Printing">Printing</option>
                  <option value="Des+Print">Des+Print</option>
                </select>
              </div>
            </div>
            
            <div className="mt-3 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by job title..." 
                value={jobSearch}
                onChange={(e) => setJobSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/30">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Job Reports
              </h2>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-blue-600/10 text-blue-700 hover:bg-blue-600/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Export to Excel
                </button>
                <button className="px-3 py-1.5 bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />
                  Export to PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 p-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                    <th className="py-4 px-4 w-12">#</th>
                    <th className="py-4 px-4 min-w-[200px]">Job Title</th>
                    <th className="py-4 px-4">Party</th>
                    <th className="py-4 px-4">Printer Name</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center">Due Date</th>
                    <th className="py-4 px-4 text-center">Paid / Total</th>
                    <th className="py-4 px-4 text-center">Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.length > 0 ? (
                    filteredJobs.map((job, index) => (
                      <tr key={job.id} className="hover:bg-white/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-gray-400">{index + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-800 text-sm">{job.title}</span>
                          <div className="text-[10px] text-gray-500 mt-0.5">{job.type}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-700">{getClientName(job.clientId)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-700">{getPrinterName(job.printerId)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-gray-600 font-medium">{job.status}</span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600">
                          {job.dueDate || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-gray-700">
                            {job.paidAmount > 0 ? `₹${job.paidAmount} / ` : '- / '}
                            ₹{job.totalAmount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            job.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          }`}>
                            {job.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <Search className="w-8 h-8 text-gray-300 mb-3" />
                          <p>No jobs found matching criteria.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
