import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, FileText, Download, Trash2, Calendar, FileCheck, CheckCircle, FilterX , ChevronDown } from 'lucide-react';
import { useData } from '../context/DataContext';
import { SearchableSelect } from './SearchableSelect';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { QuickAddClientModal } from './QuickAddClientModal';

export function InvoicesPage() {
  const { invoices, addInvoice, updateInvoice, deleteInvoice, clients, jobs, activeFilterIntent, setActiveFilterIntent, currentUserRole, hasPermission } = useData();
  const canCreateEditInvoices = hasPermission(currentUserRole, 'Create/Edit Invoices');
  const canDeleteInvoices = hasPermission(currentUserRole, 'Delete Invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterClient, setFilterClient] = useState('All');

  // Quick Add Client Modal State
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatus('All');
    setFilterClient('All');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreviewInvoice, setSelectedPreviewInvoice] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<{ id: string; description: string; quantity: number; rate: number }[]>([]);
  
  useEffect(() => {
    if (activeFilterIntent && activeFilterIntent.page === 'invoices') {
      const { filterKey, filterValue, jobId } = activeFilterIntent;
      if (filterKey === 'status') {
        setFilterStatus(filterValue);
      } else if (filterKey === 'openJobInvoice') {
        const targetJobId = jobId || filterValue;
        const matchedInvoice = invoices.find(inv => inv.jobIds && inv.jobIds.includes(targetJobId));
        if (matchedInvoice) {
          setSelectedPreviewInvoice(matchedInvoice);
        } else {
          const targetJob = jobs.find(j => j.id === targetJobId);
          if (targetJob) {
            setSelectedClientId(targetJob.clientId);
            setSelectedJobIds([targetJob.id]);
            setFormData({
              issueDate: new Date().toISOString().split('T')[0],
              dueDate: '',
              taxRate: '18',
              invoiceType: 'Tax',
            });
            setIsModalOpen(true);
          }
        }
      }
      
      setActiveFilterIntent(null);
    }
  }, [activeFilterIntent, invoices, jobs, setActiveFilterIntent]);

  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    taxRate: '18',
    invoiceType: 'Tax',
  });

  const handleAddCustomItem = () => {
    setCustomItems(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), description: '', quantity: 1, rate: 0 }
    ]);
  };

  const handleUpdateCustomItem = (id: string, field: 'description' | 'quantity' | 'rate', value: any) => {
    setCustomItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== id));
  };

  // Calculate totals
  const totalOutstanding = useMemo(() => {
    return invoices.filter(i => i.status !== 'Paid').reduce((sum, inv) => sum + inv.total, 0);
  }, [invoices]);

  const totalOverdue = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices.filter(i => i.status !== 'Paid' && i.dueDate < today).reduce((sum, inv) => sum + inv.total, 0);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const sLower = searchTerm.toLowerCase();
      const clientName = clients.find(c => c.id === inv.clientId)?.company || '';
      const matchSearch = inv.invoiceNumber.toLowerCase().includes(sLower) ||
                          inv.status.toLowerCase().includes(sLower) ||
                          clientName.toLowerCase().includes(sLower) ||
                          (inv.total && inv.total.toString().includes(sLower)) ||
                          (inv.issueDate && inv.issueDate.includes(sLower)) ||
                          (inv.dueDate && inv.dueDate.includes(sLower));
      const matchStatus = filterStatus === 'All' || inv.status === filterStatus;
      const matchClient = filterClient === 'All' || inv.clientId === filterClient;
      
      const matchDateFrom = !filterDateFrom || (inv.issueDate && new Date(inv.issueDate) >= new Date(filterDateFrom));
      const matchDateTo = !filterDateTo || (inv.issueDate && new Date(inv.issueDate) <= new Date(filterDateTo));
      
      return matchSearch && matchStatus && matchClient && matchDateFrom && matchDateTo;
    });
  }, [invoices, searchTerm, filterStatus, filterClient, filterDateFrom, filterDateTo]);

  // Derived calculations for the modal
  const availableJobs = useMemo(() => {
    if (!selectedClientId) return [];
    return jobs.filter(j => j.clientId === selectedClientId && j.paymentStatus !== 'Paid');
  }, [selectedClientId, jobs]);

  const modalSubtotal = useMemo(() => {
    const jobsSum = selectedJobIds.reduce((sum, jobId) => {
      const job = jobs.find(j => j.id === jobId);
      return sum + (job ? (job.totalAmount - (job.paidAmount || 0)) : 0);
    }, 0);

    const customSum = customItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return sum + (qty * rate);
    }, 0);

    return jobsSum + customSum;
  }, [selectedJobIds, jobs, customItems]);

  const modalTax = useMemo(() => {
    if (formData.invoiceType === 'Retail') return 0;
    return (modalSubtotal * parseFloat(formData.taxRate || '0')) / 100;
  }, [modalSubtotal, formData.taxRate, formData.invoiceType]);

  const modalTotal = modalSubtotal + modalTax;

  const handleOpenModal = () => {
    setSelectedClientId('');
    setSelectedJobIds([]);
    setCustomItems([]);
    setFormData({
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      taxRate: '18',
      invoiceType: 'Tax',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const toggleJobSelection = (jobId: string) => {
    setSelectedJobIds(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId) {
      alert("Please select a client.");
      return;
    }

    if (selectedJobIds.length === 0 && customItems.length === 0) {
      alert("Please select at least one job or add a custom item to invoice.");
      return;
    }

    for (const item of customItems) {
      if (!item.description.trim()) {
        alert("Please provide a description for all custom items.");
        return;
      }
    }

    const jobInvoiceItems = selectedJobIds.map(jobId => {
      const job = jobs.find(j => j.id === jobId);
      const amt = job ? (job.totalAmount - (job.paidAmount || 0)) : 0;
      return {
        id: jobId,
        description: job ? job.title : 'Job Item',
        quantity: 1,
        rate: amt,
        amount: amt,
        isJob: true,
        jobId
      };
    });

    const customInvoiceItems = customItems.map(item => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      return {
        id: item.id,
        description: item.description.trim(),
        quantity: qty,
        rate: rate,
        amount: qty * rate,
        isJob: false
      };
    });

    const allItems = [...jobInvoiceItems, ...customInvoiceItems];

    const newInvoiceNumber = `INV-${(invoices.length + 1).toString().padStart(3, '0')}`;

    const newInvoice = {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: newInvoiceNumber,
      clientId: selectedClientId,
      jobIds: selectedJobIds,
      items: allItems,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      subtotal: modalSubtotal,
      tax: modalTax,
      total: modalTotal,
      status: 'Sent',
      invoiceType: formData.invoiceType,
      taxRate: formData.taxRate
    };

    addInvoice({
      ...newInvoice,
      invoice_number: newInvoice.invoiceNumber,
      client_id: newInvoice.clientId,
      job_ids: newInvoice.jobIds,
      custom_items: newInvoice.items
    });
    setIsModalOpen(false);
  };

  const updateInvoiceStatus = (id: string, status: string) => {
    updateInvoice(id, { status });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoice(id);
    }
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.company || 'Unknown Client';

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Invoices</h1>
        </div>
        <div className="flex items-center gap-3">
          {canCreateEditInvoices && (
            <button 
              onClick={handleOpenModal}
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Invoice
            </button>
          )}
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="glass-panel p-5 rounded-[1.5rem] border border-white/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Total Outstanding</p>
            <h3 className="text-3xl font-bold text-gray-800">₹{totalOutstanding.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <FileText className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="glass-panel p-5 rounded-[1.5rem] border border-white/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-500 mb-1">Overdue Amount</p>
            <h3 className="text-3xl font-bold text-rose-600">₹{totalOverdue.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100">
            <Calendar className="w-6 h-6 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md overflow-hidden">
        <button onClick={() => setShowFilters(f => !f)} className="w-full flex items-center justify-between p-4 hover:bg-white/20 transition-colors cursor-pointer select-none">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Invoices
          </h3>
          <div className="flex items-center gap-4">
            {(searchTerm !== '' || filterStatus !== 'All' || filterClient !== 'All' || filterDateFrom !== '' || filterDateTo !== '') && (
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
                { value: 'All', label: 'All Status' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Sent', label: 'Sent' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Overdue', label: 'Overdue' }
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Client</label>
            <SearchableSelect
              value={filterClient}
              onChange={setFilterClient}
              options={[
                { value: 'All', label: 'All Clients' },
                ...clients.map(c => ({ value: c.id, label: c.company }))
              ]}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Issue Date From</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Issue Date To</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
          </div>
        </div>
        
        <div className="mt-3 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by invoice number..." 
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
                <th className="py-4 px-6 w-32">Invoice Number</th>
                <th className="py-4 px-6">Client</th>
                <th className="py-4 px-6 text-right">Amount (₹)</th>
                <th className="py-4 px-6">Issue Date</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice, index) => (
                  <tr key={invoice.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 font-bold text-gray-400">{index + 1}</td>
                    <td className="py-4 px-6">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedPreviewInvoice(invoice); }} className="font-bold text-primary text-sm hover:underline hover:text-primary/80 text-left">{invoice.invoiceNumber}</button>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-gray-700">{getClientName(invoice.clientId)}</span>
                      <div className="text-[10px] text-gray-500 mt-0.5">{invoice.jobIds?.length || 0} jobs linked</div>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-gray-800">
                      {invoice.total.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {invoice.issueDate}
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {invoice.dueDate}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <select
                        value={invoice.status}
                        onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide focus:outline-none cursor-pointer appearance-none relative text-center ${
                          invoice.status === 'Draft' ? 'bg-gray-100 text-gray-600 border-gray-200' : 
                          invoice.status === 'Sent' ? 'bg-primary/10 text-primary border-primary' : 
                          invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          'bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                        style={{ paddingRight: '1.25rem', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23000000%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .3rem top 50%', backgroundSize: '.55rem auto' }}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {invoice.status !== 'Paid' && (
                          <button 
                            onClick={() => updateInvoiceStatus(invoice.id, 'Paid')}
                            className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
                            title="Mark as Paid"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/10 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        {canDeleteInvoices && (
                          <button 
                            onClick={() => handleDelete(invoice.id)}
                            className="w-6 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            title="Delete Invoice"
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
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileCheck className="w-12 h-12 text-gray-300 mb-4" />
                      <p>No invoices found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={handleCloseModal}></div>
          <div className="relative glass-panel border-l border-white/60 shadow-2xl w-full max-w-xl h-full overflow-hidden animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800">Create Invoice</h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveInvoice} className="flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4">

                {/* Invoice Type Toggle */}
                <div className="mb-2 flex gap-6 p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="invoiceType" value="Tax" checked={formData.invoiceType === 'Tax'} onChange={() => setFormData({...formData, invoiceType: 'Tax'})} className="w-4 h-4 text-primary focus:ring-primary/50" />
                    <span className="text-sm font-bold text-gray-700">Tax Invoice</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="invoiceType" value="Retail" checked={formData.invoiceType === 'Retail'} onChange={() => setFormData({...formData, invoiceType: 'Retail'})} className="w-4 h-4 text-primary focus:ring-primary/50" />
                    <span className="text-sm font-bold text-gray-700">Retail Invoice</span>
                  </label>
                </div>

                {/* Select Client */}
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
                    options={clients.map(c => ({ value: c.id, label: c.company }))}
                    placeholder="Select client..."
                    onCreateOption={(query) => {
                      setQuickClientName(query);
                      setIsQuickClientModalOpen(true);
                    }}
                    createOptionLabel="Add Client"
                  />
                </div>

                {/* Job Selection */}
                {selectedClientId && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-200">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Select Unpaid Jobs</span>
                    </div>
                    <div className="p-2 max-h-48 overflow-y-auto bg-white/40">
                      {availableJobs.length > 0 ? (
                        <div className="space-y-1">
                          {availableJobs.map(job => (
                            <label key={job.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                              selectedJobIds.includes(job.id) ? 'bg-primary/10 border-primary' : 'bg-white border-transparent hover:bg-gray-50/50'
                            }`}>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  checked={selectedJobIds.includes(job.id)}
                                  onChange={() => toggleJobSelection(job.id)}
                                  className="w-4 h-4 rounded text-primary focus:ring-primary/50"
                                />
                                <div>
                                  <p className="text-sm font-bold text-gray-800">{job.title}</p>
                                  <p className="text-xs text-gray-500">{job.type}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-800">₹{job.totalAmount - job.paidAmount}</p>
                                <p className="text-[10px] text-gray-500 uppercase">Balance</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No unpaid jobs found for this client.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Invoice Items */}
                {selectedClientId && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white/40">
                    <div className="bg-gray-50/80 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Custom Items (Optional)</span>
                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-indigo-600" /> Add Custom Item
                      </button>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      {customItems.length > 0 ? (
                        customItems.map((item) => {
                          const itemAmt = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                          return (
                            <div key={item.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 shadow-2xs">
                              <input
                                type="text"
                                placeholder="Item Description (e.g. Logo Design, Consultation)"
                                value={item.description}
                                onChange={e => handleUpdateCustomItem(item.id, 'description', e.target.value)}
                                className="flex-1 text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-gray-800"
                              />
                              <input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={e => handleUpdateCustomItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 text-xs px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-gray-800 text-center"
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="Rate (₹)"
                                value={item.rate || ''}
                                onChange={e => handleUpdateCustomItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                className="w-24 text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-gray-800 text-right"
                              />
                              <div className="w-24 text-right">
                                <span className="text-xs font-bold text-gray-800">₹{itemAmt.toLocaleString('en-IN')}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomItem(item.id)}
                                className="text-gray-400 hover:text-rose-500 p-1 transition-colors"
                                title="Remove Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-2 text-center text-xs text-gray-400">
                          No custom items added. Click "+ Add Custom Item" to add non-project charges.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates & Tax */}
                <div className={`grid gap-4 ${formData.invoiceType === 'Tax' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Issue Date <span className="text-rose-500">*</span></label>
                    <input type="date" required value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Due Date</label>
                    <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" />
                  </div>
                  {formData.invoiceType === 'Tax' && (
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Tax Rate (%)</label>
                      <select value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Summary Totals */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Subtotal</span>
                    <span className="text-gray-800 font-bold">₹{modalSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Tax ({formData.taxRate}%)</span>
                    <span className="text-gray-800 font-bold">₹{modalTax.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-gray-200 my-1"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-800 font-bold text-base">Total Amount</span>
                    <span className="text-primary font-bold text-xl">₹{modalTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex justify-end gap-3 border-t border-white/40 bg-white/30 flex-shrink-0">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {selectedPreviewInvoice && (
        <InvoicePreviewModal 
          invoice={selectedPreviewInvoice} 
          onClose={() => setSelectedPreviewInvoice(null)} 
        />
      )}

      {/* Quick Add Client Modal */}
      <QuickAddClientModal
        isOpen={isQuickClientModalOpen}
        onClose={() => setIsQuickClientModalOpen(false)}
        initialName={quickClientName}
        onClientCreated={(newClient) => {
          setSelectedClientId(newClient.id);
          setIsQuickClientModalOpen(false);
        }}
      />
    </div>
  );
}
