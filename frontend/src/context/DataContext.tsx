import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from './SettingsContext';

const API_BASE_URL = '/api';

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: 'National' | 'Regional' | 'Company';
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  type: 'Casual' | 'Sick' | 'Earned' | 'Unpaid';
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
  reviewedBy?: string;
  reviewNote?: string;
  reviewedOn?: string;
}

export interface LeaveBalance {
  staffId: string;
  casual: number;
  sick: number;
  earned: number;
}

export interface DailyTask {
  id: string;
  description: string;
  status: "done" | "pending";
}

export interface DailyRecord {
  id: string;
  employeeName: string;
  role: string;
  department?: string;
  submittedAt: string;
  date: string;
  tasksDone: DailyTask[];
  tasksPending: DailyTask[];
  verificationStatus: "Pending" | "Verified";
  rating?: number;
  managerRemarks?: string;
  verifiedBy?: string;
}

interface DataContextType {
  leads: any[];
  setLeads: React.Dispatch<React.SetStateAction<any[]>>;
  updateLead: (id: string, updateData: any) => Promise<any>;
  deleteLead: (id: string) => Promise<void>;
  
  clients: any[];
  setClients: React.Dispatch<React.SetStateAction<any[]>>;
  addClient: (clientData: any) => Promise<any>;
  updateClient: (id: string, updateData: any) => Promise<any>;
  deleteClient: (id: string) => Promise<void>;

  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  
  staff: any[];
  setStaff: React.Dispatch<React.SetStateAction<any[]>>;
  addStaff: (staffData: any) => Promise<any>;
  updateStaff: (id: string, updateData: any) => Promise<any>;
  deleteStaff: (id: string) => Promise<void>;

  attendance: any[];
  setAttendance: React.Dispatch<React.SetStateAction<any[]>>;
  addAttendance: (attData: any) => Promise<any>;

  payroll: any[];
  setPayroll: React.Dispatch<React.SetStateAction<any[]>>;
  addPayroll: (payrollData: any) => Promise<any>;
  updatePayroll: (id: string, updateData: any) => Promise<any>;

  vendors: any[];
  setVendors: React.Dispatch<React.SetStateAction<any[]>>;
  addVendor: (vendorData: any) => Promise<any>;
  deleteVendor: (id: string) => Promise<void>;

  jobs: any[];
  setJobs: React.Dispatch<React.SetStateAction<any[]>>;
  addJob: (jobData: any) => Promise<any>;
  updateJob: (id: string, updateData: any) => Promise<any>;
  deleteJob: (id: string) => Promise<void>;

  invoices: any[];
  setInvoices: React.Dispatch<React.SetStateAction<any[]>>;
  addInvoice: (invoiceData: any) => Promise<any>;
  updateInvoice: (id: string, updateData: any) => Promise<any>;
  deleteInvoice: (id: string) => Promise<void>;

  holidays: Holiday[];
  setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
  addHoliday: (holidayData: any) => Promise<any>;
  deleteHoliday: (id: string) => Promise<void>;

