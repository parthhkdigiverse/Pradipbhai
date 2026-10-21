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
  Settings,
  FileText
} from 'lucide-react';

import { useData } from '../context/DataContext';

export function Sidebar({ currentPage, setCurrentPage, isCollapsed, setIsCollapsed }: { currentPage: string, setCurrentPage: (page: string) => void, isCollapsed?: boolean, setIsCollapsed?: (val: boolean | ((prev: boolean) => boolean)) => void }) {
  const { currentUserRole, hasTabPermission } = useData();

  const [isHovered, setIsHovered] = useState(false);
  const effectiveIsCollapsed = isCollapsed && !isHovered;
  
  // State for collapsible menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    dashboard: false,
    jobs: false,
    employees: false,
    sales: false,
    social: false,
    finance: false,
    security: false,
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
        finance: false,
        security: false,
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
    { name: 'Product', group: 'Production' },
    { name: 'Vendors', group: 'Production' },
    { name: 'Staff', group: 'HR' },
    { name: 'Attendance', group: 'HR' },
    { name: 'Work Logs', group: 'HR' },
    { name: 'Daily Progress', group: 'HR' },
    { name: 'Employee of the Month', group: 'HR' },
    { name: 'Payroll', group: 'HR' },
    { name: 'Leaves', group: 'HR' },
    { name: 'Holidays', group: 'HR' },
    { name: 'Clients', group: 'Sales' },
    { name: 'Leads', group: 'Sales' },
    { name: 'Invoices', group: 'Finance' },
    { name: 'Social Media', group: 'Main' },
    { name: 'Reports', group: 'Main' },
    { name: 'Security', group: 'Main' },
    { name: 'Settings', group: 'Main' },
  ];

  const suggestions = searchQuery 
    ? allItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <aside onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`flex-shrink-0 glass-panel border-r border-white/40 flex flex-col h-screen fixed top-0 left-0 overflow-y-auto z-50 hidden md:flex custom-scrollbar shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ${effectiveIsCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/40 flex-shrink-0 sticky top-0 backdrop-blur-xl bg-white/40 z-10 overflow-hidden">
        {effectiveIsCollapsed ? (
          <div className="w-full flex items-center justify-center">
            <img 
              src="/alpha-icon.png" 
              alt="Alpha Creative" 
              className="w-8 h-8 object-contain transition-transform duration-300 hover:scale-110" 
            />
          </div>
        ) : (
          <div className="flex items-center px-2 py-1">
            <img 
              src="/alpha-logo.png" 
              alt="Alpha Creative Hub" 
              className="h-10 w-auto max-w-[200px] object-contain transition-all duration-300" 
            />
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        
        {/* Search Bar */}
        <div className="mb-6 relative z-50">
          {effectiveIsCollapsed ? (
            <div className="w-full flex justify-center py-2 text-gray-500 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => setIsCollapsed?.(false)} title="Search">
              <Search className="w-5 h-5" />
            </div>
          ) : (
            <>
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2 glass-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-gray-800 placeholder:text-gray-500"
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
                    suggestions.map((item, idx) => {
                      const pageKey = item.name.toLowerCase() === 'dashboard' ? 'dashboard' : item.name.toLowerCase().replace(/\s+/g, '-');
                      return (
                        <button 
                          key={idx} 
                          onClick={() => {
                            setCurrentPage(pageKey);
                            setSearchQuery('');
                          }} 
                          className="flex flex-col px-3 py-2 hover:bg-gray-100 transition-colors text-left w-full"
                        >
                          <span className="text-sm font-medium text-gray-800">{item.name}</span>
                          <span className="text-[10px] text-gray-500">{item.group}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-1">
          
          {/* Dashboard */}
          {hasTabPermission(currentUserRole, 'dashboard') && (
            <button 
              onClick={() => setCurrentPage('dashboard')}
              title={effectiveIsCollapsed ? 'Dashboard' : undefined}
              className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm transition-all ${
                currentPage === 'dashboard' ? 'bg-white/60 text-primary font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/80' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Dashboard</span>
            </button>
          )}

          {/* Job & Production Management */}
          {(hasTabPermission(currentUserRole, 'projects') || hasTabPermission(currentUserRole, 'jobs') || hasTabPermission(currentUserRole, 'catalog') || hasTabPermission(currentUserRole, 'vendors')) && (
            <div>
              <button 
                onClick={() => {
                  if (effectiveIsCollapsed) {
                    setIsCollapsed?.(false);
                    setOpenMenus(prev => ({ ...prev, jobs: true }));
                  } else {
                    toggleMenu('jobs');
                  }
                }}
                title={effectiveIsCollapsed ? 'Production' : undefined}
                className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Briefcase className="w-5 h-5 flex-shrink-0" />
                  <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Production</span>
                </div>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${openMenus.jobs ? 'rotate-180' : ''} ${effectiveIsCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[16px] opacity-100'}`} />
              </button>
              <div className={`pl-9 space-y-1 mt-1 overflow-hidden transition-all duration-300 ${!effectiveIsCollapsed && openMenus.jobs ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {hasTabPermission(currentUserRole, 'projects') && (
                    <button onClick={() => setCurrentPage('projects')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'projects' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Projects
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'jobs') && (
                    <button onClick={() => setCurrentPage('jobs')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'jobs' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Jobs
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'catalog') && (
                    <button onClick={() => setCurrentPage('catalog')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'catalog' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Product
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'vendors') && (
                    <button onClick={() => setCurrentPage('vendors')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'vendors' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Vendors
                    </button>
                  )}
                </div>
            </div>
          )}

          {/* HR Management */}
          {(hasTabPermission(currentUserRole, 'staff') || hasTabPermission(currentUserRole, 'attendance') || hasTabPermission(currentUserRole, 'worklogs') || hasTabPermission(currentUserRole, 'daily-progress') || hasTabPermission(currentUserRole, 'employee-of-month') || hasTabPermission(currentUserRole, 'payroll') || hasTabPermission(currentUserRole, 'leaves') || hasTabPermission(currentUserRole, 'holidays')) && (
            <div>
              <button 
                onClick={() => {
                  if (effectiveIsCollapsed) {
                    setIsCollapsed?.(false);
                    setOpenMenus(prev => ({ ...prev, hr: true }));
                  } else {
                    toggleMenu('hr');
                  }
                }}
                title={effectiveIsCollapsed ? 'HR' : undefined}
                className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Users className="w-5 h-5 flex-shrink-0" />
                  <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>HR</span>
                </div>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${openMenus.hr ? 'rotate-180' : ''} ${effectiveIsCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[16px] opacity-100'}`} />
              </button>
              <div className={`pl-9 space-y-1 mt-1 overflow-hidden transition-all duration-300 ${!effectiveIsCollapsed && openMenus.hr ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  {hasTabPermission(currentUserRole, 'staff') && (
                    <button onClick={() => setCurrentPage('staff')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'staff' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Staff
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'attendance') && (
                    <button onClick={() => setCurrentPage('attendance')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'attendance' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Attendance
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'worklogs') && (
                    <button onClick={() => setCurrentPage('worklogs')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'worklogs' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Work Logs
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'daily-progress') && (
                    <button onClick={() => setCurrentPage('daily-progress')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'daily-progress' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Daily Progress
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'employee-of-month') && (
                    <button onClick={() => setCurrentPage('employee-of-month')} className={`w-full text-left flex items-center justify-between px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'employee-of-month' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      <span className="truncate">Employee of the Month</span>
                      <span className="text-xs">🏆</span>
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'payroll') && (
                    <button onClick={() => setCurrentPage('payroll')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'payroll' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Payroll
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'leaves') && (
                    <button onClick={() => setCurrentPage('leaves')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'leaves' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Leaves
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'holidays') && (
                    <button onClick={() => setCurrentPage('holidays')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'holidays' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Holidays
                    </button>
                  )}
                </div>
            </div>
          )}

          {/* Sales & Client Management */}
          {(hasTabPermission(currentUserRole, 'clients') || hasTabPermission(currentUserRole, 'leads')) && (
            <div>
              <button 
                onClick={() => {
                  if (effectiveIsCollapsed) {
                    setIsCollapsed?.(false);
                    setOpenMenus(prev => ({ ...prev, sales: true }));
                  } else {
                    toggleMenu('sales');
                  }
                }}
                title={effectiveIsCollapsed ? 'Sales' : undefined}
                className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Handshake className="w-5 h-5 flex-shrink-0" />
                  <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Sales</span>
                </div>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${openMenus.sales ? 'rotate-180' : ''} ${effectiveIsCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[16px] opacity-100'}`} />
              </button>
              <div className={`pl-9 space-y-1 mt-1 overflow-hidden transition-all duration-300 ${!effectiveIsCollapsed && openMenus.sales ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {hasTabPermission(currentUserRole, 'clients') && (
                    <button onClick={() => setCurrentPage('clients')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'clients' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Clients
                    </button>
                  )}
                  {hasTabPermission(currentUserRole, 'leads') && (
                    <button onClick={() => setCurrentPage('leads')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'leads' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                      Leads
                    </button>
                  )}
                </div>
            </div>
          )}

          {/* Social Media Management */}
          {hasTabPermission(currentUserRole, 'social') && (
            <button onClick={() => setCurrentPage('social')} title={effectiveIsCollapsed ? 'Social Media' : undefined} className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm transition-all mt-2 ${currentPage === 'social' ? 'bg-white/60 text-primary font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/80' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'}`}>
              <Megaphone className="w-5 h-5 flex-shrink-0" />
              <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Social Media</span>
            </button>
          )}

          {/* Finance Management */}
          {hasTabPermission(currentUserRole, 'invoices') && (
            <div>
              <button 
                onClick={() => {
                  if (effectiveIsCollapsed) {
                    setIsCollapsed?.(false);
                    setOpenMenus(prev => ({ ...prev, finance: true }));
                  } else {
                    toggleMenu('finance');
                  }
                }}
                title={effectiveIsCollapsed ? 'Finance' : undefined}
                className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Finance</span>
                </div>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${openMenus.finance ? 'rotate-180' : ''} ${effectiveIsCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[16px] opacity-100'}`} />
              </button>
              <div className={`pl-9 space-y-1 mt-1 overflow-hidden transition-all duration-300 ${!effectiveIsCollapsed && openMenus.finance ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <button onClick={() => setCurrentPage('invoices')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'invoices' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                    Invoices
                  </button>
                </div>
            </div>
          )}

          {/* Independent Items */}
          {hasTabPermission(currentUserRole, 'chat') && (
            <button onClick={() => setCurrentPage('chat')} title={effectiveIsCollapsed ? 'Chat' : undefined} className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm transition-all mt-2 ${currentPage === 'chat' ? 'bg-white/60 text-primary font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/80' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'}`}>
              <MessageSquare className="w-5 h-5 flex-shrink-0" />
              <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Chat</span>
            </button>
          )}

          {hasTabPermission(currentUserRole, 'reports') && (
            <button onClick={() => setCurrentPage('reports')} title={effectiveIsCollapsed ? 'Reports' : undefined} className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm transition-all mt-2 ${currentPage === 'reports' ? 'bg-white/60 text-primary font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/80' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'}`}>
              <LineChart className="w-5 h-5 flex-shrink-0" />
              <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Reports</span>
            </button>
          )}

          {/* Security Management */}
          {hasTabPermission(currentUserRole, 'security') && (
            <div>
              <button 
                onClick={() => {
                  if (effectiveIsCollapsed) {
                    setIsCollapsed?.(false);
                    setOpenMenus(prev => ({ ...prev, security: true }));
                  } else {
                    toggleMenu('security');
                  }
                }}
                title={effectiveIsCollapsed ? 'Security' : undefined}
                className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm text-gray-600 hover:bg-white/40 hover:text-gray-900 transition-all mt-2`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Security</span>
                </div>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-all duration-300 ${openMenus.security ? 'rotate-180' : ''} ${effectiveIsCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[16px] opacity-100'}`} />
              </button>
              <div className={`pl-9 space-y-1 mt-1 overflow-hidden transition-all duration-300 ${!effectiveIsCollapsed && openMenus.security ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <button onClick={() => setCurrentPage('permissions')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'permissions' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                    Roles & Permissions
                  </button>
                  <button onClick={() => setCurrentPage('restrictions')} className={`w-full text-left block px-3 py-2 text-sm relative truncate rounded-lg transition-colors ${currentPage === 'restrictions' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-white/30'}`}>
                    Restrictions
                  </button>
                </div>
            </div>
          )}

          {hasTabPermission(currentUserRole, 'settings') && (
            <button onClick={() => setCurrentPage('settings')} title={effectiveIsCollapsed ? 'Settings' : undefined} className={`w-full flex items-center ${effectiveIsCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} rounded-xl text-sm transition-all mt-2 ${currentPage === 'settings' ? 'bg-white/60 text-primary font-semibold' : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'}`}>
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span className={`truncate transition-all duration-300 overflow-hidden ${effectiveIsCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'}`}>Settings</span>
            </button>
          )}

        </div>
        
      </div>
    </aside>
  );
}
