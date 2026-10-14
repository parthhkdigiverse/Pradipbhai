import { useState } from 'react';
import { 
  X, 
  Briefcase, 
  Calendar, 
  Clock, 
  User, 
  ExternalLink, 
  Folder, 
  AlertTriangle, 
  Building2, 
  Printer, 
  Copy, 
  Check, 
  Eye, 
  Tag 
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { formatDate } from '../utils/dateFormatter';

interface JobDetailsModalProps {
  job: any | null;
  onClose: () => void;
}

export function JobDetailsModal({ job, onClose }: JobDetailsModalProps) {
  const { clients, staff, vendors, products } = useData();
  const { dateFormat } = useSettings();
  const [copiedLocation, setCopiedLocation] = useState(false);

  if (!job) return null;

  // Resolve client information
  const client = clients.find(c => c.id === job.clientId);
  const clientName = client?.company || client?.name || 'Unknown Client';
  const clientContact = client?.name && client?.company && client.name !== client.company ? client.name : null;
  const clientEmail = client?.email || null;
  const clientPhone = client?.phone || null;

  // Resolve project name
  let projectName = null;
  if (job.projectId && client?.projects) {
    const proj = client.projects.find((p: any) => p.id === job.projectId);
    if (proj) projectName = proj.name;
  }

  // Resolve product
  const product = products.find(p => p.id === job.productId);
  const productName = product?.name || null;

  // Resolve assigned staff member
  const staffId = job.teamId || job.assignedStaffId || job.assigned_staff_id;
  const assignedStaff = staff.find(s => s.id === staffId);
  const staffName = assignedStaff?.name || (staffId ? 'Assigned' : 'Unassigned');
  const staffRole = assignedStaff?.role || null;

  // Resolve printer / vendor
  const printerVendor = vendors.find(v => v.id === job.printerId);
  const printerName = printerVendor?.name || printerVendor?.company || null;

  // Financial calculations
  const totalAmount = Number(job.totalAmount) || 0;
  const paidAmount = Number(job.paidAmount) || 0;
  const balanceAmount = Math.max(0, totalAmount - paidAmount);

  const handleCopyLocation = (loc: string) => {
    if (!loc) return;
    navigator.clipboard.writeText(loc);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div 
        className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/80 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-800 leading-tight">Job Details</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                  <Eye className="w-3 h-3" /> View Only
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono">ID: {job.id}</p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-xl transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Main Title & Status Hero */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/2 to-transparent border border-primary/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <h2 className="text-xl font-bold text-gray-900 leading-snug">{job.title}</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Type Badge */}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs ${
                  job.type === 'Designing' ? 'bg-emerald-500 text-white' :
                  job.type === 'Des+Print' ? 'bg-purple-600 text-white' : 'bg-primary text-white'
                }`}>
                  {job.type}
                </span>

                {/* Status Badge */}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  job.status === 'Completed' || job.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  job.status === 'Under Review' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                  job.status === 'Progress' || job.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {job.status}
                </span>

                {/* Payment Badge */}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  job.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  job.paymentStatus === 'Partial' || (paidAmount > 0 && balanceAmount > 0) ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {job.paymentStatus || (balanceAmount === 0 ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid'))}
                </span>
              </div>
            </div>

            {/* Financial Summary Highlight Bar */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-primary/10 mt-3 text-center">
              <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Total Amount</span>
                <span className="text-base font-extrabold text-gray-800">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white/80 p-2.5 rounded-xl border border-gray-100 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">Amount Paid</span>
                <span className="text-base font-extrabold text-emerald-600">₹{paidAmount.toLocaleString()}</span>
              </div>
              <div className={`p-2.5 rounded-xl border shadow-2xs ${
                balanceAmount > 0 ? 'bg-rose-50/80 border-rose-200 text-rose-700' : 'bg-emerald-50/80 border-emerald-200 text-emerald-700'
              }`}>
                <span className="text-[10px] uppercase font-bold block mb-0.5">Remaining Balance</span>
                <span className="text-base font-extrabold">₹{balanceAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Client & Project Card */}
            <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <Building2 className="w-4 h-4 text-primary" />
                <span>Client & Project</span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-[11px] text-gray-400 block">Company / Client</span>
                  <span className="text-sm font-bold text-gray-800">{clientName}</span>
                  {clientContact && <span className="text-xs text-gray-500 block">Contact: {clientContact}</span>}
                </div>
                {(clientEmail || clientPhone) && (
                  <div className="text-xs text-gray-500 pt-1">
                    {clientEmail && <div>{clientEmail}</div>}
                    {clientPhone && <div>{clientPhone}</div>}
                  </div>
                )}
                {projectName && (
                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-[11px] text-gray-400 block">Associated Project</span>
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {projectName}
                    </span>
                  </div>
                )}
                {productName && (
                  <div className="pt-1">
                    <span className="text-[11px] text-gray-400 block">Catalog Product</span>
                    <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-gray-400" />
                      {productName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment & Vendors */}
            <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <User className="w-4 h-4 text-primary" />
                <span>Team & Vendors</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] text-gray-400 block">Assigned Team Member</span>
                  <span className="text-sm font-bold text-gray-800">{staffName}</span>
                  {staffRole && <span className="text-xs text-gray-500 block">{staffRole}</span>}
                </div>
                {printerName && (
                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-[11px] text-gray-400 block">Assigned Printer / Vendor</span>
                    <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Printer className="w-3.5 h-3.5 text-indigo-500" />
                      {printerName}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="text-[11px] text-gray-400 block">Created By</span>
                  <span className="text-xs font-semibold text-gray-700">{job.createdBy || 'Admin'}</span>
                </div>
              </div>
            </div>

            {/* Timeline & Dates */}
            <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Timeline & Dates</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] text-gray-400 block">Due Date</span>
                  <span className="text-sm font-bold text-gray-800">
                    {job.dueDate ? formatDate(job.dueDate, dateFormat) : 'No due date specified'}
                  </span>
                </div>
                {job.createdAt && (
                  <div className="pt-2 border-t border-gray-200/60">
                    <span className="text-[11px] text-gray-400 block">Created Date</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {formatDate(job.createdAt, dateFormat)}
                    </span>
                  </div>
                )}
                {job.startedAt && (
                  <div className="pt-1">
                    <span className="text-[11px] text-gray-400 block">Started Date</span>
                    <span className="text-xs font-semibold text-gray-700">
                      {formatDate(job.startedAt, dateFormat)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Time Tracking */}
            <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-primary" />
                <span>Time Tracking</span>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] text-gray-400 block">Estimated Time</span>
                  <span className="text-sm font-bold text-gray-800">
                    {job.estimatedTime ? `${job.estimatedTime} ${job.estimatedTimeUnit || 'Hours'}` : '—'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200/60">
                  <span className="text-[11px] text-gray-400 block">Tracked Working Time</span>
                  <span className="text-xs font-semibold text-gray-700">
                    {job.trackedTime !== undefined && job.trackedTime !== null ? `${job.trackedTime} Hours` : '—'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Work Output & Deliverable Links (if present) */}
          {(job.workLink || job.workLocation) && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">Deliverables & Storage</span>
              <div className="space-y-2">
                {job.workLink && (
                  <div className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs text-gray-700 font-medium truncate">{job.workLink}</span>
                    </div>
                    <a
                      href={job.workLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs"
                    >
                      Open Link
                    </a>
                  </div>
                )}

                {job.workLocation && (
                  <div className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-indigo-100 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs text-gray-700 font-mono truncate">{job.workLocation}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyLocation(job.workLocation)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLocation ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLocation ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Delay / Revision Notes (if present) */}
          {job.delayReason && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-0.5">
                  Revision / Delay Reason
                </span>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">{job.delayReason}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400 font-medium">
            Read-only summary • All modifications are disabled
          </p>
          <button
            type="button"
            id="btn-close-job-details"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
