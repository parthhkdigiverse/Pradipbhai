import { useState, useMemo } from 'react';
import { Search, Plus, X, FileText, Download, Trash2, Calendar, FileCheck, CheckCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

export function InvoicesPage() {
  const { invoices, setInvoices, clients, jobs } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    taxRate: '18',
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
      return matchSearch && matchStatus;
    });
  }, [invoices, searchTerm, filterStatus]);

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
    return (modalSubtotal * parseFloat(formData.taxRate || '0')) / 100;
  }, [modalSubtotal, formData.taxRate]);

  const modalTotal = modalSubtotal + modalTax;

  const handleOpenModal = () => {
    setSelectedClientId('');
    setSelectedJobIds([]);
    setFormData({
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      taxRate: '18',
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
      status: 'Sent'
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
          <div className="text-sm text-gray-500 bg-white/40 px-3 py-1.5 rounded-full border border-white/60 backdrop-blur-md inline-block">
            Home &gt; Finance &gt; <span className="text-gray-800 font-medium">Invoices</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 flex items-center gap-2"
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
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <FileText className="w-6 h-6 text-blue-600" />
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

      {/* Filters Bar */}
      <div className="p-4 flex items-center justify-between gap-3 mb-4 bg-white/40 border border-white/60 rounded-[1.5rem] backdrop-blur-md shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search by invoice number..." 
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
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
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
                      <span className="font-bold text-gray-800 text-sm">{invoice.invoiceNumber}</span>
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
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        invoice.status === 'Draft' ? 'bg-gray-100 text-gray-600' : 
                        invoice.status === 'Sent' ? 'bg-blue-100 text-blue-600' : 
                        invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {invoice.status}
                      </span>
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
                          className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-800">Create Invoice</h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveInvoice} className="flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Select Client */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Select Client <span className="text-rose-500">*</span></label>
                  <select required value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
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
                              selectedJobIds.includes(job.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-transparent hover:bg-gray-50/50'
                            }`}>
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox" 
                                  checked={selectedJobIds.includes(job.id)}
                                  onChange={() => toggleJobSelection(job.id)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
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
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Issue Date</label>
                    <input type="date" required value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Due Date <span className="text-rose-500">*</span></label>
                    <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Tax Rate (%)</label>
                    <select value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800">
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
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
                    <span className="text-blue-600 font-bold text-xl">₹{modalTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex justify-end gap-3 border-t border-white/40 bg-white/30 flex-shrink-0">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
