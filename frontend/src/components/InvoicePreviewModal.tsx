import { X, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { numberToWords } from '../utils/numberToWords';

export function InvoicePreviewModal({ invoice, onClose }: { invoice: any, onClose: () => void }) {
  const { clients, jobs } = useData();

  if (!invoice) return null;

  const getClientName = (id: string) => clients.find(c => c.id === id)?.company || 'Unknown Client';

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      <div className="relative bg-white shadow-2xl w-full max-w-4xl h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0 sticky top-0 z-10 print:hidden">
          <h2 className="text-lg font-bold text-gray-800">Invoice Preview</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 flex items-center gap-2 transition-all shadow-sm">
              <FileText className="w-4 h-4" /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors">
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
              <h2 className="text-3xl font-normal tracking-wider">{invoice.invoiceType === 'Retail' ? 'RETAIL INVOICE' : 'TAX INVOICE'}</h2>
            </div>

            {/* Details Grid */}
            <div className="border-t border-black grid grid-cols-2 divide-x divide-black">
              <div className="p-2 space-y-1">
                <div className="flex"><span className="w-24">Invoice No.</span><span className="font-bold">: {invoice.invoiceNumber || 'INV-PREVIEW'}</span></div>
                <div className="flex"><span className="w-24">Invoice Date</span><span className="font-bold">: {invoice.issueDate || new Date().toISOString().split('T')[0]}</span></div>
                <div className="flex"><span className="w-24">Terms</span><span className="font-bold">: Due on Receipt</span></div>
                <div className="flex"><span className="w-24">Due Date</span><span className="font-bold">: {invoice.dueDate || '-'}</span></div>
                {invoice.invoiceType === 'Retail' && <div className="flex"><span className="w-24">P.O.#</span><span className="font-bold">: {getClientName(invoice.clientId)}</span></div>}
              </div>
              <div className="p-2">
                <div className="flex"><span className="w-32">Place Of Supply</span><span className="font-bold">: Gujarat (24)</span></div>
              </div>
            </div>

            {/* Bill To */}
            <div className="border-t border-black">
              <div className="bg-gray-100/50 p-1 px-2 border-b border-black font-bold">Bill To</div>
              <div className="p-2 h-24">
                <p className="font-bold text-[12px] uppercase">{getClientName(invoice.clientId)}</p>
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
                    {invoice.invoiceType !== 'Retail' && <th className="p-2 border-r border-black w-20 text-center font-bold">HSN/SAC</th>}
                    <th className="p-2 border-r border-black w-16 text-right font-bold">Qty</th>
                    <th className="p-2 border-r border-black w-20 text-right font-bold">Rate</th>
                    {invoice.invoiceType !== 'Retail' && (
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
                  {(invoice.items || (invoice.jobIds || []).map((jobId: string) => {
                    const job = jobs.find(j => j.id === jobId);
                    return {
                      id: jobId,
                      description: job ? job.title : 'Unknown Job',
                      quantity: 1,
                      rate: job ? (job.totalAmount - (job.paidAmount || 0)) : 0,
                      amount: job ? (job.totalAmount - (job.paidAmount || 0)) : 0
                    };
                  })).map((item: any, idx: number) => {
                    const taxRate = parseFloat(invoice.taxRate || '18');
                    const halfTax = taxRate / 2;
                    const taxAmt = (item.amount * taxRate) / 200;
                    return (
                      <tr key={item.id || idx}>
                        <td className="p-2 border-r border-black text-center">{idx + 1}</td>
                        <td className="p-2 border-r border-black">
                          <span className="font-bold">{invoice.invoiceType === 'Retail' ? 'DESIGN CHARGE' : item.description}</span>
                          {invoice.invoiceType === 'Retail' && <div className="mt-1">{item.description}</div>}
                        </td>
                        {invoice.invoiceType !== 'Retail' && <td className="p-2 border-r border-black text-center">998391</td>}
                        <td className="p-2 border-r border-black text-right">{item.quantity || 1}.00<br/>pcs</td>
                        <td className="p-2 border-r border-black text-right">{(item.rate || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        {invoice.invoiceType !== 'Retail' && (
                          <>
                            <td className="p-0 border-r border-black">
                              <div className="flex h-full divide-x divide-black"><div className="w-1/2 p-2 text-right">{halfTax}%</div><div className="w-1/2 p-2 text-right">{taxAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>
                            </td>
                            <td className="p-0 border-r border-black">
                              <div className="flex h-full divide-x divide-black"><div className="w-1/2 p-2 text-right">{halfTax}%</div><div className="w-1/2 p-2 text-right">{taxAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</div></div>
                            </td>
                          </>
                        )}
                        <td className="p-2 text-right">{(item.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    );
                  })}
                  <tr className="h-full">
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    {invoice.invoiceType !== 'Retail' && <td className="border-r border-black"></td>}
                    <td className="border-r border-black"></td>
                    <td className="border-r border-black"></td>
                    {invoice.invoiceType !== 'Retail' && <td className="border-r border-black"></td>}
                    {invoice.invoiceType !== 'Retail' && <td className="border-r border-black"></td>}
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            <div className="border-t border-black flex">
              <div className="w-[60%] p-2 border-r border-black border-b">
                <p>Total In Words</p>
                <p className="font-bold italic">Indian Rupee {numberToWords(invoice.total || 0)}</p>
                
                <div className="mt-4">
                  <p>Notes</p>
                  {invoice.invoiceType !== 'Retail' && <p>MSME NO. UDYAM-GJ-22-0380045</p>}
                  <p>Thanks for your business.</p>
                </div>
              </div>
              <div className="w-[40%]">
                <div className="p-2 flex justify-between border-b border-black">
                  <span>{invoice.invoiceType !== 'Retail' ? 'Taxable Amount' : 'Sub Total'}</span>
                  <span>{(invoice.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                {invoice.invoiceType !== 'Retail' && (
                  <>
                    <div className="p-2 flex justify-between border-b border-black">
                      <span>CGST{(parseFloat(invoice.taxRate || '18')/2)} ({(parseFloat(invoice.taxRate || '18')/2)}%)</span>
                      <span>{((invoice.tax || 0) / 2).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="p-2 flex justify-between border-b border-black">
                      <span>SGST{(parseFloat(invoice.taxRate || '18')/2)} ({(parseFloat(invoice.taxRate || '18')/2)}%)</span>
                      <span>{((invoice.tax || 0) / 2).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                  </>
                )}
                <div className="p-2 flex justify-between border-b border-black font-bold">
                  <span>Total {invoice.invoiceType !== 'Retail' ? 'Amount' : ''}</span>
                  <span>₹{(invoice.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="p-2 flex justify-between font-bold border-b border-black bg-gray-50/50">
                  <span>Balance Due</span>
                  <span>₹{(invoice.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
  );
}
