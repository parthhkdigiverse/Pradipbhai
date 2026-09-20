import React, { useState, useEffect } from 'react';
import { X, UserPlus, Building2, User, Mail, Phone } from 'lucide-react';
import { useData } from '../context/DataContext';

interface QuickAddClientModalProps {
  isOpen: boolean;
  initialName?: string;
  onClose: () => void;
  onClientCreated: (client: any) => void;
}

export const QuickAddClientModal: React.FC<QuickAddClientModalProps> = ({
  isOpen,
  initialName = '',
  onClose,
  onClientCreated
}) => {
  const { setClients } = useData();
  const [formData, setFormData] = useState({
    company: '',
    contact: '',
    email: '',
    phone: '',
    trafficLight: 'Green' as 'Green' | 'Yellow' | 'Red',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        company: initialName,
        contact: initialName,
        email: '',
        phone: '',
        trafficLight: 'Green'
      });
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim()) return;

    const newClient = {
      id: Math.random().toString(36).substr(2, 9),
      company: formData.company.trim(),
      contact: formData.contact.trim() || formData.company.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      trafficLight: formData.trafficLight,
      projects: [],
      clientSince: new Date().toISOString().split('T')[0]
    };

    setClients(prev => [newClient, ...prev]);
    onClientCreated(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white shadow-2xl rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Add New Client
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
              Company / Client Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required 
                type="text" 
                value={formData.company} 
                onChange={e => setFormData({ ...formData, company: e.target.value, contact: formData.contact === formData.company ? e.target.value : formData.contact })} 
                placeholder="e.g. Acme Corp" 
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Contact Person</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={formData.contact} 
                onChange={e => setFormData({ ...formData, contact: e.target.value })} 
                placeholder="Contact person name..." 
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="+91 98765..." 
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800" 
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="client@email.com" 
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800" 
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Traffic Light Status</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, trafficLight: 'Green' })}
                className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                  formData.trafficLight === 'Green' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span>🟢</span> Green
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, trafficLight: 'Yellow' })}
                className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                  formData.trafficLight === 'Yellow' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>🟡</span> Yellow
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, trafficLight: 'Red' })}
                className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                  formData.trafficLight === 'Red' ? 'bg-rose-500 text-white border-rose-600 shadow-sm' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span>🔴</span> Red
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary rounded-xl transition-all shadow-md"
            >
              Add Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
