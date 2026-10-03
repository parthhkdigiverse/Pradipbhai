import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { User, Mail, Phone, MapPin, Building, Shield, Save, Clock, Camera, RefreshCw } from 'lucide-react';

export function ProfilePage() {
  const { workLogs, staff, currentUserRole, updateStaff } = useData();
  const userEmail = localStorage.getItem('userEmail') || 'admin@alphacreative.com';
  const currentUser = staff.find(s => s.email?.toLowerCase() === userEmail.toLowerCase());
  const userKey = currentUser?.id || userEmail;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    return (
      localStorage.getItem(`user_avatar_${userKey}`) ||
      (currentUser as any)?.avatarUrl ||
      (currentUser as any)?.avatar_url ||
      `https://i.pravatar.cc/150?u=${userEmail}`
    );
  });

  const [formData, setFormData] = useState({
    name: currentUser ? currentUser.name : 'System Admin',
    email: currentUser ? currentUser.email : userEmail,
    phone: currentUser ? (currentUser.phone || '+91 98765 43210') : '+91 98765 43210',
    address: 'Alpha Creative Studio, Main Street, India',
    role: currentUser ? currentUser.role : (currentUserRole || 'Administrator'),
    department: 'Operations & Design'
  });

  const [isEditing, setIsEditing] = useState(false);

  const totalTrackedSeconds = workLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const totalTrackedHours = (totalTrackedSeconds / 3600).toFixed(1);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setAvatarUrl(result);
          localStorage.setItem(`user_avatar_${userKey}`, result);
          if (currentUser && updateStaff) {
            updateStaff(currentUser.id, { avatarUrl: result, avatar_url: result });
          }
          window.dispatchEvent(new Event('avatarChanged'));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetAvatar = () => {
    const defaultUrl = `https://i.pravatar.cc/150?u=${userEmail}`;
    setAvatarUrl(defaultUrl);
    localStorage.removeItem(`user_avatar_${userKey}`);
    if (currentUser && updateStaff) {
      updateStaff(currentUser.id, { avatarUrl: defaultUrl, avatar_url: defaultUrl });
    }
    window.dispatchEvent(new Event('avatarChanged'));
  };

  return (
    <div className="w-full relative pb-10">
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleFileSelect} 
      />

      {/* Banner & Avatar Container */}
      <div className="relative mb-16">
        <div className="h-48 rounded-3xl bg-primary relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          
          {/* Desktop Title (inside banner) */}
          <div className="absolute bottom-6 left-44 hidden md:block z-10">
            <h1 className="text-3xl font-bold text-white drop-shadow-md">{formData.name}</h1>
            <p className="text-white/90 font-medium drop-shadow-md flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4" /> {formData.role}
            </p>
          </div>
        </div>
        
        {/* Avatar Container with Sleek Floating Camera Badge */}
        <div className="absolute -bottom-12 left-8 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white relative">
            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            
            {/* Subtle Hover Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Camera className="w-7 h-7 text-white drop-shadow-md" />
            </div>
          </div>

          {/* Camera Action Badge */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-2 border-white hover:bg-primary-dark hover:scale-110 transition-all z-20 cursor-pointer"
            title="Change Profile Picture"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Title (visible only on small screens below the banner) */}
      <div className="md:hidden px-8 mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">{formData.name}</h1>
        <p className="text-gray-500 font-medium flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> {formData.role}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        
        {/* Left Column: Personal Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Personal Information
              </h2>
              <div className="flex items-center gap-2">
                {localStorage.getItem(`user_avatar_${userKey}`) && (
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer flex items-center gap-1 border border-gray-200"
                    title="Remove custom photo"
                  >
                    <RefreshCw className="w-3 h-3" /> Reset Photo
                  </button>
                )}
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                    isEditing ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isEditing ? (
                    <span className="flex items-center gap-1.5"><Save className="w-4 h-4" /> Save</span>
                  ) : 'Edit Profile'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Full Name
                </label>
                {isEditing ? (
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email Address
                </label>
                {isEditing ? (
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.email}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Phone Number
                </label>
                {isEditing ? (
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.phone}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Building className="w-3 h-3" /> Department
                </label>
                {isEditing ? (
                  <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.department}</p>
                )}
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Address
                </label>
                {isEditing ? (
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" />
                ) : (
                  <p className="text-gray-800 font-medium px-1 py-2">{formData.address}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Meta */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-50 border-none">
            <h2 className="text-lg font-bold text-primary mb-4">Activity Overview</h2>
            
            <div className="space-y-4">
              <div className="bg-white/60 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Total Hours Logged</p>
                  <p className="text-2xl font-black text-gray-800">{totalTrackedHours}h</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
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
        </div>

      </div>
    </div>
  );
}
