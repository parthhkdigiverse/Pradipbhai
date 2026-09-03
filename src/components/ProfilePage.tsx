import { useState } from 'react';
import { useData } from '../context/DataContext';
import { User, Mail, Phone, MapPin, Building, Shield, Save, Key, Bell, CreditCard, Clock } from 'lucide-react';

export function ProfilePage() {
  const { workLogs } = useData();

  const [formData, setFormData] = useState({
    name: 'John Doe',
    email: 'john.doe@techsolutions.com',
    phone: '+1 (555) 123-4567',
    address: '123 Innovation Way, Tech District, SF, CA 94105',
    role: 'Senior Administrator',
    department: 'Operations'
  });

  const [isEditing, setIsEditing] = useState(false);

  const totalTrackedSeconds = workLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const totalTrackedHours = (totalTrackedSeconds / 3600).toFixed(1);

  return (
    <div className="w-full relative pb-10">
      {/* Banner & Avatar Container */}
      <div className="relative mb-16">
        <div className="h-48 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          
          {/* Desktop Title (inside banner) */}
          <div className="absolute bottom-6 left-44 hidden md:block z-10">
            <h1 className="text-3xl font-bold text-white drop-shadow-md">{formData.name}</h1>
            <p className="text-white/90 font-medium drop-shadow-md flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4" /> {formData.role}
            </p>
          </div>
        </div>
        
        {/* Avatar */}
        <div className="absolute -bottom-12 left-8">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white relative z-10">
            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Mobile Title (visible only on small screens below the banner) */}
      <div className="md:hidden px-8 mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">{formData.name}</h1>
        <p className="text-gray-500 font-medium flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" /> {formData.role}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        
        {/* Left Column: Personal Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" /> Personal Information
              </h2>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  isEditing ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isEditing ? (
                  <span className="flex items-center gap-1.5"><Save className="w-4 h-4" /> Save</span>
                ) : 'Edit Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Full Name
                </label>
                {isEditing ? (
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                {isEditing ? (
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.email}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number
                </label>
                {isEditing ? (
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.phone}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Building className="w-3 h-3" /> Department
                </label>
                {isEditing ? (
                  <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.department}</p>
                )}
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Address
                </label>
                {isEditing ? (
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.address}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password / Security */}
            <div className="glass-panel p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-purple-500" /> Security
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">New Password</label>
                  <input type="password" placeholder="Leave blank to keep same" className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none" />
                </div>
                <button className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg transition-colors text-sm">
                  Update Password
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="glass-panel p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-orange-500" /> Notifications
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-700 text-sm">Email Alerts</p>
                    <p className="text-xs text-gray-500">Daily summaries</p>
                  </div>
                  <div className="w-10 h-5 bg-blue-500 rounded-full relative cursor-pointer shadow-inner">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-700 text-sm">Push Notifications</p>
                    <p className="text-xs text-gray-500">Instant updates</p>
                  </div>
                  <div className="w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer shadow-inner">
                    <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-700 text-sm">Marketing Emails</p>
                    <p className="text-xs text-gray-500">News & Offers</p>
                  </div>
                  <div className="w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer shadow-inner">
                    <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Meta */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-none">
            <h2 className="text-lg font-bold text-blue-900 mb-4">Activity Overview</h2>
            
            <div className="space-y-4">
              <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Total Hours Logged</p>
                  <p className="text-2xl font-black text-gray-800">{totalTrackedHours}h</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              
              <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Sessions</p>
                  <p className="text-2xl font-black text-gray-800">{workLogs.length}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Current Status</p>
                  <p className="text-lg font-bold text-gray-800">Active Employee</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-emerald-500" /> Billing Details
            </h2>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-gray-700">Salary Account</p>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Verified</span>
              </div>
              <p className="text-xs text-gray-500 font-mono">**** **** **** 4582</p>
              <p className="text-xs text-gray-500 mt-1">Bank of America</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
