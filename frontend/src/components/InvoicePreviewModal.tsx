import { useState, useEffect, useMemo } from 'react';
import { X, FileText, CheckCircle2, Save, ExternalLink, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { numberToWords } from '../utils/numberToWords';

export function InvoicePreviewModal({ 
  invoice, 
  onClose,
  setCurrentPage,
  onInvoiceSaved
}: { 
  invoice: any; 
  onClose: () => void;
  setCurrentPage?: (page: string) => void;
  onInvoiceSaved?: (savedInv: any) => void;
}) {
  const { clients, jobs, invoices, addInvoice } = useData();
  const [currentInvoice, setCurrentInvoice] = useState<any>(invoice);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setCurrentInvoice(invoice);
    setJustSaved(false);
  }, [invoice]);

  if (!currentInvoice) return null;

  // Determine if this invoice is permanently saved in the system
  const isPermanentlySaved = useMemo(() => {
    if (justSaved) return true;
    if (!currentInvoice.id) return false;
    if (String(currentInvoice.id).startsWith('preview-')) return false;
    return (invoices || []).some((inv: any) => 
      inv.id === currentInvoice.id || 
      (inv.invoiceNumber && inv.invoiceNumber === currentInvoice.invoiceNumber) ||
      (currentInvoice.jobIds && currentInvoice.jobIds.length > 0 && inv.jobIds && inv.jobIds.some((jId: string) => currentInvoice.jobIds.includes(jId)))
    );
  }, [currentInvoice, invoices, justSaved]);

  const handleSaveToInvoices = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const itemsToSave = (currentInvoice.items && currentInvoice.items.length > 0)
        ? currentInvoice.items
        : (currentInvoice.jobIds || []).map((jobId: string) => {
            const j = jobs.find(job => job.id === jobId);
            const amt = j ? (j.totalAmount - (j.paidAmount || 0)) : 0;
            return {
              id: jobId,
              description: j ? j.title : 'Job Item',
              quantity: 1,
              rate: amt,
              amount: amt,
              isJob: true,
              jobId
            };
          });

      const payload = {
        invoiceNumber: currentInvoice.invoiceNumber,
        clientId: currentInvoice.clientId,
        jobIds: currentInvoice.jobIds || [],
        items: itemsToSave,
        issueDate: currentInvoice.issueDate || new Date().toISOString().split('T')[0],
        dueDate: currentInvoice.dueDate || '',
        subtotal: currentInvoice.subtotal || currentInvoice.total || 0,
        taxRate: '0',
        tax: 0,
        total: currentInvoice.subtotal || currentInvoice.total || 0,
        status: currentInvoice.status || 'Sent',
        invoiceType: 'Standard'
      };

      const saved = await addInvoice(payload);
      const normalizedSaved = saved || { ...payload, id: `inv-${Date.now()}` };
      setCurrentInvoice(normalizedSaved);
      setJustSaved(true);
      if (onInvoiceSaved) {
        onInvoiceSaved(normalizedSaved);
      }
    } catch (err) {
      console.error("Failed to save invoice:", err);
      alert("Failed to save invoice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getClientName = (id: string) => clients.find(c => c.id === id)?.company || 'Unknown Client';

  return (
    <div className="fixed inset-0 z-[100] flex justify-end print:absolute print:inset-0 print:block print:w-full print:h-auto print:bg-white">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity print:hidden" onClick={onClose}></div>
      
      <div className="relative bg-white shadow-2xl w-full max-w-4xl h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col print:shadow-none print:max-w-none print:w-full print:h-auto print:overflow-visible print:block">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 sticky top-0 z-10 print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">Invoice Preview</h2>
            {isPermanentlySaved ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Saved in Invoices ({currentInvoice.invoiceNumber})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Draft / Preview (Not Saved)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!isPermanentlySaved && (
              <button 
                onClick={handleSaveToInvoices} 
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                title="Save this invoice to your permanent invoices list"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving to Invoices...' : 'Save & Add to Invoices'}
              </button>
            )}

            {isPermanentlySaved && setCurrentPage && (
              <button
                onClick={() => {
                  onClose();
                  setCurrentPage('invoices');
                }}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer"
                title="View this invoice in the Invoices Tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View in Invoices
              </button>
            )}

            <button onClick={() => window.print()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center gap-2 transition-all shadow-sm cursor-pointer">
              <FileText className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Draft Notice Banner */}
        {!isPermanentlySaved && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 print:hidden">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Draft Preview:</strong> This invoice is generated from the job report and is not yet added to your Invoices list. Click <strong>&quot;Save &amp; Add to Invoices&quot;</strong> to record and track it.
              </span>
            </div>
            <button
              onClick={handleSaveToInvoices}
              disabled={isSaving}
              className="text-xs font-bold text-amber-900 underline hover:text-amber-700 ml-4 shrink-0 cursor-pointer"
            >
              Save Now
            </button>
          </div>
        )}

        {/* A4 Document Area */}
        <div className="p-8 bg-gray-100 flex-1 overflow-y-auto flex justify-center print:p-0 print:bg-white print:overflow-visible print:block">
          <div id="invoice-print-area" className="bg-white w-full max-w-[210mm] min-h-[296mm] shadow-md border border-gray-300 text-black font-sans print:shadow-none print:border-none print:m-0 print:p-0 flex flex-col relative text-[11px] leading-tight print:min-h-[296mm] print:w-[210mm] mx-auto print:mx-0">
            {/* PDF Replica Content */}
            
            {/* Header */}
            <div className="flex justify-between items-start p-[10mm] pb-4">
              <div className="max-w-[60%]">
                <img 
                  src="/alpha-logo.png" 
                  alt="Alpha Creative Hub" 
                  className="h-20 w-auto object-contain mb-1" 
                />
                <p className="font-bold text-[11px] ml-1 mt-1 tracking-wider text-gray-800">SURAT • JUNAGADH</p>
              </div>
              <div className="text-right text-[10px] space-y-1">
                <p>E-mail: contact@alphacreativehub.com</p>
                <p>Web : www.alphacreativehub.com</p>
                <p className="mt-2 text-[11px]">220, Royal Arcade, Sarthana Jakat Naka,</p>
                <p className="text-[11px]">Nana Varachha, Surat, Gujarat - 395006.</p>
                <p className="text-[11px]">+91 99133 07898</p>
              </div>
            </div>

            {/* Title */}
            <div className="border-t border-black px-[10mm] py-3 text-right">
              <h2 className="text-3xl font-normal tracking-wider">INVOICE</h2>
            </div>

            {/* Details Grid */}
            <div className="border-t border-black grid grid-cols-2 divide-x divide-black">
              <div className="p-2 space-y-1">
                <div className="flex"><span className="w-24">Invoice No.</span><span className="font-bold">: {currentInvoice.invoiceNumber || 'INV-PREVIEW'}</span></div>
                <div className="flex"><span className="w-24">Invoice Date</span><span className="font-bold">: {currentInvoice.issueDate || new Date().toISOString().split('T')[0]}</span></div>
                <div className="flex"><span className="w-24">Terms</span><span className="font-bold">: Due on Receipt</span></div>
                <div className="flex"><span className="w-24">Due Date</span><span className="font-bold">: {currentInvoice.dueDate || '-'}</span></div>
              </div>
              <div className="p-2">
                <div className="flex"><span className="w-32">Place Of Supply</span><span className="font-bold">: Gujarat</span></div>
              </div>
            </div>

            {/* Bill To */}
            <div className="border-t border-black">
              <div className="bg-gray-100/50 p-1 px-2 border-b border-black font-bold">Bill To</div>
              <div className="p-2 h-24">
                <p className="font-bold text-[12px] uppercase">{getClientName(currentInvoice.clientId)}</p>
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
                    <th className="p-2 border-r border-black w-16 text-right font-bold">Qty</th>
                    <th className="p-2 border-r border-black w-24 text-right font-bold">Rate</th>
                    <th className="p-2 w-28 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {(currentInvoice.items || (currentInvoice.jobIds || []).map((jobId: string) => {
                    const job = jobs.find(j => j.id === jobId);
                    return {
                      id: jobId,
                      description: job ? job.title : 'Unknown Job',
                      quantity: 1,
                      rate: job ? (job.totalAmount - (job.paidAmount || 0)) : 0,
                      amount: job ? (job.totalAmount - (job.paidAmount || 0)) : 0
                    };
                  })).map((item: any, idx: number) => {
                    return (
                      <tr key={item.id || idx}>
                        <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                        <td className="p-2 border-r border-black">
                          <span className="font-bold">{item.description}</span>
                        </td>
                        <td className="p-2 border-r border-black text-right">{item.quantity || 1}.00<br/>pcs</td>
                        <td className="p-2 border-r border-black text-right">{(item.rate || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="p-2 text-right">{(item.amount || ((item.rate || 0) * (item.quantity || 1)) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    );
                  })}
                  <tr className="h-full">
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="border-t border-black flex">
              <div className="w-[60%] p-2 border-r border-black border-b">
                <p>Total In Words</p>
                <p className="font-bold italic">Indian Rupee {numberToWords(currentInvoice.total || currentInvoice.subtotal || 0)}</p>
                
                <div className="mt-4">
                  <p>Notes</p>
                  <p>Thanks for your business.</p>
                </div>
              </div>
              <div className="w-[40%]">
                <div className="p-2 flex justify-between border-b border-black">
                  <span>Sub Total</span>
                  <span>₹{(currentInvoice.subtotal || currentInvoice.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="p-2 flex justify-between border-b border-black font-bold bg-gray-50/50">
                  <span>Total Amount</span>
                  <span>₹{(currentInvoice.total || currentInvoice.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="p-2 flex justify-between font-bold border-b border-black">
                  <span>Balance Due</span>
                  <span>₹{(currentInvoice.total || currentInvoice.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
                <div className="my-8 h-10">
                   {/* Signature space */}
                </div>
                <p className="w-full text-center border-t border-black pt-1">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
