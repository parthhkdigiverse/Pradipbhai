import { useState } from 'react';
import { Shield, MapPin, Clock, Plus, Trash2, Save } from 'lucide-react';

export function RestrictionsPage() {
  const [ipWhitelist, setIpWhitelist] = useState<string[]>(['192.168.1.100', '10.0.0.50']);
  const [newIp, setNewIp] = useState('');
  
  const [enableTimeRestrictions, setEnableTimeRestrictions] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  
  const [enableGeoRestrictions, setEnableGeoRestrictions] = useState(true);
  const [allowedPincodes, setAllowedPincodes] = useState<Array<{ code: string; area: string }>>([
    { code: '380009', area: 'Ahmedabad (Navrangpura)' },
    { code: '400001', area: 'Mumbai (Fort / South Mumbai)' },
    { code: '395006', area: 'Surat (Varachha)' }
  ]);
  const [newPincode, setNewPincode] = useState('');
  const [newPincodeArea, setNewPincodeArea] = useState('');

  const handleAddIp = () => {
    if (newIp && !ipWhitelist.includes(newIp)) {
      setIpWhitelist([...ipWhitelist, newIp]);
      setNewIp('');
    }
  };

  const handleAddPincode = () => {
    const cleanedCode = newPincode.trim();
    if (cleanedCode && !allowedPincodes.some(p => p.code === cleanedCode)) {
      setAllowedPincodes([
        ...allowedPincodes, 
        { code: cleanedCode, area: newPincodeArea.trim() || 'Custom Area' }
      ]);
      setNewPincode('');
      setNewPincodeArea('');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center z-10 relative">
        <h1 className="text-3xl font-bold text-gray-900 drop-shadow-sm">Access Restrictions</h1>
        <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 z-10 relative">
        
        {/* IP Allowlisting */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">IP Allowlisting</h3>
                <p className="text-xs text-gray-500">Only allow access from specific IP addresses</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              placeholder="Enter IP Address (e.g. 192.168.1.1)" 
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
            />
            <button onClick={handleAddIp} className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors font-bold text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          
          <div className="bg-white/40 rounded-xl border border-white/60 overflow-hidden flex-1">
            {ipWhitelist.map((ip, index) => (
              <div key={index} className="flex justify-between items-center px-4 py-3 border-b border-white/40 last:border-0 hover:bg-white/60 transition-colors">
                <span className="font-mono text-sm text-gray-700 font-medium">{ip}</span>
                <button onClick={() => setIpWhitelist(ipWhitelist.filter(i => i !== ip))} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {ipWhitelist.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500">No IP addresses whitelisted. Access is allowed from anywhere.</div>
            )}
          </div>
        </div>

        {/* Time-based Restrictions */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Time-based Access</h3>
                <p className="text-xs text-gray-500">Restrict access during off-hours</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={enableTimeRestrictions} onChange={(e) => setEnableTimeRestrictions(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
          </div>
          
          <div className={`space-y-4 ${!enableTimeRestrictions ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Allowed Start Time</label>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Allowed End Time</label>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold"
              />
            </div>
            <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-lg">
              <p className="text-xs text-orange-800">Non-admin users will only be able to log in between {startTime} and {endTime} server time.</p>
            </div>
          </div>
        </div>

        {/* Indian Pincode-based Geographic Restrictions */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-shadow md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  Indian Pincode Restrictions 🇮🇳
                </h3>
                <p className="text-xs text-gray-500">Restrict access only to authorized 6-digit Indian PIN codes & locations</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={enableGeoRestrictions} onChange={(e) => setEnableGeoRestrictions(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
          
          <div className={`flex flex-col flex-1 ${!enableGeoRestrictions ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input 
                type="text" 
                maxLength={6}
                placeholder="PIN Code (e.g. 380009)" 
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, ''))}
                className="px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono font-bold"
              />
              <input 
                type="text" 
                placeholder="Area / City Name (e.g. Ahmedabad)" 
                value={newPincodeArea}
                onChange={(e) => setNewPincodeArea(e.target.value)}
                className="px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button 
                onClick={handleAddPincode} 
                disabled={newPincode.length !== 6}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Pincode
              </button>
            </div>
            
            <div className="bg-white/40 rounded-xl border border-white/60 overflow-hidden flex-1 divide-y divide-white/40">
              {allowedPincodes.map((item) => (
                <div key={item.code} className="flex justify-between items-center px-4 py-3 hover:bg-white/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                      {item.code}
                    </span>
                    <span className="text-sm text-gray-700 font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {item.area}
                    </span>
                  </div>
                  <button onClick={() => setAllowedPincodes(allowedPincodes.filter(p => p.code !== item.code))} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {allowedPincodes.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">No PIN codes configured. Access is allowed from all PIN codes across India.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
