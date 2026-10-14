import { useState, useMemo } from 'react';
import { Search, LineChart, Briefcase, CheckCircle, Clock, FileText, Download, FilterX, ChevronDown, Calendar, CalendarRange } from 'lucide-react';
import { useData, isDesigningJob, isPrintingJob } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { formatDate } from '../utils/dateFormatter';
import { SearchableSelect } from './SearchableSelect';
import { InvoicePreviewModal } from './InvoicePreviewModal';

export function ReportsPage({ setCurrentPage: _setCurrentPage }: { setCurrentPage?: (page: string) => void }) {
  const { clients, jobs, staff, products, vendors, invoices, currentUserRole, hasPermission } = useData();
  const { dateFormat } = useSettings();
  const canExport = hasPermission(currentUserRole, 'Export Reports');
  const [selectedPreviewInvoice, setSelectedPreviewInvoice] = useState<any | null>(null);
  
  // Date calculation helpers
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const lastMonthStr = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const handleJobClick = (jobId: string) => {
    const matchedInvoice = invoices.find((inv: any) => inv.jobIds && inv.jobIds.includes(jobId));
    if (matchedInvoice) {
      setSelectedPreviewInvoice(matchedInvoice);
    } else {
      const targetJob = jobs.find((j: any) => j.id === jobId);
      if (targetJob) {
        const subtotal = targetJob.totalAmount || 0;
        const tax = (subtotal * 18) / 100;
        const total = subtotal + tax;
        setSelectedPreviewInvoice({
          id: 'preview-' + targetJob.id,
          invoiceNumber: `TAX-${targetJob.id.toUpperCase()}`,
          clientId: targetJob.clientId,
          jobIds: [targetJob.id],
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: targetJob.dueDate || '',
          subtotal,
          tax,
          total,
          status: targetJob.paymentStatus === 'Paid' ? 'Paid' : 'Sent',
          invoiceType: 'Tax',
          taxRate: '18'
        });
      }
    }
  };
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'projects' | 'jobs'>('jobs');

  // --- PROJECTS TAB STATE ---
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatus, setProjectStatus] = useState('All');
  const [projectDateFilterType, setProjectDateFilterType] = useState<'all' | 'this_month' | 'last_month' | 'month' | 'range'>('all');
  const [projectFilterMonth, setProjectFilterMonth] = useState(currentMonthStr);
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectEndDate, setProjectEndDate] = useState('');

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
      
      let matchDate = true;
      if (projectDateFilterType !== 'all') {
        const rawDate = p.created_at || p.createdAt || p.deadline || '';
        const projDate = rawDate ? rawDate.split('T')[0].split(' ')[0] : '';
        if (!projDate) {
          matchDate = false;
        } else if (projectDateFilterType === 'this_month') {
          matchDate = projDate.startsWith(currentMonthStr);
        } else if (projectDateFilterType === 'last_month') {
          matchDate = projDate.startsWith(lastMonthStr);
        } else if (projectDateFilterType === 'month') {
          matchDate = Boolean(projectFilterMonth && projDate.startsWith(projectFilterMonth));
        } else if (projectDateFilterType === 'range') {
          if (projectStartDate && projDate < projectStartDate) matchDate = false;
          if (projectEndDate && projDate > projectEndDate) matchDate = false;
        }
      }

      return matchSearch && matchStatus && matchDate;
    });
  }, [allProjects, projectSearch, projectStatus, projectDateFilterType, projectFilterMonth, projectStartDate, projectEndDate, currentMonthStr, lastMonthStr]);

  // --- JOBS TAB STATE ---
  const [jobSearch, setJobSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [jobFilterStatus, setJobFilterStatus] = useState('All');
  const [jobFilterClient, setJobFilterClient] = useState('All');
  const [jobFilterStaff, setJobFilterStaff] = useState('All');
  const [jobFilterProduct, setJobFilterProduct] = useState('All');
  const [jobFilterBilling, setJobFilterBilling] = useState('All');
  const [jobFilterType, setJobFilterType] = useState('All');

  // Job Date Filter States
  const [jobDateFilterType, setJobDateFilterType] = useState<'all' | 'this_month' | 'last_month' | 'month' | 'range'>('all');
  const [jobFilterMonth, setJobFilterMonth] = useState(currentMonthStr);
  const [jobStartDate, setJobStartDate] = useState('');
  const [jobEndDate, setJobEndDate] = useState('');
  const [jobDateFieldBasis, setJobDateFieldBasis] = useState<'created' | 'due'>('created');

  const resetJobFilters = () => {
    setJobSearch('');
    setJobFilterStatus('All');
    setJobFilterClient('All');
    setJobFilterStaff('All');
    setJobFilterProduct('All');
    setJobFilterBilling('All');
    setJobFilterType('All');
    setJobDateFilterType('all');
    setJobFilterMonth(currentMonthStr);
    setJobStartDate('');
    setJobEndDate('');
    setJobDateFieldBasis('created');
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchSearch = job.title.toLowerCase().includes(jobSearch.toLowerCase());
      const matchStatus = jobFilterStatus === 'All' || job.status === jobFilterStatus;
      const matchClient = jobFilterClient === 'All' || job.clientId === jobFilterClient;
      const matchStaff = jobFilterStaff === 'All' || job.teamId === jobFilterStaff;
      const matchProduct = jobFilterProduct === 'All' || job.productId === jobFilterProduct;
      const matchBilling = jobFilterBilling === 'All' || job.paymentStatus === jobFilterBilling;
      const matchType = jobFilterType === 'All' || 
        (jobFilterType === 'Printing' && isPrintingJob(job)) ||
        (jobFilterType === 'Designing' && isDesigningJob(job)) ||
        (jobFilterType === 'Des+Print' && job.type === 'Des+Print') ||
        job.type === jobFilterType;
      
      // Date filtering (Date range or month)
      let matchDate = true;
      if (jobDateFilterType !== 'all') {
        const rawDate = jobDateFieldBasis === 'due'
          ? (job.dueDate || job.createdAt || '')
          : (job.createdAt || job.dueDate || '');
        const jobDate = rawDate ? rawDate.split('T')[0].split(' ')[0] : '';

        if (!jobDate) {
          matchDate = false;
        } else if (jobDateFilterType === 'this_month') {
          matchDate = jobDate.startsWith(currentMonthStr);
        } else if (jobDateFilterType === 'last_month') {
          matchDate = jobDate.startsWith(lastMonthStr);
        } else if (jobDateFilterType === 'month') {
          matchDate = Boolean(jobFilterMonth && jobDate.startsWith(jobFilterMonth));
        } else if (jobDateFilterType === 'range') {
          if (jobStartDate && jobDate < jobStartDate) matchDate = false;
          if (jobEndDate && jobDate > jobEndDate) matchDate = false;
        }
      }

      return matchSearch && matchStatus && matchClient && matchStaff && matchProduct && matchBilling && matchType && matchDate;
    });
  }, [jobs, jobSearch, jobFilterStatus, jobFilterClient, jobFilterStaff, jobFilterProduct, jobFilterBilling, jobFilterType, jobDateFilterType, jobFilterMonth, jobStartDate, jobEndDate, jobDateFieldBasis, currentMonthStr, lastMonthStr]);

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
            id="tab-projects"
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'projects' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Project Reports
          </button>
          <button 
            id="tab-jobs"
            onClick={() => setActiveTab('jobs')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'jobs' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'
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
                <p className="text-sm font-semibold text-primary mb-1">In Progress & Active</p>
                <h3 className="text-3xl font-bold text-primary">{inProgressProjects}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Clock className="w-6 h-6 text-primary" />
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
          <div className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4 bg-white/40 border border-white/60 rounded-[1.5rem] backdrop-blur-md shadow-sm flex-shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by project or client name..." 
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-500"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <select 
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
                className="px-3 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none text-gray-700"
              >
                <option value="All">All Status</option>
                <option value="In Progress">In Progress</option>
                <option value="Active">Active</option>
                <option value="Planning">Planning</option>
                <option value="Completed">Completed</option>
              </select>

              {/* Date Filter for Projects */}
              <div className="flex items-center gap-1 bg-white/60 border border-white/80 rounded-lg p-0.5">
                <button
                  id="btn-projects-filter-all"
                  type="button"
                  onClick={() => setProjectDateFilterType('all')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${projectDateFilterType === 'all' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  All Time
                </button>
                <button
                  id="btn-projects-filter-this-month"
                  type="button"
                  onClick={() => setProjectDateFilterType('this_month')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${projectDateFilterType === 'this_month' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  This Month
                </button>
                <button
                  id="btn-projects-filter-last-month"
                  type="button"
                  onClick={() => setProjectDateFilterType('last_month')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${projectDateFilterType === 'last_month' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Last Month
                </button>
                <button
                  id="btn-projects-filter-month"
                  type="button"
                  onClick={() => setProjectDateFilterType('month')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${projectDateFilterType === 'month' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Month
                </button>
                <button
                  id="btn-projects-filter-range"
                  type="button"
                  onClick={() => setProjectDateFilterType('range')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${projectDateFilterType === 'range' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Date Range
                </button>
              </div>

              {projectDateFilterType === 'month' && (
                <input
                  id="input-projects-filter-month"
                  type="month"
                  value={projectFilterMonth}
                  onChange={(e) => setProjectFilterMonth(e.target.value)}
                  className="px-2.5 py-1.5 bg-white/70 border border-primary/40 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                />
              )}

              {projectDateFilterType === 'range' && (
                <div className="flex items-center gap-1.5 bg-white/70 border border-primary/40 rounded-lg px-2 py-1">
                  <input
                    id="input-projects-start-date"
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-gray-400">to</span>
                  <input
                    id="input-projects-end-date"
                    type="date"
                    value={projectEndDate}
                    onChange={(e) => setProjectEndDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                  />
                </div>
              )}

              {(projectSearch !== '' || projectStatus !== 'All' || projectDateFilterType !== 'all') && (
                <button
                  onClick={() => {
                    setProjectSearch('');
                    setProjectStatus('All');
                    setProjectDateFilterType('all');
                    setProjectFilterMonth(currentMonthStr);
                    setProjectStartDate('');
                    setProjectEndDate('');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
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
                          <span className="font-bold text-primary hover:underline cursor-pointer">{project.name}</span>
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-medium">
                          {project.category}
                        </td>
                        <td className="py-4 px-6 text-gray-600 font-medium">
                          {project.deadline ? formatDate(project.deadline, dateFormat) : '—'}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-gray-800">
                          {parseInt(project.budget || '0').toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                            (project.status === 'In Progress' || project.status === 'Active') ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-700'
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
          <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md overflow-hidden">
            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100/50 bg-white/20">
              <div className="flex items-center gap-3 flex-wrap">
                <button id="btn-jobs-toggle-filters" onClick={() => setShowFilters(f => !f)} className="flex items-center gap-2 font-bold text-gray-800 hover:text-primary transition-colors cursor-pointer select-none">
                  <FilterX className="w-4 h-4 text-gray-500" />
                  <span>Filter Reports</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* Quick Date Range / Month Pills right in filter header */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1 bg-white/60 border border-white/80 rounded-xl p-1 shadow-xs">
                    <Calendar className="w-3.5 h-3.5 text-gray-400 ml-1.5 mr-0.5" />
                    <button
                      id="btn-jobs-filter-all"
                      type="button"
                      onClick={() => setJobDateFilterType('all')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${jobDateFilterType === 'all' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                    >
                      All Time
                    </button>
                    <button
                      id="btn-jobs-filter-this-month"
                      type="button"
                      onClick={() => setJobDateFilterType('this_month')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${jobDateFilterType === 'this_month' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                    >
                      This Month
                    </button>
                    <button
                      id="btn-jobs-filter-last-month"
                      type="button"
                      onClick={() => setJobDateFilterType('last_month')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${jobDateFilterType === 'last_month' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                    >
                      Last Month
                    </button>
                    <button
                      id="btn-jobs-filter-month"
                      type="button"
                      onClick={() => setJobDateFilterType('month')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${jobDateFilterType === 'month' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                    >
                      Month Picker
                    </button>
                    <button
                      id="btn-jobs-filter-range"
                      type="button"
                      onClick={() => setJobDateFilterType('range')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${jobDateFilterType === 'range' ? 'bg-primary text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'}`}
                    >
                      Date Range
                    </button>
                  </div>

                  {jobDateFilterType === 'month' && (
                    <input
                      id="input-jobs-filter-month"
                      type="month"
                      value={jobFilterMonth}
                      onChange={(e) => setJobFilterMonth(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-primary/50 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs animate-in fade-in cursor-pointer"
                    />
                  )}

                  {jobDateFilterType === 'range' && (
                    <div className="flex items-center gap-1.5 bg-white border border-primary/50 rounded-xl px-2.5 py-1 shadow-xs animate-in fade-in">
                      <input
                        id="input-jobs-start-date"
                        type="date"
                        value={jobStartDate}
                        onChange={(e) => setJobStartDate(e.target.value)}
                        placeholder="Start Date"
                        className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-gray-400">to</span>
                      <input
                        id="input-jobs-end-date"
                        type="date"
                        value={jobEndDate}
                        onChange={(e) => setJobEndDate(e.target.value)}
                        placeholder="End Date"
                        className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mr-2">Total Amount:</span>
                  <span className="text-xl font-bold text-gray-800">₹{totalFilteredJobAmount.toLocaleString()}</span>
                </div>
                {(jobSearch !== '' || jobFilterStatus !== 'All' || jobFilterClient !== 'All' || jobFilterStaff !== 'All' || jobFilterProduct !== 'All' || jobFilterBilling !== 'All' || jobFilterType !== 'All' || jobDateFilterType !== 'all') && (
                  <button 
                    onClick={() => resetJobFilters()}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    Clear All
                  </button>
                )}
              </div>
            </div>

            <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 space-y-3.5">
                
                {/* Dedicated Date Range & Month Filter Box */}
                <div className="bg-white/60 border border-white/80 rounded-2xl p-3.5 shadow-xs">
                  <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Date Range & Month Settings</span>
                    </div>
                    
                    {/* Active period indicator badge */}
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {jobDateFilterType === 'all' && 'All Time'}
                      {jobDateFilterType === 'this_month' && `This Month (${currentMonthStr})`}
                      {jobDateFilterType === 'last_month' && `Last Month (${lastMonthStr})`}
                      {jobDateFilterType === 'month' && `Month: ${jobFilterMonth || 'Pick a month'}`}
                      {jobDateFilterType === 'range' && `Range: ${jobStartDate || 'Start'} to ${jobEndDate || 'End'}`}
                      {` • ${filteredJobs.length} Jobs`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Period Mode</label>
                      <select
                        value={jobDateFilterType}
                        onChange={(e) => setJobDateFilterType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="all">All Time</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="month">Specific Month</option>
                        <option value="range">Custom Date Range</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Filter By Date Basis</label>
                      <select
                        value={jobDateFieldBasis}
                        onChange={(e) => setJobDateFieldBasis(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="created">Created Date</option>
                        <option value="due">Due Date</option>
                      </select>
                    </div>

                    {jobDateFilterType === 'month' && (
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Select Month</label>
                        <input
                          type="month"
                          value={jobFilterMonth}
                          onChange={(e) => setJobFilterMonth(e.target.value)}
                          className="w-full px-3 py-1 bg-white border border-primary/50 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
                        />
                      </div>
                    )}

                    {jobDateFilterType === 'range' && (
                      <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Start Date (From)</label>
                          <input
                            type="date"
                            value={jobStartDate}
                            onChange={(e) => setJobStartDate(e.target.value)}
                            className="w-full px-2.5 py-1 bg-white border border-primary/50 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">End Date (To)</label>
                          <input
                            type="date"
                            value={jobEndDate}
                            onChange={(e) => setJobEndDate(e.target.value)}
                            className="w-full px-2.5 py-1 bg-white border border-primary/50 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    {(jobDateFilterType === 'all' || jobDateFilterType === 'this_month' || jobDateFilterType === 'last_month') && (
                      <div className="sm:col-span-2 flex items-center gap-2 pb-1 text-xs text-gray-500">
                        <span className="font-medium">Active Range:</span>
                        <span className="font-bold text-gray-700 bg-white/70 px-2 py-0.5 rounded-md border border-gray-200">
                          {jobDateFilterType === 'this_month' ? `${currentMonthStr} (1st to month end)` : jobDateFilterType === 'last_month' ? `${lastMonthStr} (1st to month end)` : 'All recorded jobs'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 6 Category Filter Dropdowns */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
                    <SearchableSelect
                      value={jobFilterStatus}
                      onChange={setJobFilterStatus}
                      options={[
                        { value: 'All', label: 'All' },
                        { value: 'Pending', label: 'Pending' },
                        { value: 'Progress', label: 'Progress' },
                        { value: 'Completed', label: 'Completed' },
                        { value: 'Cancel', label: 'Cancel' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Clients</label>
                    <SearchableSelect
                      value={jobFilterClient}
                      onChange={setJobFilterClient}
                      options={[
                        { value: 'All', label: 'All Clients' },
                        ...clients.map(c => ({ value: c.id, label: c.company }))
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Staff</label>
                    <SearchableSelect
                      value={jobFilterStaff}
                      onChange={setJobFilterStaff}
                      options={[
                        { value: 'All', label: 'All Staffs' },
                        ...staff.map(s => ({ value: s.id, label: s.name }))
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Product</label>
                    <SearchableSelect
                      value={jobFilterProduct}
                      onChange={setJobFilterProduct}
                      options={[
                        { value: 'All', label: 'All Products' },
                        ...products.map(p => ({ value: p.id, label: p.name }))
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Billing</label>
                    <SearchableSelect
                      value={jobFilterBilling}
                      onChange={setJobFilterBilling}
                      options={[
                        { value: 'All', label: 'All' },
                        { value: 'Paid', label: 'Paid' },
                        { value: 'Unpaid', label: 'Unpaid' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Job Type</label>
                    <SearchableSelect
                      value={jobFilterType}
                      onChange={setJobFilterType}
                      options={[
                        { value: 'All', label: 'All Types' },
                        { value: 'Designing', label: 'Designing' },
                        { value: 'Printing', label: 'Printing' },
                        { value: 'Des+Print', label: 'Des+Print' }
                      ]}
                    />
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search by job title..." 
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/60 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-500 shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/30">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Job Reports
              </h2>
              {canExport && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (filteredJobs.length === 0) return;
                      const headers = ["#", "Job Title", "Job Type", "Party", "Printer Name", "Status", "Due Date", "Created Date", "Paid Amount", "Total Amount", "Billing Status"];
                      const rows = filteredJobs.map((j, idx) => [
                        idx + 1,
                        `"${(j.title || '').replace(/"/g, '""')}"`,
                        `"${j.type || ''}"`,
                        `"${(getClientName(j.clientId) || '').replace(/"/g, '""')}"`,
                        `"${(getPrinterName(j.printerId) || '').replace(/"/g, '""')}"`,
                        `"${j.status || ''}"`,
                        `"${j.dueDate || ''}"`,
                        `"${j.createdAt ? j.createdAt.split('T')[0] : ''}"`,
                        j.paidAmount || 0,
                        j.totalAmount || 0,
                        `"${j.paymentStatus || ''}"`
                      ]);
                      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `jobs_report_${jobDateFilterType}_${Date.now()}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export to Excel
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export to PDF
                  </button>
                </div>
              )}
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
                    <th className="py-4 px-4 text-center">Dates (Due / Created)</th>
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
                          <button 
                            onClick={() => handleJobClick(job.id)}
                            className="font-bold text-primary hover:underline text-left text-sm flex items-center gap-1.5 group/link cursor-pointer"
                            title="Click to view invoice"
                          >
                            <FileText className="w-3.5 h-3.5 text-primary/70 group-hover/link:text-primary transition-colors flex-shrink-0" />
                            <span>{job.title}</span>
                          </button>
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
                        <td className="py-3 px-4 text-center">
                          <div className="font-semibold text-gray-800">{job.dueDate ? formatDate(job.dueDate, dateFormat) : '—'}</div>
                          {job.createdAt && (
                            <div className="text-[10px] text-gray-400 font-medium">Created: {formatDate(job.createdAt.split('T')[0], dateFormat)}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-gray-700">
                            {job.paidAmount > 0 ? `₹${job.paidAmount} / ` : '- / '}
                            ₹{job.totalAmount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            onClick={() => handleJobClick(job.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-transform hover:scale-105 cursor-pointer ${
                              job.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                            }`}
                            title="Click to view invoice"
                          >
                            {job.paymentStatus}
                          </button>
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

      {/* Invoice Preview Modal Overlay */}
      {selectedPreviewInvoice && (
        <InvoicePreviewModal 
          invoice={selectedPreviewInvoice} 
          onClose={() => setSelectedPreviewInvoice(null)} 
        />
      )}
    </div>
  );
}