  leaveRequests: LeaveRequest[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  addLeaveRequest: (leaveData: any) => Promise<any>;
  updateLeaveRequest: (id: string, updateData: any) => Promise<any>;

  leaveBalances: LeaveBalance[];
  setLeaveBalances: React.Dispatch<React.SetStateAction<LeaveBalance[]>>;
  
  convertLeadToClient: (lead: any) => void;
  addProject: (clientId: string, projectData: any) => void;
  updateProject: (clientId: string, projectIndex: number, projectData: any) => void;
  
  activeFilterIntent: { page: string, filterKey: string, filterValue: string, jobId?: string } | null;
  setActiveFilterIntent: React.Dispatch<React.SetStateAction<{ page: string, filterKey: string, filterValue: string, jobId?: string } | null>>;
  
  isPunchedIn: boolean;
  setIsPunchedIn: React.Dispatch<React.SetStateAction<boolean>>;
  punchInTime: number | null;
  setPunchInTime: React.Dispatch<React.SetStateAction<number | null>>;
  
  activeJobTracker: { jobId: string, startTime: number } | null;
  setActiveJobTracker: React.Dispatch<React.SetStateAction<{ jobId: string, startTime: number } | null>>;
  
  workLogs: any[];
  setWorkLogs: React.Dispatch<React.SetStateAction<any[]>>;
  addWorkLog: (logData: any) => Promise<any>;
  deleteWorkLog: (id: string) => Promise<void>;

  dailyRatings: Record<string, number>;
  setDailyRatings: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  updateDailyRating: (userName: string, date: string, rating: number) => void;

  dailyProgressRecords: DailyRecord[];
  setDailyProgressRecords: React.Dispatch<React.SetStateAction<DailyRecord[]>>;
  addDailyProgress: (progressData: any) => Promise<any>;
  updateDailyProgress: (id: string, updateData: any) => Promise<any>;
  
  rolePermissions: Record<string, Record<string, boolean>>;
  toggleRolePermission: (role: string, action: string) => void;
  hasPermission: (role: string, action: string) => boolean;
  hasTabPermission: (role: string, tabKey: string) => boolean;

  currentUserRole: string;
  setCurrentUserRole: React.Dispatch<React.SetStateAction<string>>;
  currentUser: { id: string; name: string; email: string; role: string };
  refreshApiData: () => Promise<void>;
}

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  'Admin': {
    'View Dashboard': true, 'View Metrics': true, 'Export Data': true,
    'View Projects': true, 'Create/Edit Projects': true,
    'View Jobs': true, 'Create Job': true, 'Edit Job': true, 'Delete Job': true,
    'View Catalog': true, 'Manage Products': true,
    'View Vendors': true, 'Manage Vendors': true,
    'View Staff': true, 'Create/Edit Staff': true, 'Delete Staff': true,
    'View Attendance': true, 'Punch In/Out': true,
    'View Work Logs': true, 'Add Work Log': true,
    'View Daily Progress': true, 'Verify & Rate Reports': true,
    'View Payroll': true, 'Manage Payroll': true,
    'View Leaves': true, 'Apply Leave': true, 'Approve/Reject Leaves': true,
    'View Holidays': true, 'Manage Holidays': true,
    'View Clients': true, 'Create/Edit Clients': true, 'Delete Clients': true,
    'View Leads': true, 'Create/Edit Leads': true, 'Delete Leads': true,
    'View Social Media': true, 'Manage Social Posts': true,
    'View Invoices': true, 'Create/Edit Invoices': true, 'Delete Invoices': true,
    'Access Chat': true,
    'View Reports': true, 'Export Reports': true,
    'View Security': true, 'Edit Permissions': true,
    'View Settings': true, 'Change System Settings': true
  },
  'Manager': {
    'View Dashboard': true, 'View Metrics': true, 'Export Data': true,
    'View Projects': true, 'Create/Edit Projects': true,
    'View Jobs': true, 'Create Job': true, 'Edit Job': true, 'Delete Job': false,
    'View Catalog': true, 'Manage Products': true,
    'View Vendors': true, 'Manage Vendors': true,
    'View Staff': true, 'Create/Edit Staff': true, 'Delete Staff': false,
    'View Attendance': true, 'Punch In/Out': true,
    'View Work Logs': true, 'Add Work Log': true,
    'View Daily Progress': true, 'Verify & Rate Reports': true,
    'View Payroll': true, 'Manage Payroll': true,
    'View Leaves': true, 'Apply Leave': true, 'Approve/Reject Leaves': true,
    'View Holidays': true, 'Manage Holidays': true,
    'View Clients': true, 'Create/Edit Clients': true, 'Delete Clients': false,
    'View Leads': true, 'Create/Edit Leads': true, 'Delete Leads': false,
    'View Social Media': true, 'Manage Social Posts': true,
    'View Invoices': true, 'Create/Edit Invoices': true, 'Delete Invoices': false,
    'Access Chat': true,
    'View Reports': true, 'Export Reports': true,
    'View Security': false, 'Edit Permissions': false,
    'View Settings': false, 'Change System Settings': false
  },
  'Employee': {
    'View Dashboard': true, 'View Metrics': true, 'Export Data': false,
    'View Projects': true, 'Create/Edit Projects': false,
    'View Jobs': true, 'Create Job': false, 'Edit Job': false, 'Delete Job': false,
    'View Catalog': true, 'Manage Products': false,
    'View Vendors': false, 'Manage Vendors': false,
    'View Staff': false, 'Create/Edit Staff': false, 'Delete Staff': false,
    'View Attendance': true, 'Punch In/Out': true,
    'View Work Logs': true, 'Add Work Log': true,
    'View Daily Progress': true, 'Verify & Rate Reports': false,
    'View Payroll': false, 'Manage Payroll': false,
    'View Leaves': true, 'Apply Leave': true, 'Approve/Reject Leaves': false,
    'View Holidays': true, 'Manage Holidays': false,
    'View Clients': false, 'Create/Edit Clients': false, 'Delete Clients': false,
    'View Leads': false, 'Create/Edit Leads': false, 'Delete Leads': false,
    'View Social Media': false, 'Manage Social Posts': false,
    'View Invoices': false, 'Create/Edit Invoices': false, 'Delete Invoices': false,
    'Access Chat': true,
    'View Reports': false, 'Export Reports': false,
    'View Security': false, 'Edit Permissions': false,
    'View Settings': false, 'Change System Settings': false
  }
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    return localStorage.getItem('userRole') || 'Admin';
  });
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('rolePermissions');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_PERMISSIONS;
  });

  useEffect(() => {
    // Only fetch permissions if user is authenticated
    const token = localStorage.getItem('authToken');
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    if (!token && !isAuth) return;

    const fetchPerms = async () => {
      try {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE_URL}/permissions`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            setRolePermissions(data);
            localStorage.setItem('rolePermissions', JSON.stringify(data));
          }
        }
      } catch (e) {
        console.warn("Could not fetch remote permissions defaults:", e);
      }
    };
    fetchPerms();
  }, []);

  const getRoleMap = (role: string): Record<string, boolean> => {
    const defaults = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['Employee'] || {};
    const saved = rolePermissions[role] || {};
    return { ...defaults, ...saved };
  };

  const toggleRolePermission = async (role: string, action: string) => {
    // Optimistically update local state
    setRolePermissions(prev => {
      const currentRoleObj = {
        ...(DEFAULT_PERMISSIONS[role] || {}),
        ...(prev[role] || {})
      };
      const updated = {
        ...prev,
        [role]: {
          ...currentRoleObj,
          [action]: !currentRoleObj[action]
        }
      };
      localStorage.setItem('rolePermissions', JSON.stringify(updated));
      return updated;
    });

    // Persist change to FastAPI MySQL DB
    try {
      const res = await fetch(`${API_BASE_URL}/permissions/toggle`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ role, action })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          setRolePermissions(data);
          localStorage.setItem('rolePermissions', JSON.stringify(data));
        }
      }
    } catch (err) {
      console.warn("Backend permissions toggle sync notice:", err);
    }
  };

  const hasPermission = (role: string, action: string): boolean => {
    // 1. Check if logged-in staff member has a specific individual permission override
    const email = localStorage.getItem('userEmail') || '';
    const currentStaffObj = staff.find(s => s.email?.toLowerCase() === email.trim().toLowerCase());
    
    if (currentStaffObj && currentStaffObj.permissions && typeof currentStaffObj.permissions === 'object') {
      if (currentStaffObj.permissions[action] !== undefined) {
        return !!currentStaffObj.permissions[action];
      }
    }

    // 2. Fallback to system role permission matrix
    const roleMap = getRoleMap(role);
    if (roleMap[action] !== undefined) {
      return !!roleMap[action];
    }
    return role === 'Admin';
  };

  const hasTabPermission = (role: string, tabKey: string): boolean => {
    const roleMap = getRoleMap(role);

    const tabPermissionKeys: Record<string, string> = {
      'dashboard': 'View Dashboard',
      'projects': 'View Projects',
      'jobs': 'View Jobs',
      'catalog': 'View Catalog',
      'product': 'View Catalog',
      'vendors': 'View Vendors',
      'staff': 'View Staff',
      'attendance': 'View Attendance',
      'worklogs': 'View Work Logs',
      'daily-progress': 'View Daily Progress',
      'payroll': 'View Payroll',
      'leaves': 'View Leaves',
      'holidays': 'View Holidays',
      'clients': 'View Clients',
      'leads': 'View Leads',
      'social': 'View Social Media',
      'invoices': 'View Invoices',
      'chat': 'Access Chat',
      'reports': 'View Reports',
      'permissions': 'Edit Permissions',
      'restrictions': 'View Security',
      'security': 'View Security',
      'settings': 'View Settings'
    };

    const key = tabPermissionKeys[tabKey.toLowerCase()];
    if (key && roleMap[key] !== undefined) {
      return !!roleMap[key];
    }
    return role === 'Admin';
  };

  const [activeFilterIntent, setActiveFilterIntent] = useState<{ page: string, filterKey: string, filterValue: string, jobId?: string } | null>(null);

  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [dailyRatings, setDailyRatings] = useState<Record<string, number>>({});
  const [dailyProgressRecords, setDailyProgressRecords] = useState<DailyRecord[]>([]);

  const [isPunchedIn, setIsPunchedIn] = useState<boolean>(false);
  const [punchInTime, setPunchInTime] = useState<number | null>(null);
  const [activeJobTracker, setActiveJobTracker] = useState<{ jobId: string, startTime: number } | null>(null);
  const [workLogs, setWorkLogs] = useState<any[]>([]);

  const { autoConvertLeads } = useSettings();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Universal authenticated fetch — always includes Authorization header
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || `HTTP ${res.status}`);
    }
    return res.json();
  };

  // Fetch live API data from FastAPI backend
  const refreshApiData = async () => {
    try {
      const headers = getAuthHeaders();
      const token = localStorage.getItem('authToken');
      // Only auto-logout on 401 if we have a real JWT token (not a fallback/offline token)
      const isRealToken = token && token !== 'fallback-session-token' && token !== 'session-active-token';

      const fetchWithAuth = async (url: string) => {
        const res = await fetch(url, { headers });
        if (res.status === 401 && isRealToken) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('isAuthenticated');
          window.location.href = '/';
          throw new Error('Unauthorized');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      };

      const [clientsRes, jobsRes, invoicesRes, payrollRes, progressRes, leadsRes, staffRes, attRes, holRes, leaveRes, workRes, venRes, permRes] = await Promise.allSettled([
        fetchWithAuth(`${API_BASE_URL}/clients`),
        fetchWithAuth(`${API_BASE_URL}/jobs`),
        fetchWithAuth(`${API_BASE_URL}/invoices`),
        fetchWithAuth(`${API_BASE_URL}/payroll`),
        fetchWithAuth(`${API_BASE_URL}/daily-progress`),
        fetchWithAuth(`${API_BASE_URL}/leads`),
        fetchWithAuth(`${API_BASE_URL}/staff`),
        fetchWithAuth(`${API_BASE_URL}/attendance`),
        fetchWithAuth(`${API_BASE_URL}/holidays`),
        fetchWithAuth(`${API_BASE_URL}/leaves/requests`),
        fetchWithAuth(`${API_BASE_URL}/worklogs`),
        fetchWithAuth(`${API_BASE_URL}/vendors`),
        fetchWithAuth(`${API_BASE_URL}/permissions`),
      ]);

      if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value)) setClients(clientsRes.value);
      if (jobsRes.status === 'fulfilled' && Array.isArray(jobsRes.value)) setJobs(jobsRes.value);
      if (invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value)) setInvoices(invoicesRes.value);
      if (payrollRes.status === 'fulfilled' && Array.isArray(payrollRes.value)) setPayroll(payrollRes.value);
      if (progressRes.status === 'fulfilled' && Array.isArray(progressRes.value)) setDailyProgressRecords(progressRes.value);
      if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value)) setLeads(leadsRes.value);
      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) setStaff(staffRes.value);
      if (attRes.status === 'fulfilled' && Array.isArray(attRes.value)) setAttendance(attRes.value);
      if (holRes.status === 'fulfilled' && Array.isArray(holRes.value)) setHolidays(holRes.value);
      if (leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value)) {
        setLeaveRequests(leaveRes.value.map((l: any) => ({
          ...l,
          staffId: l.staff_id || l.staffId,
          staffName: l.staff_name || l.staffName,
          fromDate: l.from_date || l.fromDate,
          toDate: l.to_date || l.toDate,
          appliedOn: l.applied_on || l.appliedOn,
          reviewedBy: l.reviewed_by || l.reviewedBy,
          reviewNote: l.review_note || l.reviewNote,
          reviewedOn: l.reviewed_on || l.reviewedOn
        })));
      }
      if (workRes.status === 'fulfilled' && Array.isArray(workRes.value)) setWorkLogs(workRes.value);
      if (venRes.status === 'fulfilled' && Array.isArray(venRes.value)) setVendors(venRes.value);
      if (permRes.status === 'fulfilled' && permRes.value && typeof permRes.value === 'object') {
        setRolePermissions(permRes.value);
        localStorage.setItem('rolePermissions', JSON.stringify(permRes.value));
      }
    } catch (err) {
      console.warn("FastAPI Backend connecting...", err);
    }
  };

  useEffect(() => {
    // Only fetch data if user is authenticated — prevents API calls on login page
    const token = localStorage.getItem('authToken');
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    if (!token && !isAuth) return;
    refreshApiData();
  }, []);

  // Clients API
  const addClient = async (clientData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/clients`, { method: 'POST', body: JSON.stringify(clientData) });
      setClients(prev => [data, ...prev]);
      return data;
    } catch {
      setClients(prev => [clientData, ...prev]);
      return clientData;
    }
  };

  const updateClient = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/clients/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setClients(prev => prev.map(c => c.id === id ? data : c));
      return data;
    } catch {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updateData } : c));
    }
  };

  const deleteClient = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE' }); } catch {}
    setClients(prev => prev.filter(c => c.id !== id));
  };

  // Jobs API
  const addJob = async (jobData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/jobs`, { method: 'POST', body: JSON.stringify(jobData) });
      setJobs(prev => [data, ...prev]);
      return data;
    } catch {
      setJobs(prev => [jobData, ...prev]);
      return jobData;
    }
  };

  const updateJob = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/jobs/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setJobs(prev => prev.map(j => j.id === id ? data : j));
      return data;
    } catch {
      setJobs(prev => prev.map(j => j.id === id ? { ...j, ...updateData } : j));
    }
  };

  const deleteJob = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/jobs/${id}`, { method: 'DELETE' }); } catch {}
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  // Invoices API
  const addInvoice = async (invoiceData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/invoices`, { method: 'POST', body: JSON.stringify(invoiceData) });
      setInvoices(prev => [data, ...prev]);
      return data;
    } catch {
      setInvoices(prev => [invoiceData, ...prev]);
      return invoiceData;
    }
  };

  const updateInvoice = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/invoices/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setInvoices(prev => prev.map(inv => inv.id === id ? data : inv));
      return data;
    } catch {
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updateData } : inv));
    }
  };

  const deleteInvoice = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/invoices/${id}`, { method: 'DELETE' }); } catch {}
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  // Payroll API
  const addPayroll = async (payrollData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/payroll`, { method: 'POST', body: JSON.stringify(payrollData) });
      setPayroll(prev => [data, ...prev]);
      return data;
    } catch {
      setPayroll(prev => [payrollData, ...prev]);
      return payrollData;
    }
  };

  const updatePayroll = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/payroll/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setPayroll(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch {
      setPayroll(prev => prev.map(p => p.id === id ? { ...p, ...updateData } : p));
    }
  };

  // Daily Progress API
  const addDailyProgress = async (progressData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/daily-progress`, { method: 'POST', body: JSON.stringify(progressData) });
      setDailyProgressRecords(prev => [data, ...prev]);
      return data;
    } catch {
      setDailyProgressRecords(prev => [progressData, ...prev]);
      return progressData;
    }
  };

  const updateDailyProgress = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/daily-progress/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setDailyProgressRecords(prev => prev.map(r => r.id === id ? data : r));
      return data;
    } catch {
      setDailyProgressRecords(prev => prev.map(r => r.id === id ? { ...r, ...updateData } : r));
    }
  };

  // Staff API
  const addStaff = async (staffData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/staff`, { method: 'POST', body: JSON.stringify(staffData) });
      setStaff(prev => [data, ...prev]);
      return data;
    } catch {
      setStaff(prev => [staffData, ...prev]);
      return staffData;
    }
  };

  const updateStaff = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/staff/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setStaff(prev => prev.map(s => s.id === id ? data : s));
      return data;
    } catch {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updateData } : s));
    }
  };

  const deleteStaff = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/staff/${id}`, { method: 'DELETE' }); } catch {}
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  // Leads API
  const updateLead = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/leads/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setLeads(prev => prev.map(l => l.id === id ? data : l));
      return data;
    } catch {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updateData } : l));
    }
  };

  const deleteLead = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/leads/${id}`, { method: 'DELETE' }); } catch {}
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  // Attendance API
  const addAttendance = async (attData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/attendance`, { method: 'POST', body: JSON.stringify(attData) });
      setAttendance(prev => [data, ...prev]);
      return data;
    } catch {
      setAttendance(prev => [attData, ...prev]);
      return attData;
    }
  };

  // Leave Requests API
  const addLeaveRequest = async (leaveData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/leaves/requests`, {
        method: 'POST',
        body: JSON.stringify({
          staff_id: leaveData.staffId || 'emp-001',
          staff_name: leaveData.staffName || 'Staff Member',
          type: leaveData.type,
          from_date: leaveData.fromDate,
          to_date: leaveData.toDate,
          days: leaveData.days,
          reason: leaveData.reason,
          status: leaveData.status || 'Pending',
          applied_on: leaveData.appliedOn
        })
      });
      setLeaveRequests(prev => [data, ...prev]);
      return data;
    } catch {
      setLeaveRequests(prev => [leaveData, ...prev]);
      return leaveData;
    }
  };

  const updateLeaveRequest = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/leaves/requests/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setLeaveRequests(prev => prev.map(r => r.id === id ? data : r));
      return data;
    } catch {
      setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, ...updateData } : r));
    }
  };

  // Holidays API
  const addHoliday = async (holidayData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/holidays`, { method: 'POST', body: JSON.stringify(holidayData) });
      setHolidays(prev => [...prev, data]);
      return data;
    } catch {
      setHolidays(prev => [...prev, holidayData]);
      return holidayData;
    }
  };

  const deleteHoliday = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/holidays/${id}`, { method: 'DELETE' }); } catch {}
    setHolidays(prev => prev.filter(h => h.id !== id));
  };

  // WorkLogs API
  const addWorkLog = async (logData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/worklogs`, { method: 'POST', body: JSON.stringify(logData) });
      setWorkLogs(prev => [data, ...prev]);
      return data;
    } catch {
      setWorkLogs(prev => [logData, ...prev]);
      return logData;
    }
  };

  const deleteWorkLog = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/worklogs/${id}`, { method: 'DELETE' }); } catch {}
    setWorkLogs(prev => prev.filter(w => w.id !== id));
  };

  // Vendors API
  const addVendor = async (vendorData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/vendors`, { method: 'POST', body: JSON.stringify(vendorData) });
      setVendors(prev => [data, ...prev]);
      return data;
    } catch {
      setVendors(prev => [vendorData, ...prev]);
      return vendorData;
    }
  };

  const deleteVendor = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/vendors/${id}`, { method: 'DELETE' }); } catch {}
    setVendors(prev => prev.filter(v => v.id !== id));
  };

  const convertLeadToClient = (lead: any) => {
    if (!autoConvertLeads) return;
    const newClient = {
      id: `client-${Date.now()}`,
      name: lead.contact || lead.company,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      status: 'Active',
    };
    addClient(newClient);
  };

  const addProject = (clientId: string, projectData: any) => {
    setClients((prevClients) => prevClients.map(c => {
      if (c.id === clientId) {
        const newProjects = [...(c.projects || []), { ...projectData }];
        return { ...c, projects: newProjects };
      }
      return c;
    }));
  };

  const updateProject = (clientId: string, projectIndex: number, projectData: any) => {
    setClients((prevClients) => prevClients.map(c => {
      if (c.id === clientId) {
        const newProjects = [...(c.projects || [])];
        if (projectIndex >= 0 && projectIndex < newProjects.length) {
          newProjects[projectIndex] = { ...projectData };
        }
        return { ...c, projects: newProjects };
      }
      return c;
    }));
  };

  const updateDailyRating = (userName: string, date: string, rating: number) => {
    setDailyRatings(prev => ({
      ...prev,
      [`${userName}_${date}`]: rating
    }));
  };

  return (
    <DataContext.Provider value={{
      leads, setLeads, updateLead, deleteLead,
      clients, setClients, addClient, updateClient, deleteClient,
      products, setProducts,
      staff, setStaff, addStaff, updateStaff, deleteStaff,
      attendance, setAttendance, addAttendance,
      payroll, setPayroll, addPayroll, updatePayroll,
      vendors, setVendors, addVendor, deleteVendor,
      jobs, setJobs, addJob, updateJob, deleteJob,
      invoices, setInvoices, addInvoice, updateInvoice, deleteInvoice,
      holidays, setHolidays, addHoliday, deleteHoliday,
      leaveRequests, setLeaveRequests, addLeaveRequest, updateLeaveRequest,
      leaveBalances, setLeaveBalances,
      convertLeadToClient,
      addProject,
      updateProject,
      activeFilterIntent,
      setActiveFilterIntent,
      isPunchedIn,
      setIsPunchedIn,
      punchInTime,
      setPunchInTime,
      activeJobTracker,
      setActiveJobTracker,
      workLogs,
      setWorkLogs,
      addWorkLog,
      deleteWorkLog,
      dailyRatings,
      setDailyRatings,
      updateDailyRating,
      dailyProgressRecords,
      setDailyProgressRecords,
      addDailyProgress,
      updateDailyProgress,
      rolePermissions,
      toggleRolePermission,
      hasPermission,
      hasTabPermission,
      currentUserRole,
      setCurrentUserRole,
      currentUser: (() => {
        const email = localStorage.getItem('userEmail') || 'admin@alphacreative.com';
        const found = staff.find(s => s.email?.toLowerCase() === email.trim().toLowerCase());
        if (found) {
          return {
            id: found.id,
            name: found.name,
            email: found.email,
            role: found.role || currentUserRole
          };
        }
        return {
          id: 'emp-admin',
          name: 'Admin',
          email,
          role: currentUserRole
        };
      })(),
      refreshApiData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
