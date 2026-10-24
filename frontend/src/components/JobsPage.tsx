import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, Briefcase, Play, Edit, FilterX, Square, Clock, Mail, ChevronDown, ExternalLink, Link, Folder, CheckCircle2, Trash2, RotateCcw, MessageSquare, LayoutGrid, Pause, Eye, Printer } from 'lucide-react';
import { useData, isDesigningJob, isPrintingJob } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { formatDate } from '../utils/dateFormatter';
import { calculateLatePunchIn } from '../utils/attendanceUtils';
import { SearchableSelect } from './SearchableSelect';
import { QuickAddClientModal } from './QuickAddClientModal';
import { QuickAddProductModal } from './QuickAddProductModal';
import { JobDetailsModal } from './JobDetailsModal';
import { SmartDatePicker } from './SmartDatePicker';
import { Pagination } from './Pagination';

interface LiveJobTimeCellProps {
  job: any;
  activeJobTracker: any;
  formatTime: (seconds: number) => string;
  formatStartTime: (job: any) => string;
  info: any;
  handleOpenDelayModal: (job: any) => void;
}

function LiveJobTimeCell({
  job,
  activeJobTracker,
  formatTime,
  formatStartTime,
  info,
  handleOpenDelayModal
}: LiveJobTimeCellProps) {
  const isProgress = job.status === 'Progress' || job.status === 'In Progress';

  const calculateElapsed = () => {
    const baseTracked = Number(job.trackedTime) || 0;
    if (!isProgress) return baseTracked;

    const now = Date.now();
    if (activeJobTracker && activeJobTracker.jobId === job.id && activeJobTracker.startTime) {
      const activeElapsed = Math.floor((now - activeJobTracker.startTime) / 1000);
      return baseTracked + Math.max(0, activeElapsed);
    }
    if (job.startedAt) {
      const startMs = new Date(job.startedAt).getTime();
      if (!isNaN(startMs)) {
        const liveElapsed = Math.floor((now - startMs) / 1000);
        return baseTracked + Math.max(0, liveElapsed);
      }
    }
    if (job.createdAt && job.createdAt.includes('T')) {
      const createdMs = new Date(job.createdAt).getTime();
      if (!isNaN(createdMs)) {
        const liveElapsed = Math.floor((now - createdMs) / 1000);
        return baseTracked + Math.max(0, liveElapsed);
      }
    }
    return baseTracked;
  };

  const [liveSec, setLiveSec] = useState(calculateElapsed);

  useEffect(() => {
    if (!isProgress) {
      setLiveSec(Number(job.trackedTime) || 0);
      return;
    }
    setLiveSec(calculateElapsed());
    const timer = setInterval(() => {
      setLiveSec(calculateElapsed());
    }, 1000);
    return () => clearInterval(timer);
  }, [job.id, job.status, job.trackedTime, job.startedAt, job.createdAt, isProgress, activeJobTracker?.jobId, activeJobTracker?.startTime]);

  const sinceStr = formatStartTime(job);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center justify-center gap-1.5 text-xs font-mono px-2 py-1 rounded border transition-colors ${
        isProgress 
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs font-bold' 
          : 'bg-gray-50 text-gray-600 border-gray-100 font-medium'
      }`}>
        {isProgress ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <Clock className="w-3 h-3 text-emerald-600" />
            <span>{formatTime(liveSec)}</span>
          </>
        ) : (
          <>
            <Clock className="w-3 h-3 text-gray-400" />
            <span>{formatTime(job.trackedTime || 0)}</span>
          </>
        )}
      </div>
      {isProgress && sinceStr && (
        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/60 px-1.5 py-0.5 rounded border border-emerald-200/50">
          {sinceStr}
        </span>
      )}
      {info.expectedText && (
        <span className="text-[10px] text-gray-500 font-medium">
          Est: {info.expectedText}
        </span>
      )}
      {info.isExceeded && (
        <div className="flex flex-col items-center gap-0.5">
          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[9px] font-bold">
            ⚠️ Exceeded (+{info.diffText})
          </span>
          {job.delayReason ? (
            <button 
              onClick={(e) => { e.stopPropagation(); handleOpenDelayModal(job); }} 
              className="text-[10px] text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-semibold text-left max-w-[160px] truncate block cursor-pointer transition-colors" 
              title={`Delay Reason: ${job.delayReason}`}
            >
              💬 {job.delayReason}
            </button>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); handleOpenDelayModal(job); }} 
              className="text-[10px] text-white bg-rose-500 hover:bg-rose-600 font-bold px-2 py-0.5 rounded shadow-sm animate-pulse block cursor-pointer transition-all"
            >
              ⚠️ Add Delay Reason
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function JobsPage() {
  const { jobs, addJob, updateJob, deleteJob, staff, clients, vendors, products, activeFilterIntent, setActiveFilterIntent, activeJobTracker, setActiveJobTracker, currentUserRole, currentUser, isPunchedIn, setIsPunchedIn, setPunchInTime, attendance, addAttendance, updateAttendance, hasPermission, openPunchInModal } = useData();
  const { officeStartTime, lateBufferMinutes, enableLatePenalty, latePenaltyAction, latePenaltyAmount, dateFormat } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterClient, setFilterClient] = useState('All');
  const [filterStaff, setFilterStaff] = useState('All');
  const [filterProduct, setFilterProduct] = useState('All');
  const [filterBilling, setFilterBilling] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [showOnlyReadyToSendPrint, setShowOnlyReadyToSendPrint] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // View-only job details modal state
  const [viewOnlyJob, setViewOnlyJob] = useState<any | null>(null);
  
  // Quick Add Client Modal State
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  
  // Quick Add Product Modal State
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');
  
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Reset pagination to page 1 on any filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm, filterStatus, filterClient, filterStaff, filterProduct, 
    filterBilling, filterType, showOnlyReadyToSendPrint, filterDateFrom, 
    filterDateTo, activeFilterIntent
  ]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  
  // Job Type for the modal (Designing, Printing, or Des+Print)
  const [newJobType, setNewJobType] = useState<'Designing' | 'Printing' | 'Des+Print'>('Designing');

  // Job Completion Modal States
  const [completionModalJobId, setCompletionModalJobId] = useState<string | null>(null);
  const [completionWorkLink, setCompletionWorkLink] = useState('');
  const [completionWorkLocation, setCompletionWorkLocation] = useState('');

  // Inline Cell Editing State
  const [inlineCell, setInlineCell] = useState<{ jobId: string; field: string } | null>(null);
  const [inlineValue, setInlineValue] = useState<string>('');

  const handleSaveInlineEdit = async (jobId: string, field: string, val: any) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    if (field === 'dueDate' && val) {
      const year = parseInt(val.split('-')[0], 10);
      if (isNaN(year) || year < 2000 || year > 2099) {
        alert('Please select a valid deadline year between 2000 and 2099.');
        setInlineCell(null);
        return;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (val < todayStr) {
        alert('Deadline cannot be a past date. Please choose today or a future date.');
        setInlineCell(null);
        return;
      }
    }

    let patch: any = { [field]: val };
    if (field === 'totalAmount' || field === 'paidAmount') {
      const num = parseFloat(val) || 0;
      patch[field] = num;
      const total = field === 'totalAmount' ? num : (job.totalAmount || 0);
      const paid = field === 'paidAmount' ? num : (job.paidAmount || 0);
      patch.paymentStatus = total > 0 && paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');
    }

    await updateJob(jobId, patch);
    setInlineCell(null);
  };

  useEffect(() => {
    if (activeFilterIntent && activeFilterIntent.page === 'jobs') {
      if (activeFilterIntent.filters) {
        const { status, type, billing, client, staff, product, searchTerm: sTerm, dateFrom, dateTo } = activeFilterIntent.filters;
        
        setFilterStatus(status !== undefined ? status : 'All');
        setFilterType(type !== undefined ? type : 'All');
        setFilterBilling(billing !== undefined ? billing : 'All');
        setFilterClient(client !== undefined ? client : 'All');
        setFilterStaff(staff !== undefined ? staff : 'All');
        setFilterProduct(product !== undefined ? product : 'All');
        setSearchTerm(sTerm !== undefined ? sTerm : '');
        setFilterDateFrom(dateFrom !== undefined ? dateFrom : '');
        setFilterDateTo(dateTo !== undefined ? dateTo : '');
      } else {
        const { filterKey, filterValue } = activeFilterIntent;
        if (filterKey === 'status' && filterValue) {
          setFilterStatus(filterValue);
          setFilterType('All');
        } else if (filterKey === 'billing' && filterValue) {
          setFilterBilling(filterValue);
          setFilterStatus('All');
        } else if (filterKey === 'type' && filterValue) {
          setFilterType(filterValue);
          setFilterStatus('All');
        }
      }
      
      setActiveFilterIntent(null);
    }
  }, [activeFilterIntent, setActiveFilterIntent]);

  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    projectId: '',
    productId: '',
    printerId: '',
    teamId: '',
    dueDate: '',
    totalAmount: '',
    paidAmount: '',
    status: 'Pending',
    paymentStatus: 'Unpaid',
    vendorEmailSent: false,
    paymentOverride: null as { reason: string, approvedBy: string, approvedAt: string } | null,
    workLink: '',
    workLocation: '',
    estimatedTime: '',
    estimatedTimeUnit: 'Hours',
    delayReason: ''
  });

  const [overrideReason, setOverrideReason] = useState('');
  const [delayModalJob, setDelayModalJob] = useState<any | null>(null);
  const [delayReasonInput, setDelayReasonInput] = useState('');

  const handleOpenWorkLocation = async (locationPath: string) => {
    if (!locationPath || !locationPath.trim()) return;
    const cleanPath = locationPath.trim().replace(/^["']|["']$/g, '');

    // Web links / HTTP / HTTPS / Drive URLs
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      window.open(cleanPath, '_blank', 'noopener,noreferrer');
      return;
    }

    if (/^(www\.|drive\.google\.com|dropbox\.com|onedrive\.live\.com|docs\.google\.com)/i.test(cleanPath)) {
      window.open(`https://${cleanPath}`, '_blank', 'noopener,noreferrer');
      return;
    }

    // Format file URL scheme
    let fileUrl = cleanPath;
    if (cleanPath.startsWith('file://') || cleanPath.startsWith('smb://')) {
      fileUrl = cleanPath;
    } else if (cleanPath.startsWith('/')) {
      fileUrl = `file://${cleanPath}`;
    } else if (/^[a-zA-Z]:[\\/]/.test(cleanPath)) {
      fileUrl = `file:///${cleanPath.replace(/\\/g, '/')}`;
    } else if (cleanPath.startsWith('\\\\')) {
      fileUrl = `file:${cleanPath.replace(/\\/g, '/')}`;
    } else {
      fileUrl = `file:///${cleanPath.replace(/\\/g, '/')}`;
    }

    // 1. Copy path to clipboard
    try {
      await navigator.clipboard.writeText(cleanPath);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }

    // 2. Attempt backend API call to launch native OS explorer (for local server or Electron)
    let openedViaBackend = false;
    try {
      const res = await fetch('/api/jobs/open-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ path: cleanPath })
      });
      const data = await res.json();
      if (data.status === 'url' && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (data.status === 'success') {
        openedViaBackend = true;
      }
    } catch (err) {
      console.warn('Backend open-folder error:', err);
    }

    // 3. Attempt browser window / protocol open for file:// URL
    try {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      try {
        window.open(fileUrl, '_blank');
      } catch {}
    }

    if (!openedViaBackend) {
      alert(`Folder path copied to clipboard!\n${cleanPath}\n\nOpening link attempted: ${fileUrl}\n(If your browser blocks local file:// URLs from web pages, paste the copied path into Finder or File Explorer)`);
    }
  };

  const handleOpenDelayModal = (job: any) => {
    setDelayModalJob(job);
    setDelayReasonInput(job.delayReason || '');
  };

  const handleSaveDelayReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delayModalJob) {
      await updateJob(delayModalJob.id, { delayReason: delayReasonInput.trim() });
      setDelayModalJob(null);
      setDelayReasonInput('');
    }
  };

  const getJobTimelineInfo = (job: any) => {
    if (!job.estimatedTime) return { isExceeded: false, expectedText: '', diffText: '' };
    const val = parseFloat(job.estimatedTime) || 0;
    const unit = job.estimatedTimeUnit || 'Hours';
    const expectedSeconds = unit === 'Days' ? val * 24 * 3600 : unit === 'Minutes' ? val * 60 : val * 3600;
    const tracked = job.trackedTime || 0;
    const isExceeded = tracked > expectedSeconds;
    const diffSecs = tracked - expectedSeconds;
    const diffText = diffSecs >= 3600 ? `${(diffSecs / 3600).toFixed(1)} hrs` : `${Math.ceil(diffSecs / 60)} mins`;
    return {
      isExceeded,
      expectedText: `${val} ${unit}`,
      diffText,
      tracked,
      expectedSeconds
    };
  };

  const isEmployee = currentUserRole !== 'Admin' && currentUserRole !== 'Manager';
  const currentStaffId = currentUser?.id || staff.find(s => s.email?.toLowerCase() === (currentUser?.email || '').toLowerCase())?.id;
  const currentStaffName = currentUser?.name || staff.find(s => s.id === currentStaffId)?.name || '';

  // Des+Print jobs where the design is completed, but print has not been sent to vendor
  const desCompletedPrintPendingJobs = useMemo(() => {
    return jobs.filter(pJob => {
      const isPrint = pJob.type === 'Printing' || pJob.type === 'Des+Print' || pJob.title.includes('[PRINT]');
      if (!isPrint) return false;
      // Once print is in Progress or Completed, it is no longer awaiting dispatch
      if (pJob.status !== 'Pending') return false;
      if (pJob.vendorEmailSent) return false;

      // Find the corresponding design job
      let dJob = null;
      if (pJob.id.endsWith('-p')) {
        const dId = pJob.id.slice(0, -2) + '-d';
        dJob = jobs.find(j => j.id === dId);
      }
      if (!dJob && pJob.delayReason) {
        dJob = jobs.find(j => j.id === pJob.delayReason);
      }
      if (!dJob && pJob.title.includes('[PRINT]')) {
        const expectedDesignTitle = pJob.title.replace('[PRINT]', '[DESIGN]').trim().toLowerCase();
        dJob = jobs.find(j => j.title.trim().toLowerCase() === expectedDesignTitle);
      }
      if (!dJob && pJob.projectId) {
        dJob = jobs.find(j => 
          j.projectId === pJob.projectId && 
          j.clientId === pJob.clientId && 
          (j.title.includes('[DESIGN]') || j.type === 'Designing' || j.type === 'Des+Print') &&
          j.id !== pJob.id
        );
      }

      // Design must exist and be Completed or Done
      return Boolean(dJob && (dJob.status === 'Completed' || dJob.status === 'Done'));
    });
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Employees only see jobs assigned to them or created by them
      if (isEmployee) {
        const isAssigned = (
          (currentStaffId && (job.teamId === currentStaffId || job.assignedStaffId === currentStaffId || job.assigned_staff_id === currentStaffId)) ||
          (currentStaffName && job.createdBy && job.createdBy.toLowerCase() === currentStaffName.toLowerCase()) ||
          (currentUser?.email && job.assignedStaffEmail && job.assignedStaffEmail.toLowerCase() === currentUser.email.toLowerCase())
        );
        if (!isAssigned) return false;
        // Hide Printing jobs that are awaiting the design phase completion
        if (job.status === 'Awaiting Design') return false;
      }

      const sLower = searchTerm.toLowerCase();
      const clientName = clients.find(c => c.id === job.clientId)?.company || '';
      const staffName = staff.find(s => s.id === job.teamId)?.name || '';
      const productName = products.find(p => p.id === job.productId)?.name || '';
      const printerName = vendors.find(v => v.id === job.printerId)?.name || '';
      
      const matchSearch = (job.title || '').toLowerCase().includes(sLower) || 
                          (job.status || '').toLowerCase().includes(sLower) ||
                          (!isEmployee && (job.paymentStatus || '').toLowerCase().includes(sLower)) ||
                          (job.type || '').toLowerCase().includes(sLower) ||
                          clientName.toLowerCase().includes(sLower) ||
                          staffName.toLowerCase().includes(sLower) ||
                          productName.toLowerCase().includes(sLower) ||
                          printerName.toLowerCase().includes(sLower) ||
                          (job.delayReason || '').toLowerCase().includes(sLower) ||
                          (!isEmployee && job.totalAmount && job.totalAmount.toString().includes(sLower));
      const matchStatus = filterStatus === 'All' || 
        job.status === filterStatus || 
        ((filterStatus === 'Progress' || filterStatus === 'In Progress') && (job.status === 'Progress' || job.status === 'In Progress')) ||
        ((filterStatus === 'Completed' || filterStatus === 'Done') && (job.status === 'Completed' || job.status === 'Done')) ||
        ((filterStatus === 'Hold' || filterStatus === 'On Hold') && (job.status === 'Hold' || job.status === 'On Hold'));
      const matchClient = filterClient === 'All' || job.clientId === filterClient;
      const matchStaff = filterStaff === 'All' || 
        (filterStaff === 'Unassigned' ? (!job.teamId && !job.assignedStaffId) : job.teamId === filterStaff);
      const matchProduct = filterProduct === 'All' || job.productId === filterProduct;
      const matchBilling = isEmployee || filterBilling === 'All' || job.paymentStatus === filterBilling;
      const matchType = filterType === 'All' || 
        (filterType === 'Printing' && isPrintingJob(job)) ||
        (filterType === 'Designing' && isDesigningJob(job)) ||
        (filterType === 'Des+Print' && job.type === 'Des+Print') ||
        (filterType === 'Only Printing' && job.type === 'Printing') ||
        (filterType === 'Only Designing' && job.type === 'Designing') ||
        job.type === filterType;
      
      const matchDateFrom = !filterDateFrom || (job.dueDate && new Date(job.dueDate) >= new Date(filterDateFrom));
      const matchDateTo = !filterDateTo || (job.dueDate && new Date(job.dueDate) <= new Date(filterDateTo));
      
      const matchReadyPrint = !showOnlyReadyToSendPrint || desCompletedPrintPendingJobs.some(rp => rp.id === job.id);

      return matchSearch && matchStatus && matchClient && matchStaff && matchProduct && matchBilling && matchType && matchDateFrom && matchDateTo && matchReadyPrint;
    });
  }, [jobs, isEmployee, currentStaffId, currentStaffName, currentUser, searchTerm, filterStatus, filterClient, filterStaff, filterProduct, filterBilling, filterType, filterDateFrom, filterDateTo, showOnlyReadyToSendPrint, desCompletedPrintPendingJobs]);

  const paginatedJobs = useMemo(() => {
    return filteredJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredJobs, currentPage, itemsPerPage]);

  const statusCounts = useMemo(() => {
    const baseJobs = jobs.filter(job => {
      if (isEmployee) {
        const isAssigned = (
          (currentStaffId && (job.teamId === currentStaffId || job.assignedStaffId === currentStaffId || job.assigned_staff_id === currentStaffId)) ||
          (currentStaffName && job.createdBy && job.createdBy.toLowerCase() === currentStaffName.toLowerCase()) ||
          (currentUser?.email && job.assignedStaffEmail && job.assignedStaffEmail.toLowerCase() === currentUser.email.toLowerCase())
        );
        if (!isAssigned) return false;
        if (job.status === 'Awaiting Design') return false;
      }

      const matchType = filterType === 'All' || 
        (filterType === 'Printing' && isPrintingJob(job)) ||
        (filterType === 'Designing' && isDesigningJob(job)) ||
        (filterType === 'Des+Print' && job.type === 'Des+Print') ||
        (filterType === 'Only Printing' && job.type === 'Printing') ||
        (filterType === 'Only Designing' && job.type === 'Designing') ||
        job.type === filterType;

      return matchType;
    });

    return {
      All: baseJobs.length,
      Pending: baseJobs.filter(j => j.status === 'Pending').length,
      Progress: baseJobs.filter(j => j.status === 'Progress' || j.status === 'In Progress').length,
      'Under Review': baseJobs.filter(j => j.status === 'Under Review').length,
      Hold: baseJobs.filter(j => j.status === 'Hold' || j.status === 'On Hold').length,
      Completed: baseJobs.filter(j => j.status === 'Completed' || j.status === 'Done').length,
    };
  }, [jobs, isEmployee, currentStaffId, currentStaffName, currentUser, filterType]);

  const handleOpenModal = (jobType: 'Designing' | 'Printing' | 'Des+Print', jobId: string | null = null) => {
    setNewJobType(jobType);
    if (jobId) {
      const job = jobs.find(x => x.id === jobId);
      if (job) {
        setFormData({
          title: job.title,
          clientId: job.clientId || '',
          projectId: job.projectId || '',
          productId: job.productId || '',
          printerId: job.printerId || '',
          teamId: job.teamId || '',
          dueDate: job.dueDate || '',
          totalAmount: !isEmployee && job.totalAmount !== undefined && job.totalAmount !== null ? job.totalAmount.toString() : '',
          paidAmount: !isEmployee && job.paidAmount !== undefined && job.paidAmount !== null ? job.paidAmount.toString() : '',
          status: job.status,
          paymentStatus: job.paymentStatus,
          vendorEmailSent: job.vendorEmailSent || false,
          paymentOverride: job.paymentOverride || null,
          workLink: job.workLink || '',
          workLocation: job.workLocation || '',
          estimatedTime: job.estimatedTime !== undefined && job.estimatedTime !== null ? String(job.estimatedTime) : '',
          estimatedTimeUnit: job.estimatedTimeUnit || 'Hours',
          delayReason: job.delayReason || ''
        });
        setEditingJobId(jobId);
        setNewJobType((job.type as 'Designing' | 'Printing' | 'Des+Print') || 'Designing');
        setOverrideReason('');
      }
    } else {
      setFormData({
        title: '',
        clientId: '',
        projectId: '',
        productId: '',
        printerId: '',
        teamId: '',
        dueDate: '',
        totalAmount: '',
        paidAmount: '',
        status: jobType === 'Printing' ? 'In Progress' : 'Pending',
        paymentStatus: 'Unpaid',
        vendorEmailSent: false,
        paymentOverride: null,
        workLink: '',
        workLocation: '',
        estimatedTime: '',
        estimatedTimeUnit: 'Hours',
        delayReason: ''
      });
      setEditingJobId(null);
      setOverrideReason('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingJobId(null);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.dueDate) {
      const year = parseInt(formData.dueDate.split('-')[0], 10);
      if (isNaN(year) || year < 2000 || year > 2099) {
        alert('Please enter a valid deadline year between 2000 and 2099.');
        return;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      if (formData.dueDate < todayStr) {
        alert('Deadline cannot be a past date. Please select today or a future date.');
        return;
      }
    }

    const existingJob = editingJobId ? jobs.find(j => j.id === editingJobId) : null;
    const total = isEmployee 
      ? (existingJob ? (existingJob.totalAmount || 0) : 0)
      : (parseFloat(formData.totalAmount) || 0);
    const paid = isEmployee 
      ? (existingJob ? (existingJob.paidAmount || 0) : 0)
      : (parseFloat(formData.paidAmount) || 0);
    const computedPaymentStatus = isEmployee
      ? (existingJob ? (existingJob.paymentStatus || 'Unpaid') : 'Unpaid')
      : (total > 0 && paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid'));

    const jobData = {
      ...formData,
      printerId: newJobType === 'Designing' ? '' : formData.printerId,
      vendorEmailSent: newJobType === 'Designing' ? false : formData.vendorEmailSent,
      totalAmount: total,
      paidAmount: paid,
      estimatedTime: formData.estimatedTime ? parseFloat(formData.estimatedTime) : null,
      type: newJobType,
      paymentStatus: computedPaymentStatus,
      status: (!editingJobId && newJobType === 'Printing') ? 'In Progress' : (formData.status || 'Pending'),
    };

    if (editingJobId) {
      const existingJob = jobs.find(j => j.id === editingJobId);
      const isProgressNow = jobData.status === 'Progress' || jobData.status === 'In Progress';
      const wasProgress = existingJob?.status === 'Progress' || existingJob?.status === 'In Progress';
      let updatedStartedAt = existingJob?.startedAt;
      let finalTracked = existingJob?.trackedTime || 0;

      if (isProgressNow && !wasProgress) {
        updatedStartedAt = new Date().toISOString();
      } else if (!isProgressNow && wasProgress) {
        if (existingJob?.startedAt) {
          const el = Math.floor((Date.now() - new Date(existingJob.startedAt).getTime()) / 1000);
          finalTracked += Math.max(0, el);
        }
        updatedStartedAt = null;
      }

      updateJob(editingJobId, {
        ...jobData,
        startedAt: updatedStartedAt,
        trackedTime: finalTracked
      });
    } else {
      if (newJobType === 'Des+Print') {
        const designJobId = `job-${Date.now()}-d`;
        // Create Designing Job
        const designJob = {
          ...jobData,
          id: designJobId,
          createdBy: 'Admin',
          createdAt: new Date().toISOString().split('T')[0],
          type: 'Des+Print',
          title: `[DESIGN] ${jobData.title}`
        };
        // Create Printing Job
        const printJob = {
          ...jobData,
          id: `job-${Date.now()}-p`,
          createdBy: 'System (Auto)',
          createdAt: new Date().toISOString().split('T')[0],
          type: 'Des+Print',
          title: `[PRINT] ${jobData.title}`,
          status: 'Awaiting Design',
          delayReason: designJobId, // Use delayReason field to store the linked design job ID temporarily
          teamId: '' // Print job should remain unassigned initially
        };
        addJob(designJob);
        addJob(printJob);
      } else {
        const isProgress = newJobType === 'Printing' || jobData.status === 'Progress' || jobData.status === 'In Progress';
        const newJob = {
          ...jobData,
          id: `job-${Date.now()}`,
          createdBy: 'Admin',
          status: newJobType === 'Printing' ? 'In Progress' : (jobData.status || 'Pending'),
          startedAt: isProgress ? new Date().toISOString() : null,
          createdAt: new Date().toISOString().split('T')[0]
        };
        addJob(newJob);
      }
    }
    handleCloseModal();
  };

  const ensurePunchedIn = async () => {
    if (currentUserRole === 'Admin') return;
    if (!isPunchedIn) {
      const now = Date.now();
      setIsPunchedIn(true);
      setPunchInTime(now);

      const todayStr = new Date(now).toISOString().split('T')[0];
      const checkInStr = new Date(now).toTimeString().slice(0, 5);
      const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
      const loggedStaffName = currentUser?.name || staff.find(s => s.id === loggedStaffId)?.name || 'Unknown';

      const existingRecord = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffId && a.date === todayStr);

      if (existingRecord) {
        // Subsequent punch-in of the day: keep first punch-in's late status and penalties
        const existingPunches = existingRecord.punches || (existingRecord.checkIn ? [{ in: existingRecord.checkIn, out: existingRecord.checkOut }] : []);
        const closedPunches = existingPunches.map((p: any) => {
          if (!p.out) {
            return { ...p, out: checkInStr };
          }
          return p;
        });
        await updateAttendance(existingRecord.id, {
          status: existingRecord.status || 'Present',
          check_in: existingRecord.checkIn || existingRecord.check_in || checkInStr,
          punches: [...closedPunches, { in: checkInStr, out: '' }],
          is_late: existingRecord.isLate || existingRecord.is_late || false,
          late_minutes: existingRecord.lateMinutes || existingRecord.late_minutes || 0,
          penalty_amount: existingRecord.penaltyAmount || existingRecord.penalty_amount || 0,
          warning_note: existingRecord.warningNote || existingRecord.warning_note || ''
        });
      } else {
        // First punch-in of the day: calculate late status
        const loggedStaff = staff.find((s: any) => s.id === loggedStaffId || (s.email && s.email.toLowerCase() === currentUser?.email?.toLowerCase()));
        const effectiveStartTime = loggedStaff?.officeStartTime || loggedStaff?.office_start_time || (currentUser as any)?.officeStartTime || officeStartTime;

        const lateCalc = calculateLatePunchIn(
          checkInStr,
          effectiveStartTime,
          lateBufferMinutes,
          enableLatePenalty,
          latePenaltyAction,
          latePenaltyAmount
        );

        await addAttendance({
          staff_id: loggedStaffId,
          staff_name: loggedStaffName,
          date: todayStr,
          status: lateCalc.status || 'Present',
          check_in: checkInStr,
          check_out: '',
          punches: [{ in: checkInStr, out: '' }],
          is_late: lateCalc.isLate,
          late_minutes: lateCalc.lateMinutes,
          penalty_amount: lateCalc.penaltyAmount,
          warning_note: lateCalc.warningNote
        });
      }
    }
  };

  const isPrintJob = (job: any) => {
    if (!job) return false;
    if (job.type === 'Printing' || job.type === 'Print') return true;
    if (typeof job.title === 'string' && (job.title.trim().startsWith('[PRINT]') || job.title.trim().startsWith('[Print]'))) {
      return true;
    }
    return false;
  };

  const enforceSingleProgressJob = async (newProgressJobId: string) => {
    const newJob = jobs.find((j: any) => j.id === newProgressJobId);
    if (isPrintJob(newJob)) return;

    const otherProgressJobs = jobs.filter((j: any) => 
      j.id !== newProgressJobId && 
      (j.status === 'Progress' || j.status === 'In Progress') && 
      !isPrintJob(j) &&
      (currentUserRole === 'Admin' || currentUserRole === 'Manager' || j.assignedTo === currentStaffName || j.assigned_to === currentStaffName || j.teamId === currentStaffId)
    );

    for (const prevJob of otherProgressJobs) {
      if (activeJobTracker && activeJobTracker.jobId === prevJob.id) {
        const elapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
        await updateJob(prevJob.id, { trackedTime: (prevJob.trackedTime || 0) + elapsed, status: 'Pending', startedAt: null });
        setActiveJobTracker(null);
      } else {
        await updateJob(prevJob.id, { status: 'Pending', startedAt: null });
      }
    }
  };

  const handleStartTracker = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    const client = clients.find(c => c.id === job.clientId);
    if (client && client.trafficLight === 'Red' && !job.paymentOverride) {
      alert('🔴 PAYMENT REQUIRED — Cannot start work tracker for this Red client without advance or Partner override.');
      return;
    }

    ensurePunchedIn();
    await enforceSingleProgressJob(jobId);

    if (isPrintJob(job)) {
      // Print jobs run concurrently on machines and do not block other jobs
      await updateJob(jobId, { status: 'Progress', startedAt: job.startedAt || new Date().toISOString() });
      return;
    }

    if (activeJobTracker && activeJobTracker.jobId !== jobId) {
      // Stop previous tracker (only if previous was not a print job)
      const elapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
      const prev = jobs.find((j: any) => j.id === activeJobTracker.jobId);
      if (prev) {
        const updatePayload: any = { trackedTime: (prev.trackedTime || 0) + elapsed };
        if (!isPrintJob(prev)) {
          updatePayload.status = 'Pending';
          updatePayload.startedAt = null;
        }
        await updateJob(activeJobTracker.jobId, updatePayload);
      }
    }
    setActiveJobTracker({ jobId, startTime: Date.now() });
    await updateJob(jobId, { status: 'Progress', startedAt: job.startedAt || new Date().toISOString() });
  };

  const handleApproveJobByAdmin = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const client = clients.find(c => c.id === job.clientId);
    if (client && client.trafficLight === 'Red' && !job.paymentOverride) {
      alert('🔴 PAYMENT REQUIRED — Work is blocked for this Red client until an advance is recorded or a Partner override is provided.');
      return;
    }
    if (client && client.trafficLight === 'Yellow' && job.paidAmount < job.totalAmount) {
      alert('🟡 BALANCE PENDING — Delivery/Completion is blocked for this Yellow client until full payment is received.');
      return;
    }

    let extraElapsed = 0;
    if (activeJobTracker && activeJobTracker.jobId === jobId) {
      extraElapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
      setActiveJobTracker(null);
    } else if (job?.startedAt) {
      extraElapsed = Math.floor((Date.now() - new Date(job.startedAt).getTime()) / 1000);
    }
    const finalTracked = (job?.trackedTime || 0) + Math.max(0, extraElapsed);

    await updateJob(jobId, { status: 'Completed', trackedTime: finalTracked, startedAt: null });
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Manager') {
      setTimeout(() => openPunchInModal(), 200);
    }

    // Wake up linked Printing jobs that were created simultaneously
    if (job.type === 'Designing' || job.type === 'Des+Print') {
      const linkedPrintJobs = jobs.filter(j => 
        (j.status === 'Awaiting Design' || (j.type === 'Des+Print' && j.title.includes('[PRINT]'))) && 
        (j.delayReason === jobId || j.id === jobId.replace(/-d$/, '-p'))
      );
      for (const pJob of linkedPrintJobs) {
        // In Des+Print, print jobs should NOT go to 'In Progress' automatically; they stay 'Pending' ready to be sent to print
        await updateJob(pJob.id, { status: 'Pending', startedAt: null });
      }
    }

    // Auto-create Printing job when a Designing job of a Des+Print project is approved
    if (job.type === 'Designing' && job.projectId) {
      const client = clients.find((c: any) => c.id === job.clientId);
      const project = client?.projects?.find((p: any) => p.name === job.projectId);
      if (project && project.category === 'Des+Print') {
        const printingJobExists = jobs.some(
          j => j.projectId === job.projectId &&
               j.clientId === job.clientId &&
               (j.type === 'Printing' || j.type === 'Des+Print')
        );
        if (!printingJobExists) {
          const newPrintingJob = {
            id: Math.random().toString(36).substr(2, 9),
            createdBy: 'System (Auto)',
            createdAt: new Date().toISOString().split('T')[0],
            title: `[PRINT] ${job.title.replace(/^\[DESIGN\]\s*/i, '')}`,
            type: 'Des+Print',
            clientId: job.clientId,
            projectId: job.projectId,
            status: 'Pending', // In Des+Print, print job stays Pending until sent to print!
            startedAt: null,
            teamId: '',
            dueDate: project.deadline || '',
            paymentStatus: 'Unpaid',
            totalAmount: 0,
            paidAmount: 0,
            printerId: '',
            productId: job.productId || '',
            trackedTime: 0,
            workLink: job.workLink || '',
            workLocation: job.workLocation || ''
          };
          await addJob(newPrintingJob);
        }
      }
    }
  };

  const handleRejectJobForRevision = async (jobId: string) => {
    const feedback = prompt('Enter revision feedback / notes for the employee:');
    if (feedback !== null) {
      await updateJob(jobId, {
        status: 'Progress',
        delayReason: feedback.trim() ? `Revision Requested: ${feedback.trim()}` : 'Revision Requested by Manager/Admin'
      });
    }
  };

  const updateJobStatus = async (id: string, status: string) => {
    const job = jobs.find(j => j.id === id);
    if (!job) return;

    if ((job.status === 'Completed' || job.status === 'Done') && currentUserRole !== 'Admin' && currentUserRole !== 'Manager') {
      alert('🔒 Completed jobs are locked and cannot be modified by employees.');
      return;
    }

    if (status !== 'Pending') {
      const client = clients.find(c => c.id === job.clientId);
      if (client && client.trafficLight === 'Red' && !job.paymentOverride) {
        alert('🔴 PAYMENT REQUIRED — Work is blocked for this Red client until an advance is recorded or a Partner override is provided.');
        return;
      }
    }

    if (status === 'Progress' || status === 'In Progress') {
      await enforceSingleProgressJob(id);
      if (activeJobTracker?.jobId !== id && !isPrintJob(job)) {
        handleStartTracker(id);
      }
      await updateJob(id, { status: 'Progress', startedAt: job.startedAt || new Date().toISOString() });
      return;
    }

    if (status !== 'Progress' && status !== 'In Progress' && (job.status === 'Progress' || job.status === 'In Progress')) {
      let elapsed = 0;
      if (activeJobTracker?.jobId === id) {
        elapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
        setActiveJobTracker(null);
      } else if (job.startedAt) {
        elapsed = Math.floor((Date.now() - new Date(job.startedAt).getTime()) / 1000);
      }
      await updateJob(id, { trackedTime: (job.trackedTime || 0) + Math.max(0, elapsed), startedAt: null });
    }

    if (status === 'Done' || status === 'Completed' || status === 'Under Review') {
      if (status === 'Done' || status === 'Completed') {
        if (currentUserRole === 'Admin' || currentUserRole === 'Manager') {
          await handleApproveJobByAdmin(id);
          return;
        } else {
          alert('⚠️ Only Admins or Managers can approve and mark a job as Completed.');
          return;
        }
      }
      setCompletionModalJobId(id);
      setCompletionWorkLink(job.workLink || '');
      setCompletionWorkLocation(job.workLocation || '');
      return;
    }

    await updateJob(id, { status });
  };

  const handleSaveCompletionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionWorkLink.trim() && !completionWorkLocation.trim()) {
      alert('⚠️ At least ONE field is required: Please provide either a Work Output Link OR a Storage Location/Notes to submit this job for review.');
      return;
    }
    if (completionModalJobId) {
      const targetId = completionModalJobId;
      const targetJob = jobs.find(j => j.id === targetId);
      let elapsed = 0;
      if (activeJobTracker && activeJobTracker.jobId === targetId) {
        elapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
        setActiveJobTracker(null);
      } else if (targetJob?.startedAt) {
        elapsed = Math.floor((Date.now() - new Date(targetJob.startedAt).getTime()) / 1000);
      }

      await updateJob(targetId, {
        status: 'Under Review',
        workLink: completionWorkLink.trim(),
        workLocation: completionWorkLocation.trim(),
        trackedTime: (targetJob?.trackedTime || 0) + Math.max(0, elapsed),
        startedAt: null
      });

      setCompletionModalJobId(null);
      if (currentUserRole !== 'Admin' && currentUserRole !== 'Manager') {
        setTimeout(() => openPunchInModal(), 200);
      }
    }
  };

  const handleStopTracker = async (jobId: string) => {
    const targetJob = jobs.find(j => j.id === jobId);
    let elapsed = 0;
    if (activeJobTracker && activeJobTracker.jobId === jobId) {
      elapsed = Math.floor((Date.now() - activeJobTracker.startTime) / 1000);
      setActiveJobTracker(null);
    } else if (targetJob?.startedAt) {
      elapsed = Math.floor((Date.now() - new Date(targetJob.startedAt).getTime()) / 1000);
    }
    const newTracked = (targetJob?.trackedTime || 0) + Math.max(0, elapsed);
    setActiveJobTracker(null);
    await updateJob(jobId, { trackedTime: newTracked, status: 'Pending', startedAt: null });

    const updatedJob = targetJob ? { ...targetJob, trackedTime: newTracked, status: 'Pending', startedAt: null } : null;
    if (updatedJob) {
      const info = getJobTimelineInfo(updatedJob);
      if (info.isExceeded && !updatedJob.delayReason) {
        setTimeout(() => handleOpenDelayModal(updatedJob), 300);
      }
    }
  };

  const toggleVendorEmailSent = async (jobId: string) => {
    const job = jobs.find((j: any) => j.id === jobId);
    if (job) await updateJob(jobId, { vendorEmailSent: !job.vendorEmailSent });
  };

  const formatStartTime = (job: any) => {
    const timeVal = job.startedAt || (job.createdAt && job.createdAt.includes('T') ? job.createdAt : null);
    if (!timeVal) return '';
    const d = new Date(timeVal);
    if (isNaN(d.getTime())) return '';
    const isToday = new Date().toDateString() === d.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return isToday ? `Since ${timeStr}` : `Since ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatBadgeCount = (count: number) => {
    if (!count || count <= 0) return '0';
    if (count < 1000) return count.toString();
    if (count < 10000) {
      const formatted = (count / 1000).toFixed(1).replace(/\.0$/, '');
      return `${formatted}k`;
    }
    if (count < 1000000) {
      return `${Math.round(count / 1000)}k`;
    }
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
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
    setShowOnlyReadyToSendPrint(false);
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Jobs Dashboard</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasPermission(currentUserRole, 'Create Job') && (
            <>
              <button 
                onClick={() => handleOpenModal('Designing')}
                className="px-3 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New</span> Designing Job
              </button>
              <button 
                onClick={() => handleOpenModal('Printing')}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md shadow-amber-400/20 hover:shadow-lg hover:shadow-amber-400/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New</span> Printing Job
              </button>
              <button 
                onClick={() => handleOpenModal('Des+Print')}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-400/20 hover:shadow-lg hover:shadow-purple-400/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New</span> Des+Print Job
              </button>
            </>
          )}
        </div>
      </div>

      {/* Admin/Manager Review Required Alert Banner */}
      {(currentUserRole === 'Admin' || currentUserRole === 'Manager') && jobs.filter(j => j.status === 'Under Review').length > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 mb-4 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                🔍 {jobs.filter(j => j.status === 'Under Review').length} Job(s) Pending Manager & Admin Review
              </h4>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Work completed and submitted by team members. Review work output links & approve or request revision.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus('Under Review')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer"
          >
            Filter Review Jobs
          </button>
        </div>
      )}

      {/* Des+Print: Design Completed, Ready to Send to Print Alert Banner */}
      {(currentUserRole === 'Admin' || currentUserRole === 'Manager') && desCompletedPrintPendingJobs.length > 0 && (
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 mb-6 backdrop-blur-md flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md flex items-center justify-center">
              <Printer className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <span>🖨️ {desCompletedPrintPendingJobs.length} Des+Print Job(s): Design Completed — Ready to Send to Print</span>
              </h4>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Design work is approved & completed. Assign printer/vendor and send required print documents to begin printing.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (showOnlyReadyToSendPrint) {
                setShowOnlyReadyToSendPrint(false);
              } else {
                setShowOnlyReadyToSendPrint(true);
                setFilterStatus('All');
                setFilterType('All');
              }
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{showOnlyReadyToSendPrint ? 'Show All Jobs' : 'Filter Print Jobs'}</span>
          </button>
        </div>
      )}

      {/* Unified Quick Status & Filter Bar */}
      <div className="glass-panel border border-white/60 rounded-2xl mb-6 bg-white/60 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="p-2.5 flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Quick Status Buttons + Filter Jobs Toggle */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              {[
                {
                  id: 'All',
                  label: 'All Jobs',
                  icon: LayoutGrid,
                  count: statusCounts.All,
                  activeColor: 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-500/20 scale-105',
                  inactiveColor: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm opacity-90 hover:opacity-100',
                  iconColor: '',
                },
                {
                  id: 'Pending',
                  label: 'Pending',
                  icon: Clock,
                  count: statusCounts.Pending,
                  activeColor: 'bg-gray-800 text-white shadow-md shadow-gray-700/30 ring-4 ring-gray-400/20 scale-105',
                  inactiveColor: 'bg-gray-100/90 text-gray-600 hover:bg-gray-200/90 hover:text-gray-900 border border-gray-200/50',
                  iconColor: 'text-gray-600',
                },
                {
                  id: 'Progress',
                  label: 'In Progress',
                  icon: RotateCcw,
                  count: statusCounts.Progress,
                  activeColor: 'bg-blue-500 text-white shadow-md shadow-blue-500/30 ring-4 ring-blue-400/20 scale-105',
                  inactiveColor: 'bg-blue-50 text-blue-600 hover:bg-blue-100/90 border border-blue-200/50',
                  iconColor: 'text-blue-600',
                },
                {
                  id: 'Under Review',
                  label: 'Under Review',
                  icon: Pause,
                  count: statusCounts['Under Review'],
                  activeColor: 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-4 ring-amber-400/20 scale-105',
                  inactiveColor: 'bg-amber-50 text-amber-700 hover:bg-amber-100/90 border border-amber-200/50',
                  iconColor: 'text-amber-700',
                },
                {
                  id: 'Completed',
                  label: 'Completed',
                  icon: CheckCircle2,
                  count: statusCounts.Completed,
                  activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 ring-4 ring-emerald-500/20 scale-105',
                  inactiveColor: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100/90 border border-emerald-200/50',
                  iconColor: 'text-emerald-600',
                },
              ].map((btn) => {
                const Icon = btn.icon;
                const isActive = filterStatus === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => setFilterStatus(btn.id)}
                    title={`${btn.label}: ${btn.count.toLocaleString()} ${btn.count === 1 ? 'job' : 'jobs'}`}
                    className={`relative group w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isActive ? btn.activeColor : btn.inactiveColor
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : btn.iconColor}`} />
                    {btn.count > 0 && (
                      <span className={`absolute -top-1.5 -right-1.5 h-4.5 min-w-[18px] px-1 inline-flex items-center justify-center text-[10px] font-extrabold rounded-full leading-none shadow-md ring-2 ring-white select-none pointer-events-none transition-all ${
                        isActive ? 'bg-gray-900 text-white' : 'bg-gray-800 text-white'
                      }`}>
                        {formatBadgeCount(btn.count)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Subtle Divider */}
            <div className="h-6 w-px bg-gray-200/80 mx-1 hidden sm:block" />

            {/* Filter Jobs Toggle Button */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                showFilters 
                  ? 'bg-primary text-white border-primary shadow-sm' 
                  : 'bg-white/80 hover:bg-white text-gray-700 border-gray-200/80 shadow-2xs hover:shadow-sm'
              }`}
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Filter Jobs</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Right: Active Filters & Clear Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-semibold pr-2">
            <span>Active Filter:</span>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg font-bold">
              {filterStatus === 'Progress' ? 'In Progress' : filterStatus}
            </span>
            {filterType !== 'All' && (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-lg font-bold flex items-center gap-1">
                Type: {filterType}
                <button
                  onClick={() => setFilterType('All')}
                  className="hover:text-red-500 ml-1 font-bold cursor-pointer text-xs"
                  title="Clear type filter"
                >
                  ✕
                </button>
              </span>
            )}
            {filterBilling !== 'All' && !isEmployee && (
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200/60 rounded-lg font-bold flex items-center gap-1">
                Billing: {filterBilling}
                <button
                  onClick={() => setFilterBilling('All')}
                  className="hover:text-red-500 ml-1 font-bold cursor-pointer text-xs"
                  title="Clear billing filter"
                >
                  ✕
                </button>
              </span>
            )}
            {filterStaff === 'Unassigned' && (
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-lg font-bold flex items-center gap-1">
                Unassigned
                <button
                  onClick={() => setFilterStaff('All')}
                  className="hover:text-red-500 ml-1 font-bold cursor-pointer text-xs"
                  title="Clear staff filter"
                >
                  ✕
                </button>
              </span>
            )}
            {(filterStatus !== 'All' || filterType !== 'All' || filterBilling !== 'All' || filterStaff !== 'All' || searchTerm !== '' || filterClient !== 'All' || filterProduct !== 'All' || filterDateFrom !== '' || filterDateTo !== '') && (
              <button
                onClick={resetFilters}
                className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        <div className={`transition-all duration-300 overflow-hidden ${showFilters ? 'max-h-[600px] opacity-100 border-t border-white/40' : 'max-h-0 opacity-0'}`}>
          <div className="p-4 bg-white/30 backdrop-blur-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <SearchableSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Progress', label: 'In Progress' },
                { value: 'Under Review', label: 'Under Review 🔍' },
                { value: 'Hold', label: 'Hold ⏸' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancel', label: 'Cancel' }
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Clients</label>
            <SearchableSelect
              value={filterClient}
              onChange={setFilterClient}
              options={[
                { value: 'All', label: 'All Clients' },
                ...clients.map(c => ({ value: c.id, label: c.company || c.name || c.contact || 'Client' }))
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Staff</label>
            <SearchableSelect
              value={filterStaff}
              onChange={setFilterStaff}
              options={[
                { value: 'All', label: 'All Staffs' },
                { value: 'Unassigned', label: 'Unassigned Tasks' },
                ...staff.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Product</label>
            <SearchableSelect
              value={filterProduct}
              onChange={setFilterProduct}
              options={[
                { value: 'All', label: 'All Products' },
                ...products.map(p => ({ value: p.id, label: p.name }))
              ]}
            />
          </div>
          {!isEmployee && (
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Billing</label>
              <SearchableSelect
                value={filterBilling}
                onChange={setFilterBilling}
                options={[
                  { value: 'All', label: 'All' },
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Unpaid', label: 'Unpaid' }
                ]}
              />
            </div>
          )}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Job Type</label>
            <SearchableSelect
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: 'All', label: 'All Types' },
                { value: 'Designing', label: 'Designing' },
                { value: 'Printing', label: 'Printing' },
                { value: 'Des+Print', label: 'Des+Print' },
                { value: 'Only Designing', label: 'Designing Only' },
                { value: 'Only Printing', label: 'Printing Only' }
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Due Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Due Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
          </div>
        </div>
        
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by job title..." 
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
                <th className="py-4 px-6 w-12">#</th>
                <th className="py-4 px-6 w-32">Created By</th>
                <th className="py-4 px-6 min-w-[200px]">Title</th>
                <th className="py-4 px-6 text-center">Type</th>

                <th className="py-4 px-6">Client & Project</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Docs Sent</th>
                <th className="py-4 px-6">Team</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6 text-center">Time</th>
                {!isEmployee && (
                  <th className="py-4 px-6 text-center">Payment</th>
                )}
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredJobs.length > 0 ? (
                paginatedJobs.map((job, index) => (
                  <tr key={job.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 font-bold text-gray-400">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 text-[11px]">{job.createdBy}</span>
                        <span className="text-[10px] text-gray-500">{job.createdAt}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        {inlineCell?.jobId === job.id && inlineCell?.field === 'title' ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input 
                              type="text" 
                              autoFocus
                              value={inlineValue} 
                              onChange={e => setInlineValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveInlineEdit(job.id, 'title', inlineValue);
                                if (e.key === 'Escape') setInlineCell(null);
                              }}
                              onBlur={() => handleSaveInlineEdit(job.id, 'title', inlineValue)}
                              className="px-2 py-1 bg-white border border-primary rounded text-xs text-gray-800 focus:outline-none w-full shadow-sm font-semibold"
                            />
                          </div>
                        ) : (
                          <span 
                            onDoubleClick={(e) => {
                              if (!hasPermission(currentUserRole, 'Edit Job')) return;
                              e.stopPropagation();
                              setInlineCell({ jobId: job.id, field: 'title' });
                              setInlineValue(job.title || '');
                            }}
                            className="font-bold text-primary text-sm hover:underline cursor-pointer flex items-center gap-1 group/title"
                            title="Double-click to edit title"
                          >
                            {job.title}
                            {hasPermission(currentUserRole, 'Edit Job') && (
                              <Edit className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                            )}
                          </span>
                        )}
                        {(job.workLink || job.workLocation || (job.delayReason && !job.delayReason.startsWith('job-')) || desCompletedPrintPendingJobs.some(rp => rp.id === job.id)) && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {job.workLink && (
                              <a
                                href={job.workLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors"
                                title={job.workLink}
                              >
                                <ExternalLink className="w-3 h-3 text-emerald-600" />
                                View Work
                              </a>
                            )}
                            {job.workLocation && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWorkLocation(job.workLocation);
                                }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 rounded-lg hover:bg-indigo-100 hover:text-indigo-800 transition-all cursor-pointer shadow-2xs group/folder shrink-0"
                                title={`Click to open directly in File Explorer / Finder: ${job.workLocation}`}
                              >
                                <Folder className="w-3.5 h-3.5 text-indigo-500 group-hover/folder:scale-110 transition-transform shrink-0" />
                                <span className="truncate max-w-[160px]">{job.workLocation}</span>
                                <ExternalLink className="w-3 h-3 text-indigo-400 group-hover/folder:text-indigo-600 shrink-0" />
                              </button>
                            )}
                            {job.delayReason && !job.delayReason.startsWith('job-') && (
                              <span
                                onClick={(e) => { e.stopPropagation(); handleOpenDelayModal(job); }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300/80 rounded-md hover:bg-amber-100 transition-colors cursor-pointer max-w-[240px] truncate"
                                title={`Revision / Delay Note: ${job.delayReason}`}
                              >
                                <MessageSquare className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">{job.delayReason}</span>
                              </span>
                            )}
                            {desCompletedPrintPendingJobs.some(rp => rp.id === job.id) && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs animate-pulse"
                                title="Design phase completed! Ready to send to printer/vendor."
                              >
                                <Printer className="w-3 h-3 text-amber-700" /> Send to Print
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <span className={`whitespace-nowrap inline-block px-2.5 py-1 rounded text-[10px] font-bold tracking-wide text-white shadow-sm ${
                        job.type === 'Designing' ? 'bg-emerald-500' : job.type === 'Des+Print' ? 'bg-purple-600' : 'bg-primary'
                      }`}>
                        {job.type === 'Des+Print' ? 'Des + Print' : job.type}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">{getClientName(job.clientId)}</span>
                        {job.projectId && (
                          <span className="text-[10px] text-gray-500 flex items-center mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5"></span>
                            {getProjectName(job.clientId, job.projectId)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <select
                          value={job.status === 'Done' ? 'Completed' : (job.status === 'In Progress' ? 'Progress' : job.status)}
                          onChange={(e) => updateJobStatus(job.id, e.target.value)}
                          disabled={currentUserRole !== 'Admin' && currentUserRole !== 'Manager' && (job.status === 'Completed' || job.status === 'Done')}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide focus:outline-none appearance-none relative text-center ${
                            job.status === 'Completed' || job.status === 'Done' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm' :
                            job.status === 'Pending' ? 'bg-gray-100 text-gray-600 border-gray-200 cursor-pointer' : 
                            (job.status === 'Progress' || job.status === 'In Progress') ? 'bg-primary/10 text-primary border-primary cursor-pointer' : 
                            'bg-amber-100 text-amber-800 border-amber-300 animate-pulse font-bold cursor-pointer'
                          } ${currentUserRole !== 'Admin' && currentUserRole !== 'Manager' && (job.status === 'Completed' || job.status === 'Done') ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                          style={{ paddingRight: '1.25rem', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .3rem top 50%', backgroundSize: '.55rem auto' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Progress">Progress</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Completed" disabled={currentUserRole !== 'Admin' && currentUserRole !== 'Manager'}>Completed</option>
                        </select>

                        {/* Admin / Manager Review Quick Actions */}
                        {job.status === 'Under Review' && (currentUserRole === 'Admin' || currentUserRole === 'Manager') && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApproveJobByAdmin(job.id); }}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Approve work output and mark job Completed"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRejectJobForRevision(job.id); }}
                              className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              title="Send back to Progress with revision feedback"
                            >
                              <RotateCcw className="w-3 h-3" /> Revision
                            </button>
                          </div>
                        )}

                        {(job.status === 'Completed' || job.status === 'Done') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompletionModalJobId(job.id);
                              setCompletionWorkLink(job.workLink || '');
                              setCompletionWorkLocation(job.workLocation || '');
                            }}
                            className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Edit Work Link / Location"
                          >
                            <Link className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {job.type === 'Designing' ? (
                        <span className="text-gray-400 font-bold text-xs">—</span>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleVendorEmailSent(job.id); }}
                          className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-colors ${
                            job.vendorEmailSent 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : 'bg-orange-100 text-orange-500'
                          }`}
                          title={job.vendorEmailSent ? "Docs Sent" : "Docs Pending"}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {inlineCell?.jobId === job.id && inlineCell?.field === 'teamId' ? (
                        <select
                          autoFocus
                          value={inlineValue}
                          onChange={e => handleSaveInlineEdit(job.id, 'teamId', e.target.value)}
                          onBlur={() => setInlineCell(null)}
                          onClick={e => e.stopPropagation()}
                          className="px-2 py-1 bg-white border border-primary rounded text-xs text-gray-800 focus:outline-none shadow-sm font-medium"
                        >
                          <option value="">Unassigned</option>
                          {staff
                            .filter(s => (s.role !== 'Admin' && s.role !== 'Manager') || s.id === job.teamId)
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.role || 'Staff'})</option>
                            ))}
                        </select>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <span 
                            onClick={(e) => {
                              if (!hasPermission(currentUserRole, 'Edit Job')) return;
                              e.stopPropagation();
                              setInlineCell({ jobId: job.id, field: 'teamId' });
                              setInlineValue(job.teamId || '');
                            }}
                            className={`text-[11px] font-medium px-2 py-1 rounded cursor-pointer transition-colors inline-flex items-center gap-1 group/staff ${
                              job.teamId
                                ? 'text-gray-700 bg-gray-100/80 hover:bg-gray-200'
                                : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60'
                            }`}
                            title="Click to assign or change staff"
                          >
                            {getStaffName(job.teamId) || 'Unassigned'}
                            {hasPermission(currentUserRole, 'Edit Job') && (
                              <Edit className="w-2.5 h-2.5 text-gray-400 group-hover/staff:text-gray-700 transition-colors shrink-0" />
                            )}
                          </span>
                          {job.teamId && hasPermission(currentUserRole, 'Edit Job') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveInlineEdit(job.id, 'teamId', '');
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Turn back to unassigned"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium whitespace-nowrap">
                      {inlineCell?.jobId === job.id && inlineCell?.field === 'dueDate' ? (
                        <input 
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          max="2099-12-31"
                          autoFocus
                          value={inlineValue}
                          onChange={e => handleSaveInlineEdit(job.id, 'dueDate', e.target.value)}
                          onBlur={() => setInlineCell(null)}
                          onClick={e => e.stopPropagation()}
                          className="px-2 py-1 bg-white border border-primary rounded text-xs text-gray-800 focus:outline-none shadow-sm"
                        />
                      ) : (
                        <span 
                          onDoubleClick={(e) => {
                            if (!hasPermission(currentUserRole, 'Edit Job')) return;
                            e.stopPropagation();
                            setInlineCell({ jobId: job.id, field: 'dueDate' });
                            setInlineValue(job.dueDate || '');
                          }}
                          className="cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-1 group/date"
                          title="Double-click to edit due date"
                        >
                          {job.dueDate ? formatDate(job.dueDate, dateFormat) : '-'}
                          {hasPermission(currentUserRole, 'Edit Job') && (
                            <Edit className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover/date:opacity-100 transition-opacity shrink-0" />
                          )}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <LiveJobTimeCell
                        job={job}
                        activeJobTracker={activeJobTracker}
                        formatTime={formatTime}
                        formatStartTime={formatStartTime}
                        info={getJobTimelineInfo(job)}
                        handleOpenDelayModal={handleOpenDelayModal}
                      />
                    </td>
                    {!isEmployee && (
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        {inlineCell?.jobId === job.id && inlineCell?.field === 'paymentStatus' ? (
                          <select
                            autoFocus
                            value={inlineValue}
                            onChange={e => handleSaveInlineEdit(job.id, 'paymentStatus', e.target.value)}
                            onBlur={() => setInlineCell(null)}
                            onClick={e => e.stopPropagation()}
                            className="px-2 py-1 bg-white border border-primary rounded text-xs text-gray-800 focus:outline-none shadow-sm"
                          >
                            <option value="Unpaid">Unpaid</option>
                            <option value="Partial">Partial</option>
                            <option value="Paid">Paid</option>
                          </select>
                        ) : (
                          <span 
                            onDoubleClick={(e) => {
                              if (!hasPermission(currentUserRole, 'Edit Job')) return;
                              e.stopPropagation();
                              setInlineCell({ jobId: job.id, field: 'paymentStatus' });
                              setInlineValue(job.paymentStatus || 'Unpaid');
                            }}
                            className={`whitespace-nowrap inline-block px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm cursor-pointer hover:opacity-90 transition-opacity ${
                              job.paymentStatus === 'Paid' ? 'bg-emerald-500' : job.paymentStatus === 'Partial' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            title="Double-click to edit payment status"
                          >
                            {job.paymentStatus}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5 transition-opacity">
                        {job.status !== 'Completed' && job.status !== 'Done' && job.status !== 'Under Review' && (
                          (activeJobTracker?.jobId === job.id || job.status === 'Progress' || job.status === 'In Progress') ? (
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
                          )
                        )}
                        {/* View Job Details (Read-only) */}
                        <button 
                          type="button"
                          onClick={() => setViewOnlyJob(job)}
                          className="w-6 h-6 rounded bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-gray-900 transition-colors cursor-pointer"
                          title="View Job Details (Read-only)"
                        >
                          <Eye className="w-3 h-3" />
                        </button>

                        {hasPermission(currentUserRole, 'Edit Job') && (
                          <button 
                            onClick={() => handleOpenModal(job.type as 'Designing' | 'Printing', job.id)}
                            className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                            title="Edit Job"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                        {hasPermission(currentUserRole, 'Delete Job') && (
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this job?')) {
                                deleteJob(job.id);
                              }
                            }}
                            className="w-6 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            title="Delete Job"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Briefcase className="w-12 h-12 text-gray-300" />
                      {jobs.length > 0 ? (
                        <>
                          <p className="font-semibold text-gray-700">No jobs match your current filter criteria.</p>
                          <p className="text-xs text-gray-400">There are {jobs.length} total job(s) stored in the database.</p>
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setFilterStatus('All');
                              setFilterClient('All');
                              setFilterStaff('All');
                              setFilterProduct('All');
                              setFilterBilling('All');
                              setFilterType('All');
                              setFilterDateFrom('');
                              setFilterDateTo('');
                            }}
                            className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                          >
                            Reset All Filters
                          </button>
                        </>
                      ) : (
                        <p className="font-medium text-gray-500">No jobs found in the system. Click "Add New Job" to create one.</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredJobs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          itemsPerPageOptions={[10, 25, 50, 100]}
          itemName="jobs"
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-lg font-bold text-gray-800">{editingJobId ? 'Edit Job' : `Add New ${newJobType} Job`}</h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveJob} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Job Type Changer (Editing) */}
              {editingJobId && newJobType !== 'Des+Print' && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-4 flex items-center justify-between">
                  <label className="text-sm font-bold text-indigo-900">Current Job Type:</label>
                  <select 
                    value={newJobType} 
                    onChange={(e) => setNewJobType(e.target.value as 'Designing' | 'Printing')}
                    className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-sm font-semibold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                  >
                    <option value="Designing">✏️ Designing Job</option>
                    <option value="Printing">🖨️ Printing Job</option>
                  </select>
                </div>
              )}

              {/* Auto Alert Banner */}
              {(() => {
                const selectedClient = clients.find(c => c.id === formData.clientId);
                if (!selectedClient) return null;
                
                const getBannerStyle = () => {
                  if (selectedClient.trafficLight === 'Red') return 'bg-rose-50 border-rose-200 text-rose-800';
                  if (selectedClient.trafficLight === 'Yellow') return 'bg-amber-50 border-amber-200 text-amber-800';
                  return 'bg-emerald-50 border-emerald-200 text-emerald-800';
                };

                const getBannerIcon = () => {
                  if (selectedClient.trafficLight === 'Red') return '🔴';
                  if (selectedClient.trafficLight === 'Yellow') return '🟡';
                  return '🟢';
                };

                const getBannerText = () => {
                  if (selectedClient.trafficLight === 'Red') return 'Advance Required • Work Blocked';
                  if (selectedClient.trafficLight === 'Yellow') return `${selectedClient.advanceRequired || 0}% Advance Received • Balance Pending Before Delivery`;
                  return 'Regular Client • Monthly Billing Allowed';
                };

                return (
                  <div className={`p-4 rounded-xl border-2 mb-4 ${getBannerStyle()}`}>
                    <h3 className="font-black text-lg mb-1 flex items-center gap-2">
                      <span>{getBannerIcon()}</span>
                      CLIENT PAYMENT STATUS: {selectedClient.trafficLight?.toUpperCase()}
                    </h3>
                    <p className="font-bold opacity-80 text-sm ml-8">{getBannerText()}</p>
                  </div>
                );
              })()}

              {/* Special Work Approval / Override (For Red Clients) */}
              {(() => {
                const selectedClient = clients.find(c => c.id === formData.clientId);
                if (selectedClient?.trafficLight === 'Red') {
                  const hasOverride = !!formData.paymentOverride;
                  return (
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 mb-4">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                        <span>{hasOverride ? '🔓' : '🔒'}</span> SPECIAL WORK APPROVAL
                      </h4>
                      {hasOverride ? (
                        <div className="text-sm">
                          <p className="text-emerald-700 font-bold mb-1">Override Approved. Work can proceed.</p>
                          <p className="text-gray-600"><span className="font-semibold">Reason:</span> {formData.paymentOverride?.reason}</p>
                          <p className="text-gray-500 text-xs mt-1">Approved by {formData.paymentOverride?.approvedBy} on {new Date(formData.paymentOverride?.approvedAt || '').toLocaleString()}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 font-semibold">Work normally blocked 👎</p>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Override Request Reason:</label>
                            <input 
                              type="text" 
                              value={overrideReason}
                              onChange={e => setOverrideReason(e.target.value)}
                              placeholder="e.g. Partner approved work, payment later."
                              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                              disabled={currentUserRole !== 'Admin'}
                            />
                          </div>
                          {currentUserRole === 'Admin' ? (
                            <button 
                              type="button"
                              disabled={!overrideReason.trim()}
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  paymentOverride: {
                                    reason: overrideReason,
                                    approvedBy: 'Admin (Partner)',
                                    approvedAt: new Date().toISOString()
                                  }
                                });
                              }}
                              className="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-gray-900 disabled:opacity-50 transition-colors"
                            >
                              Approve Override
                            </button>
                          ) : (
                            <p className="text-xs text-rose-500 font-bold">Only Admin/Partner can approve overrides.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Select Client & Team */}
              <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1">
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
                    value={formData.clientId}
                    onChange={val => setFormData({...formData, clientId: val, projectId: ''})}
                    options={clients.map(c => ({ value: c.id, label: c.company || c.name || c.contact || 'Client' }))}
                    placeholder="Select client by name..."
                    onCreateOption={(query) => {
                      setQuickClientName(query);
                      setIsQuickClientModalOpen(true);
                    }}
                    createOptionLabel="Add Client"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Select Project</label>
                  <SearchableSelect
                    value={formData.projectId}
                    onChange={val => setFormData({...formData, projectId: val})}
                    disabled={!formData.clientId}
                    options={[
                      { value: '', label: 'No specific project' },
                      ...(formData.clientId && clients.find(c => c.id === formData.clientId)?.projects?.map((p: any) => ({ value: p.name, label: p.name })) || [])
                    ]}
                    placeholder="Select project..."
                  />
                </div>
              </div>

              {/* Title & Product */}
              <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                      Assign Team {newJobType === 'Printing' && <span className="text-[10px] text-gray-400 font-medium normal-case">(Unassigned by default)</span>}
                    </label>
                    {formData.teamId && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, teamId: '' })}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Turn back to unassigned"
                      >
                        <X className="w-3 h-3" /> Unassign
                      </button>
                    )}
                  </div>
                  <SearchableSelect
                    value={formData.teamId}
                    onChange={val => setFormData({...formData, teamId: val})}
                    options={[
                      { value: '', label: 'Unassigned (None)' },
                      ...staff
                        .filter(s => (s.role !== 'Admin' && s.role !== 'Manager') || s.id === formData.teamId)
                        .map(s => ({ value: s.id, label: `${s.name} (${s.role || 'Staff'})` }))
                    ]}
                    placeholder="Unassigned (None)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Job Title <span className="text-rose-500">*</span></label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Product</label>
                    <button
                      type="button"
                      onClick={() => { setQuickProductName(''); setIsQuickProductModalOpen(true); }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-600" /> Add Product
                    </button>
                  </div>
                  <SearchableSelect
                    value={formData.productId}
                    onChange={val => {
                      const selectedProd = products.find(p => p.id === val);
                      const autoPrice = (!isEmployee && selectedProd && selectedProd.price !== undefined && selectedProd.price !== null && selectedProd.price !== '') 
                        ? String(selectedProd.price) 
                        : (isEmployee ? '' : formData.totalAmount);
                      const autoTime = (selectedProd && selectedProd.estimatedTime !== undefined && selectedProd.estimatedTime !== null && selectedProd.estimatedTime !== '')
                        ? String(selectedProd.estimatedTime)
                        : formData.estimatedTime;
                      const autoTimeUnit = (selectedProd && selectedProd.estimatedTimeUnit)
                        ? selectedProd.estimatedTimeUnit
                        : formData.estimatedTimeUnit;

                      setFormData(prev => ({
                        ...prev,
                        productId: val,
                        totalAmount: autoPrice,
                        estimatedTime: autoTime,
                        estimatedTimeUnit: autoTimeUnit
                      }));
                    }}
                    options={[
                      { value: '', label: `Search ${newJobType === 'Des+Print' ? '' : newJobType + ' '}products...` },
                      ...products
                        .filter(p => {
                          if (newJobType === 'Des+Print') return true;
                          if (newJobType === 'Designing') return p.type === 'Designing';
                          if (newJobType === 'Printing')  return p.type === 'Printing';
                          return true;
                        })
                        .map(p => {
                          let labelStr = p.name;
                          const priceStr = (!isEmployee && p.price !== undefined && p.price !== null && p.price !== '') ? `₹${Number(p.price).toLocaleString('en-IN')}` : '';
                          const timeStr = p.estimatedTime ? `${p.estimatedTime} ${p.estimatedTimeUnit || 'Hours'}` : '';
                          const meta = [priceStr, timeStr].filter(Boolean).join(' • ');
                          if (meta) labelStr += ` (${meta})`;
                          return { value: p.id, label: labelStr };
                        })
                    ]}
                    placeholder={`Search ${newJobType === 'Des+Print' ? '' : newJobType + ' '}products...`}
                    onCreateOption={(query) => {
                      setQuickProductName(query);
                      setIsQuickProductModalOpen(true);
                    }}
                    createOptionLabel="Add Product"
                  />
                </div>
              </div>

              {/* Est. Timeline & Delay Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Approx. Timeline</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="1" 
                      placeholder="e.g. 4" 
                      value={formData.estimatedTime} 
                      onChange={e => setFormData({...formData, estimatedTime: e.target.value})} 
                      className="w-1/2 px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" 
                    />
                    <select 
                      value={formData.estimatedTimeUnit} 
                      onChange={e => setFormData({...formData, estimatedTimeUnit: e.target.value})} 
                      className="w-1/2 px-2 py-2 bg-white/50 border border-white/60 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="Minutes">Minutes</option>
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Delay Reason (If Exceeded)</label>
                  <input 
                    type="text" 
                    placeholder="Reason why timeline exceeded..." 
                    value={formData.delayReason} 
                    onChange={e => setFormData({...formData, delayReason: e.target.value})} 
                    className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" 
                  />
                </div>
              </div>



              {/* Printer & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 gap-4">
                {newJobType !== 'Designing' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Printer / Vendor</label>
                    <SearchableSelect
                      value={formData.printerId}
                      onChange={val => setFormData({...formData, printerId: val})}
                      options={[
                        { value: '', label: 'Select Printer' },
                        ...vendors.map(v => ({ value: v.id, label: v.name }))
                      ]}
                      placeholder="Select printer vendor..."
                    />
                  </div>
                )}
                <div className={newJobType === 'Designing' ? 'col-span-2' : ''}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Deadline</label>
                    <span className="text-[10px] text-gray-400 font-medium">Type e.g. <span className="text-primary font-bold">15/10</span> (Year auto-fills)</span>
                  </div>
                  <SmartDatePicker 
                    id="job-deadline-picker"
                    value={formData.dueDate} 
                    onChange={val => setFormData({...formData, dueDate: val})} 
                    placeholder="e.g. 15/10 (Year auto-fills)"
                    disablePastDates={true}
                    showShortcuts={true}
                  />
                </div>
              </div>

              {/* Vendor Email Checkbox (Printing or Design + Print Jobs only) */}
              {newJobType !== 'Designing' && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={formData.vendorEmailSent}
                        onChange={(e) => setFormData({...formData, vendorEmailSent: e.target.checked})}
                      />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${formData.vendorEmailSent ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.vendorEmailSent ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-500" /> Required Documents Sent to Vendor
                    </span>
                  </label>
                </div>
              )}

              {/* Amounts */}
              {!isEmployee && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Total Amount (₹)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={formData.totalAmount} 
                      onChange={e => setFormData({...formData, totalAmount: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Paid Amount (₹)</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={formData.paidAmount} 
                      onChange={e => setFormData({...formData, paidAmount: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-emerald-700 font-bold" 
                    />
                  </div>
                </div>
              )}

              {/* Work Deliverables / Completion Link */}
              <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/60">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <Link className="w-3.5 h-3.5 text-primary" /> Work Output Link
                  </label>
                  <input type="url" value={formData.workLink} onChange={e => setFormData({...formData, workLink: e.target.value})} placeholder="https://drive.google.com/..." className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <Folder className="w-3.5 h-3.5 text-emerald-600" /> Storage Location / Notes
                  </label>
                  <input type="text" value={formData.workLocation} onChange={e => setFormData({...formData, workLocation: e.target.value})} placeholder="Server/Print_Ready/..." className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/40">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary text-white text-sm font-bold rounded-xl shadow-sm transition-all">
                  {editingJobId ? 'Save Changes' : 'Save Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Completion Popup Modal */}
      {completionModalJobId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setCompletionModalJobId(null)}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 bg-white/95">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-emerald-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <div>
                  <h2 className="text-base font-bold text-gray-800">Job Completion Deliverable Details</h2>
                  <p className="text-xs text-gray-500">Provide the link to the finished work or local storage location.</p>
                </div>
              </div>
              <button onClick={() => setCompletionModalJobId(null)} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompletionModal} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2">
                <span>⚠️</span> At least 1 of the 2 fields below is compulsory to complete the job.
              </div>

              {/* Des+Print auto-Printing job notice */}
              {(() => {
                if (!completionModalJobId) return null;
                const job = jobs.find(j => j.id === completionModalJobId);
                if (!job || job.type !== 'Designing' || !job.projectId) return null;
                const client = clients.find((c: any) => c.id === job.clientId);
                const project = client?.projects?.find((p: any) => p.name === job.projectId);
                if (!project || project.category !== 'Des+Print') return null;
                const printingJobExists = jobs.some(
                  j => j.projectId === job.projectId && j.clientId === job.clientId && j.type === 'Printing'
                );
                if (printingJobExists) return null;
                return (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-800 font-semibold flex items-start gap-2">
                    <span className="text-base leading-none mt-0.5">🖨️</span>
                    <div>
                      <p className="font-bold text-purple-900">Des+Print Project Detected</p>
                      <p className="font-normal mt-0.5 text-purple-700">Once this Designing job is marked complete, a <strong>Printing job</strong> will be automatically created for the project <span className="font-bold">"{job.projectId}"</span>.</p>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-primary" /> Work Output / Delivery Link (URL)
                </label>
                <input 
                  type="url" 
                  value={completionWorkLink}
                  onChange={e => setCompletionWorkLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/... or https://figma.com/..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800"
                />
                <p className="text-[11px] text-gray-400 mt-1">Google Drive, Dropbox, Canva, Figma link, or client preview URL.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-emerald-600" /> Work Location / Completion Notes
                </label>
                <input 
                  type="text" 
                  value={completionWorkLocation}
                  onChange={e => setCompletionWorkLocation(e.target.value)}
                  placeholder="e.g. Server/Print_Ready/Brochure_v2.pdf or Handed to client"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800"
                />
                <p className="text-[11px] text-gray-400 mt-1">Local server path, storage folder, or physical delivery notes.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setCompletionModalJobId(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!completionWorkLink.trim() && !completionWorkLocation.trim()}
                  className={`px-6 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                    !completionWorkLink.trim() && !completionWorkLocation.trim()
                      ? 'bg-gray-300 cursor-not-allowed opacity-70'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" /> Save & Mark Completed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delay Reason Modal */}
      {delayModalJob && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDelayModalJob(null)}></div>
          <div className="relative bg-white shadow-2xl rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-rose-50/50">
              <h2 className="text-lg font-black text-rose-800 flex items-center gap-2">
                <span>⚠️</span> Timeline Exceeded — Explanation Required
              </h2>
              <button onClick={() => setDelayModalJob(null)} className="p-1 text-gray-400 hover:text-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDelayReason} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs space-y-1">
                <p className="font-bold text-amber-900 text-sm">{delayModalJob.title}</p>
                <p className="text-amber-800">
                  <span className="font-bold">Assigned Staff:</span> {getStaffName(delayModalJob.teamId)}
                </p>
                <p className="text-amber-800">
                  <span className="font-bold">Estimated Timeline:</span> {delayModalJob.estimatedTime} {delayModalJob.estimatedTimeUnit || 'Hours'}
                </p>
                <p className="text-rose-700 font-bold">
                  <span className="font-bold">Tracked Work Time:</span> {formatTime(delayModalJob.trackedTime || 0)} (Exceeded)
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
                  Reason for Timeline Delay <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  required 
                  rows={3} 
                  placeholder="Employee / Staff note explaining why work took longer than expected..." 
                  value={delayReasonInput} 
                  onChange={e => setDelayReasonInput(e.target.value)} 
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setDelayModalJob(null)} className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded-xl text-sm">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors">
                  Save Explanation
                </button>
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
          setFormData(prev => ({ ...prev, clientId: newClient.id, projectId: '' }));
          setIsQuickClientModalOpen(false);
        }}
      />
      {/* Quick Add Product Modal */}
      <QuickAddProductModal
        isOpen={isQuickProductModalOpen}
        onClose={() => setIsQuickProductModalOpen(false)}
        initialName={quickProductName}
        initialType={newJobType === 'Des+Print' ? 'Designing' : newJobType}
        onProductCreated={(newProd) => {
          const autoPrice = (!isEmployee && newProd && newProd.price !== undefined && newProd.price !== null && newProd.price !== '') ? String(newProd.price) : (isEmployee ? '' : formData.totalAmount);
          const autoTime = (newProd && (newProd.estimated_time || newProd.estimatedTime)) ? String(newProd.estimated_time || newProd.estimatedTime) : formData.estimatedTime;
          const autoTimeUnit = (newProd && (newProd.estimated_time_unit || newProd.estimatedTimeUnit)) ? (newProd.estimated_time_unit || newProd.estimatedTimeUnit) : formData.estimatedTimeUnit;
          
          setFormData(prev => ({
            ...prev,
            productId: newProd.id,
            totalAmount: autoPrice,
            estimatedTime: autoTime,
            estimatedTimeUnit: autoTimeUnit
          }));
          setIsQuickProductModalOpen(false);
        }}
      />
      {/* View-Only Job Details Modal */}
      {viewOnlyJob && (
        <JobDetailsModal
          job={viewOnlyJob}
          onClose={() => setViewOnlyJob(null)}
        />
      )}
    </div>
  );
}
