import { useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase,
  Users,
  Handshake,
  Megaphone,
  MessageSquare,
  LineChart,
  Shield,
  ChevronDown,
  Search,
  X,
  Settings
} from 'lucide-react';

export function Sidebar({ currentPage, setCurrentPage }: { currentPage: string, setCurrentPage: (page: string) => void }) {
  
  // State for collapsible menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    dashboard: false,
    jobs: false,
    employees: false,
    sales: false,
    social: false,
  });

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => {
      // Create a state where all are closed
      const newState: Record<string, boolean> = {
        dashboard: false,
        jobs: false,
        employees: false,
        sales: false,
        social: false,
      };
      
      // If the clicked menu wasn't already open, open it
      if (!prev[menu]) {
        newState[menu] = true;
      }
      
      return newState;
    });
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  const allItems = [
    { name: 'Dashboard', group: 'Main' },
    { name: 'Jobs', group: 'Production' },
    { name: 'Catalog', group: 'Production' },
    { name: 'Vendors', group: 'Production' },
    { name: 'Staff', group: 'HR' },
    { name: 'Attendance', group: 'HR' },
    { name: 'Payroll', group: 'HR' },
    { name: 'Clients', group: 'Sales' },
    { name: 'Leads', group: 'Sales' },
    { name: 'Chat', group: 'Main' },
    { name: 'Reports', group: 'Main' },
    { name: 'Security', group: 'Main' },
    { name: 'Settings', group: 'Main' },
  ];

  const suggestions = searchQuery 
    ? allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <aside className="w-64 flex-shrink-0 glass-panel border-r border-white/40 flex flex-col h-screen fixed top-0 left-0 overflow-y-auto z-50 hidden md:flex custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/40 flex-shrink-0 sticky top-0 backdrop-blur-xl bg-white/20 z-10">
        <div className="flex items-center gap-2 font-bold text-xl text-gray-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
              <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
              <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          Dreams Timer
        </div>
      </div>

      <div className="p-4 flex-1">
        
        {/* Search Bar */}
        <div className="mb-6 relative z-50">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2 glass-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all text-gray-800 placeholder:text-gray-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl shadow-lg rounded-xl overflow-hidden py-1 z-[100] border border-gray-200">
              {suggestions.length > 0 ? (
                suggestions.map((item, idx) => (
                  <a key={idx} href="#" className="flex flex-col px-3 py-2 hover:bg-gray-100 transition-colors">
                    <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    <span className="text-[10px] text-gray-500">{item.group}</span>
                  </a>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1">
          
          {/* Dashboard */}
          <button 
            onClick={() => setCurrentPage('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              currentPage === 'dashboard' ? 'bg-white/60 text-blue-700 font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/80' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Dashboard</span>
          </button>

          {/* Job & Production Management */}
          <div>
            <button 
              onClick={() => toggleMenu('jobs')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Briefcase className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Production</span>
              </div>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${openMenus.jobs ? 'rotate-180' : ''}`} />
            </button>
            <div className={`pl-9 space-y-1 mt-1 overflow-hidden transition-all duration-300 ${openMenus.jobs ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <a href="#" className="block px-3 py-2 text-sm text-gray-500 hover:text-gray-900 relative truncate hover:bg-white/30 rounded-lg transition-colors">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-400"></span>
                Jobs
              </a>
              <a href="#" className="block px-3 py-2 text-sm text-gray-500 hover:text-gray-900 relative truncate hover:bg-white/30 rounded-lg transition-colors">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-400"></span>
                Catalog
              </a>
              <a href="#" className="block px-3 py-2 text-sm text-gray-500 hover:text-gray-900 relative truncate hover:bg-white/30 rounded-lg transition-colors">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-400"></span>
                Vendors
              </a>
            </div>
          </div>

          {/* Employees */}
          <div>
            <button 
              onClick={() => toggleMenu('employees')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Users className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Employees</span>
              </div>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${openMenus.employees ? 'rotate-180' : ''}`} />
            </button>
            <div className={`pl-9 space-y-1 mt-1 overflow-hidden transition-all duration-300 ${openMenus.employees ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <a href="#" className="block px-3 py-2 text-sm text-gray-500 hover:text-gray-900 relative truncate hover:bg-white/30 rounded-lg transition-colors">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-400"></span>
                Staff
              </a>
              <a href="#" className="block px-3 py-2 text-sm text-gray-500 hover:text-gray-900 relative truncate hover:bg-white/30 rounded-lg transition-colors">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-400"></span>
                Attendance
              </a>
              <a href="#" className="block px-3 py-2 text-sm text-gray-500 hover:text-gray-900 relative truncate hover:bg-white/30 rounded-lg transition-colors">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-400"></span>
                Payroll
              </a>
            </div>
          </div>

          {/* Sales & Client Management */}
          <div>
            <button 
              onClick={() => toggleMenu('sales')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Handshake className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">Sales</span>
              </div>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${openMenus.sales ? 'rotate-180' : ''}`} />
            </button>
            <div className={`pl-9 space-y-1 mt-1 overflow-hidden transition-all duration-300 ${openMenus.sales ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
              <button onClick={() => setCurrentPage('clients')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'clients' ? 'bg-white/60 text-blue-700 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-400"></span>
                Clients
              </button>
              <button onClick={() => setCurrentPage('leads')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'leads' ? 'bg-white/60 text-blue-700 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-px bg-gray-400"></span>
                Leads
              </button>
            </div>
          </div>

          {/* Social Media Management */}
          <button onClick={() => setCurrentPage('social')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mt-2 ${currentPage === 'social' ? 'bg-white/60 text-blue-700 font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/80' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'}`}>
            <Megaphone className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Social Media</span>
          </button>

          {/* Independent Items */}
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2">
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Chat</span>
          </a>

          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2">
            <LineChart className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Reports</span>
          </a>

          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2">
            <Shield className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Security</span>
          </a>

          <button onClick={() => setCurrentPage('settings')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mt-2 ${currentPage === 'settings' ? 'bg-white/60 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'}`}>
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Settings</span>
          </button>

        </div>
      </div>
    </aside>
  );
}
