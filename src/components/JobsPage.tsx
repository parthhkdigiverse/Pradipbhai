import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, Briefcase, Play, Edit, Calendar, FilterX, Square, Clock } from 'lucide-react';
import { useData } from '../context/DataContext';

export function JobsPage() {
  const { jobs, setJobs, staff, clients, vendors, products, activeFilterIntent, setActiveFilterIntent, activeJobTracker, setActiveJobTracker } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterClient, setFilterClient] = useState('All');
  const [filterStaff, setFilterStaff] = useState('All');
  const [filterProduct, setFilterProduct] = useState('All');
  const [filterBilling, setFilterBilling] = useState('All');
  const [filterType, setFilterType] = useState('All');
  
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  
  // Job Type for the modal (Designing or Printing)
  const [newJobType, setNewJobType] = useState<'Designing' | 'Printing'>('Designing');

  useEffect(() => {
    if (activeFilterIntent && activeFilterIntent.page === 'jobs') {
      const { filterKey, filterValue } = activeFilterIntent;
      if (filterKey === 'status') setFilterStatus(filterValue);
      if (filterKey === 'billing') setFilterBilling(filterValue);
      if (filterKey === 'type') setFilterType(filterValue);
      
      setActiveFilterIntent(null);
    }
  }, [activeFilterIntent, setActiveFilterIntent]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientId: '',
    projectId: '',
    productId: '',
    printerId: '',
    teamId: '',
    dueDate: '',
    totalAmount: '',
    paidAmount: '',
    status: 'Pending',
    paymentStatus: 'Unpaid'
  });

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'All' || job.status === filterStatus;
      const matchClient = filterClient === 'All' || job.clientId === filterClient;
      const matchStaff = filterStaff === 'All' || job.teamId === filterStaff;
      const matchProduct = filterProduct === 'All' || job.productId === filterProduct;
      const matchBilling = filterBilling === 'All' || job.paymentStatus === filterBilling;
      const matchType = filterType === 'All' || job.type === filterType;
      
      const matchDateFrom = !filterDateFrom || (job.dueDate && new Date(job.dueDate) >= new Date(filterDateFrom));
      const matchDateTo = !filterDateTo || (job.dueDate && new Date(job.dueDate) <= new Date(filterDateTo));
      
      return matchSearch && matchStatus && matchClient && matchStaff && matchProduct && matchBilling && matchType && matchDateFrom && matchDateTo;
    });
  }, [jobs, searchTerm, filterStatus, filterClient, filterStaff, filterProduct, filterBilling, filterType, filterDateFrom, filterDateTo]);

  const totalFilteredJobAmount = useMemo(() => {
    return filteredJobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
  }, [filteredJobs]);

  const handleOpenModal = (jobType: 'Designing' | 'Printing', jobId: string | null = null) => {
    setNewJobType(jobType);
    if (jobId) {
      const job = jobs.find(x => x.id === jobId);
      if (job) {
        setFormData({
          title: job.title,
          description: job.description,
          clientId: job.clientId || '',
          projectId: job.projectId || '',
          productId: job.productId || '',
          printerId: job.printerId || '',
          teamId: job.teamId || '',
          dueDate: job.dueDate || '',
          totalAmount: job.totalAmount.toString(),
          paidAmount: job.paidAmount.toString(),
          status: job.status,
          paymentStatus: job.paymentStatus
        });
        setEditingJobId(jobId);
        setNewJobType(job.type as 'Designing' | 'Printing');
      }
    } else {
      setFormData({
        title: '',
        description: '',
        clientId: '',
        projectId: '',
        productId: '',
        printerId: '',
        teamId: '',
        dueDate: '',
        totalAmount: '',
        paidAmount: '',
        status: 'Pending',
        paymentStatus: 'Unpaid'
      });
      setEditingJobId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingJobId(null);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    
    const jobData = {
      ...formData,
      totalAmount: parseFloat(formData.totalAmount) || 0,
      paidAmount: parseFloat(formData.paidAmount) || 0,
      type: newJobType,
      paymentStatus: (parseFloat(formData.paidAmount) || 0) >= (parseFloat(formData.totalAmount) || 0) ? 'Paid' : 'Unpaid'
    };

    if (editingJobId) {
      setJobs(prev => prev.map(j => j.id === editingJobId ? { ...j, ...jobData } : j));
    } else {
      const newJob = {
        id: Math.random().toString(36).substr(2, 9),
        createdBy: 'Admin', // In a real app, this would be the logged in user
        createdAt: new Date().toISOString().split('T')[0],
        ...jobData
      };
      setJobs(prev => [newJob, ...prev]);
    }
    handleCloseModal();
  };

  const updateJobStatus = (id: string, status: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
  };

  const handleStartTracker = (jobId: string) => {
    if (activeJobTracker && activeJobTracker.jobId !== jobId) {
      // Stop previous tracker
      const elapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
      setJobs(prev => prev.map(j => j.id === activeJobTracker.jobId ? { ...j, trackedTime: (j.trackedTime || 0) + elapsed } : j));
    }
    setActiveJobTracker({ jobId, startTime: Date.now() });
    updateJobStatus(jobId, 'Progress'); // Optional: auto-set to Progress when tracking starts
  };

  const handleStopTracker = (jobId: string) => {
    if (activeJobTracker && activeJobTracker.jobId === jobId) {
      const elapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, trackedTime: (j.trackedTime || 0) + elapsed } : j));
      setActiveJobTracker(null);
      updateJobStatus(jobId, 'Pending'); // Optional: auto-set to pending/paused when tracking stops
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.company || 'Unknown Client';
  const getProjectName = (clientId: string, projectId: string) => {
    if (!clientId || !projectId) return null;
    const client = clients.find(c => c.id === clientId);
    if (!client || !client.projects) return null;
    // Projects in data might just be an array of objects. We need to match by index or name.
    // If the jobs data stores projectId as a string (e.g. index), let's parse it or match it. 
    // Wait, the projects in mock data don't have IDs, they are just in an array. Let's use the project name as the ID/value.
    const project = client.projects.find((p: any) => p.name === projectId);
    return project ? project.name : projectId; // Fallback to raw string if it's already the name
  };
  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || 'Unassigned';

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterClient('All');
    setFilterStaff('All');
    setFilterProduct('All');
    setFilterBilling('All');
    setFilterType('All');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Jobs Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenModal('Designing')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Designing Job
          </button>
          <button 
            onClick={() => handleOpenModal('Printing')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Printing Job
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm p-4 mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Jobs
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mr-2">Total Amount:</span>
              <span className="text-xl font-bold text-gray-800">₹{totalFilteredJobAmount.toLocaleString()}</span>
            </div>
            <button 
              onClick={resetFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Progress">Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancel">Cancel</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Clients</label>
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
              <option value="All">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Staff</label>
            <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
              <option value="All">All Staffs</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Product</label>
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
              <option value="All">All Products</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Billing</label>
            <select value={filterBilling} onChange={(e) => setFilterBilling(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
              <option value="All">All</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Job Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
              <option value="All">All Types</option>
              <option value="Designing">Designing</option>
              <option value="Printing">Printing</option>
              <option value="Des+Print">Des+Print</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Due Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Due Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
          </div>
        </div>
        
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by job title or description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500"
          />
        </div>
      </div>

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6 w-12">#</th>
                <th className="py-4 px-6 w-32">Created By</th>
                <th className="py-4 px-6 min-w-[200px]">Title</th>
                <th className="py-4 px-6 text-center">Type</th>
                <th className="py-4 px-6 min-w-[250px]">Description</th>
                <th className="py-4 px-6">Client & Project</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6">Team</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6 text-center">Time</th>
                <th className="py-4 px-6 text-center">Payment</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job, index) => (
                  <tr key={job.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 font-bold text-gray-400">{index + 1}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 text-[11px]">{job.createdBy}</span>
                        <span className="text-[10px] text-gray-500">{job.createdAt}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-blue-600 text-sm hover:underline cursor-pointer">{job.title}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide text-white shadow-sm ${
                        job.type === 'Designing' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}>
                        {job.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 text-[11px] truncate max-w-[250px]" title={job.description}>
                      {job.description}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">{getClientName(job.clientId)}</span>
                        {job.projectId && (
                          <span className="text-[10px] text-gray-500 flex items-center mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5"></span>
                            {getProjectName(job.clientId, job.projectId)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <select
                        value={job.status}
                        onChange={(e) => updateJobStatus(job.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide focus:outline-none cursor-pointer appearance-none relative text-center ${
                          job.status === 'Pending' ? 'bg-gray-100 text-gray-600 border-gray-200' : 
                          job.status === 'Progress' ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                        style={{ paddingRight: '1.25rem', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .3rem top 50%', backgroundSize: '.55rem auto' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Progress">Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[11px] font-medium text-gray-600 bg-gray-100/80 px-2 py-1 rounded">{getStaffName(job.teamId)}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium whitespace-nowrap">
                      {job.dueDate || '-'}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {activeJobTracker?.jobId === job.id ? (
                           <span className="text-blue-600 animate-pulse font-bold">Tracking...</span>
                        ) : (
                          <span className="text-gray-600 font-medium">{formatTime(job.trackedTime || 0)}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${
                        job.paymentStatus === 'Paid' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}>
                        {job.paymentStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {activeJobTracker?.jobId === job.id ? (
                          <button 
                            onClick={() => handleStopTracker(job.id)}
                            className="w-6 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            title="Stop Tracking & Pause"
                          >
                            <Square className="w-3 h-3 fill-current" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleStartTracker(job.id)}
                            className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                            title="Start Tracking & Progress"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenModal(job.type as 'Designing' | 'Printing', job.id)}
                          className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                          title="Edit Job"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Briefcase className="w-12 h-12 text-gray-300 mb-4" />
                      <p>No jobs found.</p>
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
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-lg font-bold text-gray-800">{editingJobId ? 'Edit Job' : `Add New ${newJobType} Job`}</h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveJob} className="p-5 space-y-4">
              {/* Select Client & Team */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Select Client <span className="text-rose-500">*</span></label>
                  <select required value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value, projectId: ''})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="" disabled>Select client by name</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Select Project</label>
                  <select 
                    value={formData.projectId} 
                    onChange={e => setFormData({...formData, projectId: e.target.value})} 
                    disabled={!formData.clientId}
                    className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">No specific project</option>
                    {formData.clientId && clients.find(c => c.id === formData.clientId)?.projects?.map((p: any, idx: number) => (
                      <option key={idx} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title & Product */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Assign Team</label>
                  <select value={formData.teamId} onChange={e => setFormData({...formData, teamId: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="">Select Staff</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Job Title <span className="text-rose-500">*</span></label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Product</label>
                  <select value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="">Type to search product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Work Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 h-24 resize-none" />
              </div>

              {/* Printer & Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Printer / Vendor</label>
                  <select value={formData.printerId} onChange={e => setFormData({...formData, printerId: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                    <option value="">Select Printer</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Deadline</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full pl-3 pr-9 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                  </div>
                </div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Total Amount (₹)</label>
                  <input type="number" min="0" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 font-bold" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Paid Amount (₹)</label>
                  <input type="number" min="0" value={formData.paidAmount} onChange={e => setFormData({...formData, paidAmount: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-emerald-700 font-bold" />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/40">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all">
                  {editingJobId ? 'Save Changes' : 'Save Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
