import { useState, useMemo } from 'react';
import { Plus, Search, Edit, X, Printer, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { SearchableSelect } from './SearchableSelect';

export function VendorsPage() {
  const { vendors, addVendor, updateVendor, deleteVendor, currentUserRole, hasPermission } = useData();
  const canManageVendors = hasPermission(currentUserRole, 'Manage Vendors');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const resetFilters = () => {
    setSearchTerm('');
    setFilterCategory('All');
  };
    const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Printer'
  });

  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const sLower = searchTerm.toLowerCase();
      const matchSearch = v.name.toLowerCase().includes(sLower) || 
                          v.description.toLowerCase().includes(sLower) ||
                          (v.category && v.category.toLowerCase().includes(sLower));
      const category = v.category || 'Printer';
      const matchCategory = filterCategory === 'All' || category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [vendors, searchTerm, filterCategory]);

  const handleOpenModal = (vendorId: string | null = null) => {
    if (vendorId) {
      const v = vendors.find(x => x.id === vendorId);
      if (v) {
        setFormData({
          name: v.name,
          description: v.description,
          category: v.category || 'Printer'
        });
        setEditingVendorId(vendorId);
      }
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'Printer'
      });
      setEditingVendorId(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVendorId(null);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVendorId) {
      await updateVendor(editingVendorId, formData);
    } else {
      await addVendor(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      await deleteVendor(id);
    }
  };

  return (
    <div className="w-full relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm mb-1">Printers & Vendors</h1>
        </div>
        <div className="flex items-center gap-3">
          {canManageVendors && (
            <button 
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-primary hover:bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Vendor
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel border border-white/60 rounded-2xl shadow-sm mb-6 p-3 sm:p-4 bg-white/40 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search vendors by name or description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/70 border border-white/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-400"
          />
        </div>
        
        <div className="w-full sm:w-56 shrink-0">
          <SearchableSelect
            value={filterCategory}
            onChange={setFilterCategory}
            options={[
              { value: 'All', label: 'All Categories' },
              { value: 'Printer', label: 'Printer' },
              { value: 'Designer', label: 'Designer' },
              { value: 'Supplier', label: 'Supplier' },
              { value: 'Other', label: 'Other' }
            ]}
          />
        </div>

        {(searchTerm !== '' || filterCategory !== 'All') && (
          <button 
            onClick={resetFilters}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="glass-panel border border-white/60 rounded-[2rem] shadow-sm overflow-hidden flex flex-col flex-1 bg-white/40 backdrop-blur-md">
        <div className="overflow-x-auto flex-1 p-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-extrabold uppercase tracking-widest bg-gray-50/50">
                <th className="py-4 px-6 w-16">#</th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor, index) => (
                  <tr key={vendor.id} className="hover:bg-white/60 transition-colors group">
                    <td className="py-4 px-6 font-bold text-gray-400">
                      {index + 1}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-gray-800 text-sm">{vendor.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        vendor.category === 'Printer' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {vendor.category || 'Printer'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600 font-medium">
                      {vendor.description || '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {canManageVendors ? (
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenModal(vendor.id)}
                            className="w-7 h-7 rounded bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                            title="Edit Vendor"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(vendor.id)}
                            className="w-7 h-7 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-medium cursor-default" title="Read Only">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Printer className="w-12 h-12 text-gray-300 mb-4" />
                      <p>No vendors found.</p>
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
          <div className="relative glass-panel border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-white/40 bg-white/30">
              <h2 className="text-lg font-bold text-gray-800">{editingVendorId ? 'Edit Vendor' : 'Add New Vendor'}</h2>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveVendor} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Vendor Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800" placeholder="e.g. Laxmi Bag Manufacturer" />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Category</label>
                  <SearchableSelect
                    value={formData.category}
                    onChange={val => setFormData({...formData, category: val})}
                    options={[
                      { value: 'Printer', label: 'Printer' },
                      { value: 'Designer', label: 'Designer' },
                      { value: 'Supplier', label: 'Supplier' },
                      { value: 'Other', label: 'Other' }
                    ]}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1 block">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 h-24 resize-none" placeholder="e.g. cloth print, Flag, khes, etc" />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-white/40">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary text-white text-sm font-bold rounded-xl shadow-sm transition-all">
                  {editingVendorId ? 'Save Changes' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
