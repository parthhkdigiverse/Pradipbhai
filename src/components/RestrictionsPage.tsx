import { useState } from 'react';
import { Shield, MapPin, Clock, Smartphone, Plus, Trash2, Save, Map } from 'lucide-react';

export function RestrictionsPage() {
  const [ipWhitelist, setIpWhitelist] = useState<string[]>(['192.168.1.100', '10.0.0.50']);
  const [newIp, setNewIp] = useState('');
  
  const [enableTimeRestrictions, setEnableTimeRestrictions] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  
  const [enableGeoRestrictions, setEnableGeoRestrictions] = useState(true);
  const [allowedRegions, setAllowedRegions] = useState<string[]>(['India', 'United States']);
  const [newRegion, setNewRegion] = useState('');
  
  const [enableDeviceRestrictions, setEnableDeviceRestrictions] = useState(false);
  const [allowedDevices, setAllowedDevices] = useState<string[]>(['Corporate Laptops']);
  const [newDevice, setNewDevice] = useState('');

  const handleAddIp = () => {
    if (newIp && !ipWhitelist.includes(newIp)) {
      setIpWhitelist([...ipWhitelist, newIp]);
      setNewIp('');
    }
  };

  const handleAddRegion = () => {
    if (newRegion && !allowedRegions.includes(newRegion)) {
      setAllowedRegions([...allowedRegions, newRegion]);
      setNewRegion('');
    }
  };

  const handleAddDevice = () => {
    if (newDevice && !allowedDevices.includes(newDevice)) {
      setAllowedDevices([...allowedDevices, newDevice]);
      setNewDevice('');
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center z-10 relative">
        <h1 className="text-3xl font-bold text-gray-900 drop-shadow-sm">Access Restrictions</h1>
        <button className="glass-button bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl hover:bg-primary transition-all flex items-center gap-2">
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

        {/* Geo-Restrictions */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Geographic Restrictions</h3>
                <p className="text-xs text-gray-500">Block access outside approved regions</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={enableGeoRestrictions} onChange={(e) => setEnableGeoRestrictions(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
          
          <div className={`flex flex-col flex-1 ${!enableGeoRestrictions ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Enter Country/Region" 
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                className="flex-1 px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button onClick={handleAddRegion} className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors font-bold text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            
            <div className="bg-white/40 rounded-xl border border-white/60 overflow-hidden flex-1">
              {allowedRegions.map((region, index) => (
                <div key={index} className="flex justify-between items-center px-4 py-3 border-b border-white/40 last:border-0 hover:bg-white/60 transition-colors">
                  <span className="text-sm text-gray-700 font-medium flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {region}</span>
                  <button onClick={() => setAllowedRegions(allowedRegions.filter(r => r !== region))} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {allowedRegions.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">No regions restricted. Access is allowed from anywhere.</div>
              )}
            </div>
          </div>
        </div>

        {/* Device Restrictions */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Device Restrictions</h3>
                <p className="text-xs text-gray-500">Only allow approved device signatures</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={enableDeviceRestrictions} onChange={(e) => setEnableDeviceRestrictions(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>
          
          <div className={`flex flex-col flex-1 ${!enableDeviceRestrictions ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Enter Device Group" 
                value={newDevice}
                onChange={(e) => setNewDevice(e.target.value)}
                className="flex-1 px-4 py-2 bg-white/50 border border-white/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <button onClick={handleAddDevice} className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-colors font-bold text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
            
            <div className="bg-white/40 rounded-xl border border-white/60 overflow-hidden flex-1">
              {allowedDevices.map((device, index) => (
                <div key={index} className="flex justify-between items-center px-4 py-3 border-b border-white/40 last:border-0 hover:bg-white/60 transition-colors">
                  <span className="text-sm text-gray-700 font-medium">{device}</span>
                  <button onClick={() => setAllowedDevices(allowedDevices.filter(d => d !== device))} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {allowedDevices.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">No device groups restricted. Access is allowed from any device.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
