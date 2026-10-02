import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Tag, IndianRupee, Clock, FileText, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

interface QuickAddProductModalProps {
  isOpen: boolean;
  initialName?: string;
  initialType?: string;
  onClose: () => void;
  onProductCreated: (product: any) => void;
}

export const QuickAddProductModal: React.FC<QuickAddProductModalProps> = ({
  isOpen,
  initialName = '',
  initialType = 'Designing',
  onClose,
  onProductCreated
}) => {
  const { products, addProduct } = useData();
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Designing',
    price: '',
    estimatedTime: '',
    estimatedTimeUnit: 'Hours'
  });

  useEffect(() => {
    if (isOpen) {
      let defaultType = 'Designing';
      if (initialType === 'Printing') defaultType = 'Printing';
      else if (initialType === 'Designing') defaultType = 'Designing';

      setFormData({
        name: initialName,
        description: '',
        type: defaultType,
        price: '',
        estimatedTime: '',
        estimatedTimeUnit: 'Hours'
      });
      setErrorMessage('');
    }
  }, [isOpen, initialName, initialType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) return;

    // Check duplicate name + type in frontend
    const isDuplicate = products.some(
      p => p.name && p.name.trim().toLowerCase() === trimmedName.toLowerCase() && p.type === formData.type
    );

    if (isDuplicate) {
      setErrorMessage(`A product named "${trimmedName}" with category "${formData.type}" already exists.`);
      return;
    }

    setErrorMessage('');
    try {
      const newProduct = await addProduct({
        name: trimmedName,
        description: formData.description.trim() || '-',
        type: formData.type,
        price: formData.price !== '' ? parseFloat(formData.price) : 0,
        estimated_time: formData.estimatedTime !== '' ? parseFloat(formData.estimatedTime) : 0,
        estimated_time_unit: formData.estimatedTimeUnit || 'Hours'
      });

      onProductCreated(newProduct);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create product.');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white shadow-2xl rounded-3xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" /> Add New Product
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g. Visiting Card 350gsm" 
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 font-semibold" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Product Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 font-medium cursor-pointer"
              >
                <option value="Designing">🎨 Designing</option>
                <option value="Printing">🖨️ Printing</option>
                <option value="Social Media">📱 Social Media</option>
                <option value="Other">📦 Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Standard Price (₹)</label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="number"
                  step="any" 
                  value={formData.price} 
                  onChange={e => setFormData({ ...formData, price: e.target.value })} 
                  placeholder="0.00" 
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800" 
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Est. Time</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="number"
                  step="any"
                  value={formData.estimatedTime} 
                  onChange={e => setFormData({ ...formData, estimatedTime: e.target.value })} 
                  placeholder="e.g. 2" 
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800" 
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Time Unit</label>
              <select
                value={formData.estimatedTimeUnit}
                onChange={e => setFormData({ ...formData, estimatedTimeUnit: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 font-medium cursor-pointer"
              >
                <option value="Hours">Hours</option>
                <option value="Days">Days</option>
                <option value="Minutes">Minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">Description / Notes</label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <textarea 
                rows={2}
                value={formData.description} 
                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Product details or specifications..." 
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-800 resize-none" 
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-md cursor-pointer"
            >
              Add Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
