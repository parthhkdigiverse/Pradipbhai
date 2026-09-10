import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, X, FileText, Download, Trash2, Calendar, FileCheck, CheckCircle, FilterX } from 'lucide-react';
import { useData } from '../context/DataContext';
import { numberToWords } from '../utils/numberToWords';

export function InvoicesPage() {
  const { invoices, setInvoices, clients, jobs, activeFilterIntent, setActiveFilterIntent } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterClient, setFilterClient] = useState('All');

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
  
  useEffect(() => {
    if (activeFilterIntent && activeFilterIntent.page === 'invoices') {
      const { filterKey, filterValue } = activeFilterIntent;
      if (filterKey === 'status') setFilterStatus(filterValue);
      
      setActiveFilterIntent(null);
    }
  }, [activeFilterIntent, setActiveFilterIntent]);

  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    taxRate: '18',
    invoiceType: 'Tax',
  });

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
      const matchSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
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
    return selectedJobIds.reduce((sum, jobId) => {
      const job = jobs.find(j => j.id === jobId);
      return sum + (job ? (job.totalAmount - job.paidAmount) : 0);
    }, 0);
  }, [selectedJobIds, jobs]);

  const modalTax = useMemo(() => {
    if (formData.invoiceType === 'Retail') return 0;
    return (modalSubtotal * parseFloat(formData.taxRate || '0')) / 100;
  }, [modalSubtotal, formData.taxRate, formData.invoiceType]);

  const modalTotal = modalSubtotal + modalTax;

  const handleOpenModal = () => {
    setSelectedClientId('');
    setSelectedJobIds([]);
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
    
    if (selectedJobIds.length === 0) {
      alert("Please select at least one job to invoice.");
      return;
    }

    // Generate Invoice Number (e.g., INV-003)
    const newInvoiceNumber = `INV-${(invoices.length + 1).toString().padStart(3, '0')}`;

    const newInvoice = {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: newInvoiceNumber,
      clientId: selectedClientId,
      jobIds: selectedJobIds,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      subtotal: modalSubtotal,
      tax: modalTax,
      total: modalTotal,
      status: 'Sent',
      invoiceType: formData.invoiceType,
      taxRate: formData.taxRate
    };

    setInvoices(prev => [newInvoice, ...prev]);
    handleCloseModal();
  };

  const updateInvoiceStatus = (id: string, status: string) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    
    if (status === 'Paid') {
      // Find jobs associated with this invoice and mark them as Paid
      const invoice = invoices.find(i => i.id === id);
      if (invoice && invoice.jobIds) {
        // We're mutating jobs state here via setJobs
        // A cleaner way in a real app would be dispatching an action, but this works for demo
        // invoice.jobIds.forEach(jobId => {
        //   // You could call an exposed updateJobPaymentStatus here if you had one in context
        //   // For now, it just marks the invoice as Paid
        // });
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      setInvoices(prev => prev.filter(inv => inv.id !== id));
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
          <button 
            onClick={handleOpenModal}
            className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
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
      <div className="glass-panel border border-white/60 rounded-[1.5rem] shadow-sm p-4 mb-6 flex-shrink-0 bg-white/40 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <FilterX className="w-4 h-4 text-gray-500" />
            Filter Invoices
          </h3>
          <div className="flex items-center gap-4">
            {(searchTerm !== '' || filterStatus !== 'All' || filterClient !== 'All' || filterDateFrom !== '' || filterDateTo !== '') && (
              <button 
                onClick={resetFilters}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Client</label>
            <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="w-full px-2 py-1.5 bg-white/60 border border-white/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
              <option value="All">All Clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
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
                        <button 
                          onClick={() => handleDelete(invoice.id)}
                          className="w-6 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Select Client <span className="text-rose-500">*</span></label>
                  <select required value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800">
                    <option value="" disabled>Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
                  </select>
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
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedPreviewInvoice(null)}></div>
          
          <div className="relative bg-white shadow-2xl w-full max-w-4xl h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 sticky top-0 z-10 print:hidden">
              <h2 className="text-lg font-bold text-gray-800">Invoice Preview</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => window.print()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center gap-2 transition-all shadow-sm">
                  <FileText className="w-4 h-4" /> Print / Save PDF
                </button>
                <button onClick={() => setSelectedPreviewInvoice(null)} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Document Area */}
            <div className="p-8 bg-gray-100 flex-1 overflow-y-auto flex justify-center print:p-0 print:bg-white print:overflow-visible">
              <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-md border border-gray-300 text-black font-sans print:shadow-none print:border-none print:m-0 print:p-0 flex flex-col relative text-[11px] leading-tight">
                {/* PDF Replica Content */}
                
                {/* Header */}
                <div className="flex justify-between items-start p-[10mm] pb-4">
                  <div className="max-w-[60%]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-black rounded-tl-full rounded-bl-full flex items-center justify-center">
                         <span className="text-white text-[10px] font-bold">A</span>
                      </div>
                      <h1 className="text-4xl font-light tracking-widest text-black">ALPHA</h1>
                    </div>
                    <div className="text-[10px] tracking-[0.3em] font-bold ml-10 mb-2 border-b border-black/20 pb-2">C R E A T I V E  H U B</div>
                    <p className="font-serif italic text-sm text-gray-700 ml-2">We Design Your Dreams...!!</p>
                    <p className="font-bold text-xs ml-2 mt-1">SURAT • JUNAGADH</p>
                  </div>
                  <div className="text-right text-[10px] space-y-1">
                    <p>E-mail: contact@alphacreativehub.com</p>
                    <p>Web : www.alphacreativehub.com</p>
                    <p className="mt-2 text-[11px]">220, Royal Arcade, Sarthana Jakat Naka,</p>
                    <p className="text-[11px]">Nana Varachha, Surat, Gujarat - 395006.</p>
                    <p className="text-[11px]">+91 99133 07898</p>
                    <p className="font-bold text-[12px] mt-2">GSTIN. 24BOWPR5356F1ZD</p>
                  </div>
                </div>

                {/* Title */}
                <div className="border-t border-black px-[10mm] py-3 text-right">
                  <h2 className="text-3xl font-normal tracking-wider">{selectedPreviewInvoice.invoiceType === 'Retail' ? 'RETAIL INVOICE' : 'TAX INVOICE'}</h2>
                </div>

                {/* Details Grid */}
                <div className="border-t border-black grid grid-cols-2 divide-x divide-black">
                  <div className="p-2 space-y-1">
                    <div className="flex"><span className="w-24">Invoice No.</span><span className="font-bold">: {selectedPreviewInvoice.invoiceNumber}</span></div>
                    <div className="flex"><span className="w-24">Invoice Date</span><span className="font-bold">: {selectedPreviewInvoice.issueDate}</span></div>
                    <div className="flex"><span className="w-24">Terms</span><span className="font-bold">: Due on Receipt</span></div>
                    <div className="flex"><span className="w-24">Due Date</span><span className="font-bold">: {selectedPreviewInvoice.dueDate}</span></div>
                    {selectedPreviewInvoice.invoiceType === 'Retail' && <div className="flex"><span className="w-24">P.O.#</span><span className="font-bold">: {getClientName(selectedPreviewInvoice.clientId)}</span></div>}
                  </div>
                  <div className="p-2">
                    <div className="flex"><span className="w-32">Place Of Supply</span><span className="font-bold">: Gujarat (24)</span></div>
                  </div>
                </div>

                {/* Bill To */}
                <div className="border-t border-black">
                  <div className="bg-gray-100/50 p-1 px-2 border-b border-black font-bold">Bill To</div>
                  <div className="p-2 h-24">
                    <p className="font-bold text-[12px] uppercase">{getClientName(selectedPreviewInvoice.clientId)}</p>
                    <p className="text-gray-600 mt-1">Surat</p>
                    <p className="text-gray-600">Gujarat, India</p>
                  </div>
                </div>

                {/* Table */}
                <div className="border-t border-black flex-1 flex flex-col min-h-[300px]">
                  <table className="w-full text-left border-collapse h-full">
                    <thead>
                      <tr className="border-b border-black bg-gray-100/50">
                        <th className="p-2 border-r border-black w-8 text-center font-bold">#</th>
                        <th className="p-2 border-r border-black font-bold">Item & Description</th>
                        {selectedPreviewInvoice.invoiceType !== 'Retail' && <th className="p-2 border-r border-black w-20 text-center font-bold">HSN/SAC</th>}
                        <th className="p-2 border-r border-black w-16 text-right font-bold">Qty</th>
                        <th className="p-2 border-r border-black w-20 text-right font-bold">Rate</th>
                        {selectedPreviewInvoice.invoiceType !== 'Retail' && (
                          <>
                            <th className="p-0 border-r border-black w-32 text-center font-bold">
                              <div className="border-b border-black p-1">CGST</div>
                              <div className="flex divide-x divide-black"><div className="w-1/2 p-1">%</div><div className="w-1/2 p-1">Amt</div></div>
                            </th>
                            <th className="p-0 border-r border-black w-32 text-center font-bold">
                              <div className="border-b border-black p-1">SGST</div>
                              <div className="flex divide-x divide-black"><div className="w-1/2 p-1">%</div><div className="w-1/2 p-1">Amt</div></div>
                            </th>
                          </>
                        )}
                        <th className="p-2 w-24 text-right font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="align-top">
                      {(selectedPreviewInvoice.items || (selectedPreviewInvoice.jobIds || []).map((jobId: string) => {
                        const job = jobs.find(j => j.id === jobId);
                        return {
                          id: jobId,
                          description: job ? job.title : 'Unknown Job',
                          quantity: 1,
                          rate: job ? (job.totalAmount - job.paidAmount) : 0,
                          amount: job ? (job.totalAmount - job.paidAmount) : 0
                        };
                      })).map((item: any, idx: number) => {
                        const taxRate = parseFloat(selectedPreviewInvoice.taxRate || '0');
                        const halfTax = taxRate / 2;
                        const taxAmt = (item.amount * taxRate) / 200;
                        return (
                          <tr key={item.id}>
                            <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                            <td className="p-2 border-r border-black">
                              <span className="font-bold">{selectedPreviewInvoice.invoiceType === 'Retail' ? 'DESIGN CHARGE' : item.description}</span>
                              {selectedPreviewInvoice.invoiceType === 'Retail' && <div className="mt-1">{item.description}</div>}
                            </td>
                            {selectedPreviewInvoice.invoiceType !== 'Retail' && <td className="p-2 border-r border-black text-center">998391</td>}
                            <td className="p-2 border-r border-black text-right">{item.quantity}.00<br/>pcs</td>
                            <td className="p-2 border-r border-black text-right">{item.rate.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            {selectedPreviewInvoice.invoiceType !== 'Retail' && (
                              <>
                                <td className="p-0 border-r border-black">
                                  <div className="flex h-full divide-x divide-black"><div className="w-1/2 p-2 text-right">{halfTax}%</div><div className="w-1/2 p-2 text-right">{taxAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>
                                </td>
                                <td className="p-0 border-r border-black">
                                  <div className="flex h-full divide-x divide-black"><div className="w-1/2 p-2 text-right">{halfTax}%</div><div className="w-1/2 p-2 text-right">{taxAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>
                                </td>
                              </>
                            )}
                            <td className="p-2 text-right">{item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          </tr>
                        );
                      })}
                      {/* Empty row to fill space */}
                      <tr className="h-full">
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        {selectedPreviewInvoice.invoiceType !== 'Retail' && <td className="border-r border-black"></td>}
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        {selectedPreviewInvoice.invoiceType !== 'Retail' && <td className="border-r border-black"></td>}
                        {selectedPreviewInvoice.invoiceType !== 'Retail' && <td className="border-r border-black"></td>}
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="border-t border-black flex">
                  <div className="w-[60%] p-2 border-r border-black border-b">
                    <p>Total In Words</p>
                    <p className="font-bold italic">Indian Rupee {numberToWords(selectedPreviewInvoice.total)}</p>
                    
                    <div className="mt-4">
                      <p>Notes</p>
                      {selectedPreviewInvoice.invoiceType !== 'Retail' && <p>MSME NO. UDYAM-GJ-22-0380045</p>}
                      <p>Thanks for your business.</p>
                    </div>
                  </div>
                  <div className="w-[40%]">
                    <div className="p-2 flex justify-between border-b border-black">
                      <span>{selectedPreviewInvoice.invoiceType !== 'Retail' ? 'Taxable Amount' : 'Sub Total'}</span>
                      <span>{selectedPreviewInvoice.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    {selectedPreviewInvoice.invoiceType !== 'Retail' && (
                      <>
                        <div className="p-2 flex justify-between border-b border-black">
                          <span>CGST{(parseFloat(selectedPreviewInvoice.taxRate || '0')/2)} ({(parseFloat(selectedPreviewInvoice.taxRate || '0')/2)}%)</span>
                          <span>{(selectedPreviewInvoice.tax / 2).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="p-2 flex justify-between border-b border-black">
                          <span>SGST{(parseFloat(selectedPreviewInvoice.taxRate || '0')/2)} ({(parseFloat(selectedPreviewInvoice.taxRate || '0')/2)}%)</span>
                          <span>{(selectedPreviewInvoice.tax / 2).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                      </>
                    )}
                    <div className="p-2 flex justify-between border-b border-black font-bold">
                      <span>Total {selectedPreviewInvoice.invoiceType !== 'Retail' ? 'Amount' : ''}</span>
                      <span>₹{selectedPreviewInvoice.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="p-2 flex justify-between font-bold border-b border-black bg-gray-50/50">
                      <span>Balance Due</span>
                      <span>₹{selectedPreviewInvoice.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="flex">
                  <div className="w-[60%] p-2 border-r border-black">
                    <div className="mb-4">
                      <p className="font-bold underline mb-1">BANK DETAILS:</p>
                      <p>PRADIP RADADIYA HUF</p>
                      <p>HDFC BANK</p>
                      <p>AC. NO. 99999913307898</p>
                      <p>IFSC: HDFC0004693</p>
                    </div>
                    <div>
                      <p className="font-bold mb-1">Terms & Conditions:</p>
                      <p className="text-[9px] text-gray-700 leading-tight">- Goods once sold will not be taken back or exchanged. - Interest at 24% per annum will be charged after due date of the bill. - Transportation charge extra. - Subject to SURAT Jurisdiction.</p>
                    </div>
                  </div>
                  <div className="w-[40%] p-2 flex flex-col justify-between items-center relative">
                    <p className="w-full text-center mt-2">For, ALPHA CREATIVE HUB</p>
                    {/* Placeholder for Signature Image */}
                    <div className="my-8">
                       <span className="text-blue-800/40 text-4xl transform -rotate-12 select-none inline-block font-bold">R.B.</span>
                    </div>
                    <p className="w-full text-center border-t border-black pt-1">Authorized Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
