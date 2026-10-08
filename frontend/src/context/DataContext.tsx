import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { localDateStr } from '../utils/dateUtils';

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
  type: 'Casual' | 'Sick' | 'Earned';
  fromDate: string;
  toDate: string;
  days: number;
  isHalfDay?: boolean;
  halfDaySession?: 'First Half' | 'Second Half';
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
  paid?: number;
}

export interface DailyTask {
  id: string;
  description: string;
  status: "done" | "pending";
}

export interface DailyRecord {
  id: string;
  employeeName: string;
  employee_name?: string;
  role: string;
  department?: string;
  submittedAt: string;
  submitted_at?: string;
  date: string;
  tasksDone: any[];
  tasks_done?: any[];
  tasksPending: any[];
  tasks_pending?: any[];
  verificationStatus: "Pending" | "Verified" | string;
  verification_status?: string;
  rating?: number;
  hoursLogged?: number;
  hours_logged?: number;
  managerRemarks?: string;
  manager_remarks?: string;
  verifiedBy?: string;
  verified_by?: string;
}

interface DataContextType {
  leads: any[];
  setLeads: React.Dispatch<React.SetStateAction<any[]>>;
  addLead: (leadData: any) => Promise<any>;
  updateLead: (id: string, updateData: any) => Promise<any>;
  deleteLead: (id: string) => Promise<void>;
  
  clients: any[];
  setClients: React.Dispatch<React.SetStateAction<any[]>>;
  addClient: (clientData: any) => Promise<any>;
  updateClient: (id: string, updateData: any) => Promise<any>;
  deleteClient: (id: string) => Promise<void>;

  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  addProduct: (productData: any) => Promise<any>;
  updateProduct: (id: string, updateData: any) => Promise<any>;
  deleteProduct: (id: string) => Promise<void>;
  
  staff: any[];
  setStaff: React.Dispatch<React.SetStateAction<any[]>>;
  addStaff: (staffData: any) => Promise<any>;
  updateStaff: (id: string, updateData: any) => Promise<any>;
  deleteStaff: (id: string) => Promise<void>;

  attendance: any[];
  setAttendance: React.Dispatch<React.SetStateAction<any[]>>;
  addAttendance: (attData: any) => Promise<any>;
  updateAttendance: (id: string, updateData: any) => Promise<any>;

  payroll: any[];
  setPayroll: React.Dispatch<React.SetStateAction<any[]>>;
  addPayroll: (payrollData: any) => Promise<any>;
  updatePayroll: (id: string, updateData: any) => Promise<any>;

  vendors: any[];
  setVendors: React.Dispatch<React.SetStateAction<any[]>>;
  addVendor: (vendorData: any) => Promise<any>;
  updateVendor: (id: string, updateData: any) => Promise<any>;
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
  deleteLeaveRequest: (id: string) => Promise<void>;

  fieldDuties: any[];
  setFieldDuties: React.Dispatch<React.SetStateAction<any[]>>;
  addFieldDuty: (dutyData: any) => Promise<any>;
  updateFieldDuty: (id: string, updateData: any) => Promise<any>;
  deleteFieldDuty: (id: string) => Promise<void>;

  leaveBalances: LeaveBalance[];
  setLeaveBalances: React.Dispatch<React.SetStateAction<LeaveBalance[]>>;
  
  convertLeadToClient: (lead: any) => void;
  addProject: (clientId: string, projectData: any) => Promise<any> | void;
  updateProject: (clientId: string, projectIndex: number, projectData: any) => Promise<any> | void;
  
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
  isPunchInModalOpen: boolean;
  setIsPunchInModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openPunchInModal: () => void;
  performAutoPunchOut: (overrideEndTime?: number) => Promise<void>;
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
        const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
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

  const currentUser = useMemo(() => {
    const email = localStorage.getItem('userEmail') || 'admin@alphacreative.com';
    const storedName = localStorage.getItem('userName') || 'Staff Member';
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
      id: localStorage.getItem('userId') || 'emp-user',
      name: storedName,
      email,
      role: currentUserRole
    };
  }, [staff, currentUserRole]);

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
  const [fieldDuties, setFieldDuties] = useState<any[]>([]);

  const [isPunchedIn, setIsPunchedIn] = useState<boolean>(false);
  const [punchInTime, setPunchInTime] = useState<number | null>(null);
  const [activeJobTrackerState, setActiveJobTrackerState] = useState<{ jobId: string, startTime: number } | null>(null);
  const [isPunchInModalOpen, setIsPunchInModalOpen] = useState<boolean>(false);

  const openPunchInModal = () => setIsPunchInModalOpen(true);

  const setActiveJobTracker = (val: { jobId: string, startTime: number } | null | ((prev: { jobId: string, startTime: number } | null) => { jobId: string, startTime: number } | null)) => {
    setActiveJobTrackerState(prev => typeof val === 'function' ? val(prev) : val);
  };
  const activeJobTracker = activeJobTrackerState;
  const [workLogs, setWorkLogs] = useState<any[]>([]);

  const { autoConvertLeads } = useSettings();

  const getAuthHeaders = (): Record<string, string> => {
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
      const msg = errBody?.detail || `HTTP ${res.status}`;
      console.error(`[apiFetch] ${options.method || 'GET'} ${url} → ${res.status}:`, msg);
      throw new Error(msg);
    }
    // 204 No Content (DELETE) — no body to parse
    if (res.status === 204) return null;
    return res.json();
  };

  // Fetch live API data directly from FastAPI / MySQL backend
  const normalizeClient = (c: any) => ({
    ...c,
    contact: c.contact || c.name || '',
    clientSince: c.clientSince || c.created_at || new Date().toISOString().split('T')[0],
    projects: c.projects || []
  });

  const normalizeJob = (j: any) => ({
    ...j,
    clientId: j.clientId || j.client_id || '',
    projectId: j.projectId || j.project_id || '',
    assignedStaffId: j.assignedStaffId || j.assigned_staff_id || '',
    teamId: j.teamId || j.assigned_staff_id || j.assignedStaffId || '',
    totalAmount: j.totalAmount !== undefined ? j.totalAmount : (j.total_amount || 0),
    paidAmount: j.paidAmount !== undefined ? j.paidAmount : 0,
    status: j.status || 'Pending',
    title: j.title || 'Untitled Job',
    type: j.type || 'Designing'
  });

  const normalizeAttendance = (a: any) => {
    const rawPunches = a.punches || (a.check_in || a.checkIn ? [{ in: a.check_in || a.checkIn, out: a.check_out || a.checkOut }] : []);
    const cleanPunches = Array.isArray(rawPunches) ? rawPunches.map((p: any, idx: number) => {
      if (!p.out && idx < rawPunches.length - 1) {
        return { ...p, out: rawPunches[idx + 1]?.in || p.in };
      }
      return p;
    }) : [];
    return {
      ...a,
      staffId: a.staff_id || a.staffId,
      staffName: a.staff_name || a.staffName,
      checkIn: a.check_in || a.checkIn,
      checkOut: a.check_out || a.checkOut,
      punches: cleanPunches,
      isLate: a.is_late !== undefined ? a.is_late : a.isLate,
      lateMinutes: a.late_minutes !== undefined ? a.late_minutes : a.lateMinutes,
      penaltyAmount: a.penalty_amount !== undefined ? a.penalty_amount : a.penaltyAmount,
      warningNote: a.warning_note || a.warningNote
    };
  };

  const normalizeLeaveRequest = (l: any) => ({
    ...l,
    staffId: l.staff_id || l.staffId,
    staffName: l.staff_name || l.staffName,
    fromDate: l.from_date || l.fromDate,
    toDate: l.to_date || l.toDate,
    appliedOn: l.applied_on || l.appliedOn,
    reviewedBy: l.reviewed_by || l.reviewedBy,
    reviewNote: l.review_note || l.reviewNote,
    reviewedOn: l.reviewed_on || l.reviewedOn
  });

  const normalizeWorkLog = (w: any) => ({
    ...w,
    userName: w.staff_name || w.userName,
    jobId: w.job_id || w.jobId,
    jobTitle: w.job_title || w.jobTitle,
    startTime: w.start_time || w.startTime,
    endTime: w.end_time || w.endTime
  });

  const refreshApiData = async () => {
    try {
      const headers = getAuthHeaders();
      const token = localStorage.getItem('authToken');
      const isRealToken = token && token !== 'fallback-session-token' && token !== 'session-active-token';

      const fetchWithAuth = async (url: string) => {
        const res = await fetch(url, { headers });
        if (!res.ok) {
          if (res.status === 401 && isRealToken) {
            localStorage.removeItem('authToken');
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      };

      const [clientsRes, jobsRes, invoicesRes, payrollRes, progressRes, leadsRes, staffRes, attRes, holRes, leaveRes, workRes, venRes, permRes, prodRes, fdRes] = await Promise.allSettled([
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
        fetchWithAuth(`${API_BASE_URL}/products`),
        fetchWithAuth(`${API_BASE_URL}/field-duties`),
      ]);

      if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value)) {
        setClients(clientsRes.value.map(normalizeClient));
      }
      if (jobsRes.status === 'fulfilled' && Array.isArray(jobsRes.value)) {
        const normalized = jobsRes.value.map(normalizeJob);
        normalized.sort((a: any, b: any) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        setJobs(normalized);
      }
      if (invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value)) {
        setInvoices(invoicesRes.value.map(normalizeInvoice));
      }
      if (payrollRes.status === 'fulfilled' && Array.isArray(payrollRes.value)) setPayroll(payrollRes.value);
      if (progressRes.status === 'fulfilled' && Array.isArray(progressRes.value)) {
        setDailyProgressRecords(progressRes.value.map((r: any) => normalizeDailyProgress(r)));
      }
      if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value)) setLeads(leadsRes.value);
      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) setStaff(staffRes.value);
      if (attRes.status === 'fulfilled' && Array.isArray(attRes.value)) {
        setAttendance(attRes.value.map(normalizeAttendance));
      }
      if (holRes.status === 'fulfilled' && Array.isArray(holRes.value)) setHolidays(holRes.value);
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) setProducts(prodRes.value);
      if (fdRes.status === 'fulfilled' && Array.isArray(fdRes.value)) setFieldDuties(fdRes.value);
      if (leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value)) {
        setLeaveRequests(leaveRes.value.map(normalizeLeaveRequest));
      }
      if (workRes.status === 'fulfilled' && Array.isArray(workRes.value)) {
        setWorkLogs(workRes.value.map(normalizeWorkLog));
      }
      if (venRes.status === 'fulfilled' && Array.isArray(venRes.value)) setVendors(venRes.value);
      if (permRes.status === 'fulfilled' && permRes.value && typeof permRes.value === 'object') {
        setRolePermissions(permRes.value);
      }
    } catch (err) {
      console.warn("FastAPI Backend connecting...", err);
    }
  };

  useEffect(() => {
    refreshApiData();
  }, []);

  useEffect(() => {
    if (!attendance || attendance.length === 0) return;
    const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
    const todayStr = localDateStr();
    const todayAtt = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffId && a.date === todayStr);

    if (todayAtt && todayAtt.punches && todayAtt.punches.length > 0) {
      const activePunch = todayAtt.punches.find((p: any) => !p.out);
      if (activePunch) {
        setIsPunchedIn(true);
        let calculatedTime = Date.now();
        if (activePunch.in) {
          const [h, m] = activePunch.in.split(':');
          const pDate = new Date();
          pDate.setHours(parseInt(h) || 0, parseInt(m) || 0, 0, 0);
          calculatedTime = pDate.getTime();
          setPunchInTime(calculatedTime);
        }

        // Auto-restore activeJobTracker if null but there is a job in Progress or an active punch with jobId
        if (!activeJobTrackerState) {
          if (activePunch.jobId) {
            setActiveJobTracker({ jobId: activePunch.jobId, startTime: calculatedTime });
          } else if (jobs && jobs.length > 0) {
            const progressJob = jobs.find((j: any) => j.status === 'Progress');
            if (progressJob) {
              setActiveJobTracker({ jobId: progressJob.id, startTime: calculatedTime });
            }
          }
        }
      } else {
        if (!activeJobTrackerState) {
          setIsPunchedIn(false);
        } else {
          setIsPunchedIn(true);
        }
      }
    } else if (activeJobTrackerState) {
      setIsPunchedIn(true);
    }
  }, [attendance, currentUser, staff, jobs, activeJobTrackerState]);

  // Clients API
  const addClient = async (clientData: any) => {
    try {
      const payload = {
        ...clientData,
        name: clientData.contact || clientData.company || 'Unknown'
      };
      const data = await apiFetch(`${API_BASE_URL}/clients`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizeClient(data);
      setClients(prev => [norm, ...prev]);
      return norm;
    } catch {
      const norm = normalizeClient(clientData);
      setClients(prev => [norm, ...prev]);
      return norm;
    }
  };

  const updateClient = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/clients/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      const norm = normalizeClient(data);
      setClients(prev => prev.map(c => c.id === id ? norm : c));
      return norm;
    } catch {
      setClients(prev => prev.map(c => c.id === id ? normalizeClient({ ...c, ...updateData }) : c));
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
      const norm = normalizeJob(data);
      setJobs(prev => [norm, ...prev]);
      return norm;
    } catch {
      const norm = normalizeJob(jobData);
      setJobs(prev => [norm, ...prev]);
      return norm;
    }
  };

  const updateJob = async (id: string, updateData: any) => {
    let resultData: any;
    try {
      const data = await apiFetch(`${API_BASE_URL}/jobs/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      resultData = normalizeJob(data);
      setJobs(prev => prev.map(j => j.id === id ? resultData : j));
    } catch {
      setJobs(prev => prev.map(j => {
        if (j.id === id) {
          resultData = normalizeJob({ ...j, ...updateData });
          return resultData;
        }
        return j;
      }));
    }

    // Auto-sync task into daily_progress in MySQL database if status is Under Review / Completed / Done
    const status = (updateData?.status || '').toLowerCase();
    if (status === 'under review' || status === 'completed' || status === 'done' || status === 'review') {
      const targetJob = (jobs || []).find(j => j.id === id) || resultData;
      const jobTitle = targetJob?.jobNo ? `[${targetJob.jobNo}] ${targetJob.title || ''}` : (targetJob?.title || id);
      const staffName = currentUser?.name || 'Staff Member';
      const userRole = currentUser?.role || 'Staff Member';
      syncDailyProgressForTask(staffName, userRole, jobTitle);
    }

    return resultData;
  };

  const deleteJob = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/jobs/${id}`, { method: 'DELETE' }); } catch {}
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const normalizeInvoice = (inv: any) => ({
    ...inv,
    invoiceNumber: inv.invoice_number || inv.invoiceNumber || '',
    clientId: inv.client_id || inv.clientId || '',
    jobIds: inv.job_ids || inv.jobIds || [],
    items: inv.custom_items || inv.items || [],
    issueDate: inv.date || inv.issueDate || '',
    dueDate: inv.due_date || inv.dueDate || '',
    invoiceType: inv.invoice_type || inv.invoiceType || 'Tax',
    taxRate: inv.tax_rate || inv.taxRate || '18'
  });

  // Invoices API
  const addInvoice = async (invoiceData: any) => {
    try {
      const payload = {
        ...invoiceData,
        invoice_number: invoiceData.invoiceNumber,
        client_id: invoiceData.clientId,
        job_ids: invoiceData.jobIds,
        custom_items: invoiceData.items,
        date: invoiceData.issueDate,
        due_date: invoiceData.dueDate,
        invoice_type: invoiceData.invoiceType,
        tax_rate: invoiceData.taxRate
      };
      const data = await apiFetch(`${API_BASE_URL}/invoices`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizeInvoice(data);
      setInvoices(prev => [norm, ...prev]);
      return norm;
    } catch {
      const norm = normalizeInvoice(invoiceData);
      setInvoices(prev => [norm, ...prev]);
      return norm;
    }
  };

  const updateInvoice = async (id: string, updateData: any) => {
    try {
      const payload = {
        ...updateData,
        invoice_number: updateData.invoiceNumber,
        client_id: updateData.clientId,
        job_ids: updateData.jobIds,
        custom_items: updateData.items,
        date: updateData.issueDate,
        due_date: updateData.dueDate,
        invoice_type: updateData.invoiceType,
        tax_rate: updateData.taxRate
      };
      const data = await apiFetch(`${API_BASE_URL}/invoices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const norm = normalizeInvoice(data);
      setInvoices(prev => prev.map(inv => inv.id === id ? norm : inv));
      return norm;
    } catch {
      setInvoices(prev => prev.map(inv => inv.id === id ? normalizeInvoice({ ...inv, ...updateData }) : inv));
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

  const parseTaskArray = (raw: any): string[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return [raw];
    }
    return [];
  };

  const normalizeDailyProgress = (r: any) => {
    if (!r) return r;
    const tasksDone = parseTaskArray(r.tasks_done !== undefined ? r.tasks_done : r.tasksDone);
    const tasksPending = parseTaskArray(r.tasks_pending !== undefined ? r.tasks_pending : r.tasksPending);
    return {
      ...r,
      employeeName: r.employee_name || r.employeeName || 'Staff Member',
      employee_name: r.employee_name || r.employeeName || 'Staff Member',
      verificationStatus: r.verification_status || r.verificationStatus || 'Pending',
      verification_status: r.verification_status || r.verificationStatus || 'Pending',
      managerRemarks: r.manager_remarks !== undefined ? r.manager_remarks : (r.managerRemarks || ''),
      manager_remarks: r.manager_remarks !== undefined ? r.manager_remarks : (r.managerRemarks || ''),
      verifiedBy: r.verified_by || r.verifiedBy || '',
      verified_by: r.verified_by || r.verifiedBy || '',
      tasksDone,
      tasks_done: tasksDone,
      tasksPending,
      tasks_pending: tasksPending,
      hoursLogged: r.hours_logged !== undefined ? r.hours_logged : (r.hoursLogged || 0),
      hours_logged: r.hours_logged !== undefined ? r.hours_logged : (r.hoursLogged || 0),
      submittedAt: r.submitted_at || r.submittedAt || ''
    };
  };

  // Daily Progress API
  const addDailyProgress = async (progressData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/daily-progress`, { method: 'POST', body: JSON.stringify(progressData) });
      const norm = normalizeDailyProgress(data);
      setDailyProgressRecords(prev => [norm, ...prev.filter(r => r.id !== norm.id)]);
      return norm;
    } catch {
      const norm = normalizeDailyProgress({ ...progressData, id: progressData.id || `prog-${Date.now()}` });
      setDailyProgressRecords(prev => [norm, ...prev]);
      return norm;
    }
  };

  const updateDailyProgress = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/daily-progress/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      const norm = normalizeDailyProgress(data);
      setDailyProgressRecords(prev => prev.map(r => r.id === id ? norm : r));
      return norm;
    } catch {
      setDailyProgressRecords(prev => prev.map(r => r.id === id ? normalizeDailyProgress({ ...r, ...updateData }) : r));
    }
  };

  const syncDailyProgressForTask = async (staffName: string, role: string, taskTitle: string, hoursAdded = 0) => {
    if (!staffName || !taskTitle) return;
    const todayStr = localDateStr();
    const existingProg = (dailyProgressRecords || []).find((p: any) => 
      ((p.employeeName || p.employee_name || '')?.toLowerCase() === staffName.toLowerCase()) && p.date === todayStr
    );

    if (existingProg) {
      const currentDone = Array.isArray(existingProg.tasksDone) ? existingProg.tasksDone : (Array.isArray(existingProg.tasks_done) ? existingProg.tasks_done : []);
      const updatedDone = Array.from(new Set([...currentDone, taskTitle]));
      const currentHours = Number(existingProg.hoursLogged || existingProg.hours_logged || 0);
      const updatedHours = Number((currentHours + hoursAdded).toFixed(1));
      await updateDailyProgress(existingProg.id, {
        tasks_done: updatedDone,
        hours_logged: updatedHours
      });
    } else {
      await addDailyProgress({
        employee_name: staffName,
        role: role || 'Staff Member',
        date: todayStr,
        tasks_done: [taskTitle],
        tasks_pending: [],
        hours_logged: hoursAdded > 0 ? hoursAdded : 0.1,
        verification_status: 'Pending',
        rating: 0
      });
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
  const addLead = async (leadData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/leads`, { method: 'POST', body: JSON.stringify(leadData) });
      setLeads(prev => [data, ...prev]);
      return data;
    } catch {
      setLeads(prev => [leadData, ...prev]);
      return leadData;
    }
  };

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

  // Products API
  const addProduct = async (productData: any) => {
    try {
      const payload = { ...productData, id: productData.id || `PROD-${Date.now()}` };
      const data = await apiFetch(`${API_BASE_URL}/products`, { method: 'POST', body: JSON.stringify(payload) });
      setProducts(prev => [data, ...prev]);
      return data;
    } catch {
      const fallbackPayload = { ...productData, id: productData.id || `PROD-${Date.now()}` };
      setProducts(prev => [fallbackPayload, ...prev]);
      return fallbackPayload;
    }
  };

  const updateProduct = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/products/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setProducts(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updateData } : p));
    }
  };

  const deleteProduct = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' }); } catch {}
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Attendance API
  const addAttendance = async (attData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/attendance`, { method: 'POST', body: JSON.stringify(attData) });
      const mapped = {
        ...data,
        staffId: data.staff_id || data.staffId,
        staffName: data.staff_name || data.staffName,
        checkIn: data.check_in || data.checkIn,
        checkOut: data.check_out || data.checkOut,
        isLate: data.is_late !== undefined ? data.is_late : (data.isLate || attData.isLate),
        lateMinutes: data.late_minutes !== undefined ? data.late_minutes : (data.lateMinutes || attData.lateMinutes),
        penaltyAmount: data.penalty_amount !== undefined ? data.penalty_amount : (data.penaltyAmount || attData.penaltyAmount),
        warningNote: data.warning_note || data.warningNote || attData.warningNote
      };
      setAttendance(prev => [mapped, ...prev]);
      return mapped;
    } catch {
      setAttendance(prev => [attData, ...prev]);
      return attData;
    }
  };

  const updateAttendance = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/attendance/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      const mapped = {
        ...data,
        staffId: data.staff_id || data.staffId,
        staffName: data.staff_name || data.staffName,
        checkIn: data.check_in || data.checkIn,
        checkOut: data.check_out || data.checkOut,
        isLate: data.is_late !== undefined ? data.is_late : (data.isLate || updateData.isLate),
        lateMinutes: data.late_minutes !== undefined ? data.late_minutes : (data.lateMinutes || updateData.lateMinutes),
        penaltyAmount: data.penalty_amount !== undefined ? data.penalty_amount : (data.penaltyAmount || updateData.penaltyAmount),
        warningNote: data.warning_note || data.warningNote || updateData.warningNote
      };
      setAttendance(prev => prev.map(a => a.id === id ? mapped : a));
      return mapped;
    } catch {
      setAttendance(prev => prev.map(a => a.id === id ? { ...a, ...updateData } : a));
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
          is_half_day: leaveData.isHalfDay,
          half_day_session: leaveData.halfDaySession,
          reason: leaveData.reason,
          status: leaveData.status || 'Pending',
          applied_on: leaveData.appliedOn
        })
      });
      const norm = normalizeLeaveRequest(data);
      setLeaveRequests(prev => [norm, ...prev]);
      return norm;
    } catch {
      const norm = normalizeLeaveRequest({ ...leaveData, id: leaveData.id || `leave-${Date.now()}` });
      setLeaveRequests(prev => [norm, ...prev]);
      return norm;
    }
  };

  const deleteLeaveRequest = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/leaves/requests/${id}`, { method: 'DELETE' }); } catch {}
    setLeaveRequests(prev => prev.filter(r => r.id !== id));
  };

  const updateLeaveRequest = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/leaves/requests/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      const norm = normalizeLeaveRequest(data);
      setLeaveRequests(prev => prev.map(r => r.id === id ? norm : r));
      return norm;
    } catch {
      setLeaveRequests(prev => prev.map(r => r.id === id ? normalizeLeaveRequest({ ...r, ...updateData }) : r));
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
      const payload = {
        ...logData,
        staff_name: logData.userName,
        job_id: logData.jobId,
        job_title: logData.jobTitle,
        start_time: logData.startTime,
        end_time: logData.endTime,
        duration: logData.duration,
        hours: (logData.duration || 0) / 3600
      };
      const data = await apiFetch(`${API_BASE_URL}/worklogs`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizeWorkLog(data);
      setWorkLogs(prev => [norm, ...prev]);
      return norm;
    } catch {
      const norm = normalizeWorkLog({ ...logData, id: logData.id || `log-${Date.now()}` });
      setWorkLogs(prev => [norm, ...prev]);
      return norm;
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

  const updateVendor = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/vendors/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setVendors(prev => prev.map(v => v.id === id ? data : v));
      return data;
    } catch {
      setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updateData } : v));
    }
  };

  const deleteVendor = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/vendors/${id}`, { method: 'DELETE' }); } catch {}
    setVendors(prev => prev.filter(v => v.id !== id));
  };

  // Field Duties API
  const addFieldDuty = async (dutyData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/field-duties`, { method: 'POST', body: JSON.stringify(dutyData) });
      setFieldDuties(prev => [...prev, data]);
      return data;
    } catch {
      setFieldDuties(prev => [...prev, dutyData]);
      return dutyData;
    }
  };

  const updateFieldDuty = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/field-duties/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setFieldDuties(prev => prev.map(v => v.id === id ? data : v));
      return data;
    } catch {
      setFieldDuties(prev => prev.map(v => v.id === id ? { ...v, ...updateData } : v));
    }
  };

  const deleteFieldDuty = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/field-duties/${id}`, { method: 'DELETE' }); } catch {}
    setFieldDuties(prev => prev.filter(v => v.id !== id));
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

  const addProject = async (clientId: string, projectData: any) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const newProjects = [...(client.projects || []), { ...projectData }];
      await updateClient(clientId, { projects: newProjects });
    } else {
      setClients((prevClients) => prevClients.map(c => {
        if (c.id === clientId) {
          const newProjects = [...(c.projects || []), { ...projectData }];
          return { ...c, projects: newProjects };
        }
        return c;
      }));
    }
  };

  const updateProject = async (clientId: string, projectIndex: number, projectData: any) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const newProjects = [...(client.projects || [])];
      if (projectIndex >= 0 && projectIndex < newProjects.length) {
        newProjects[projectIndex] = { ...projectData };
        await updateClient(clientId, { projects: newProjects });
      }
    } else {
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
    }
  };

  const updateDailyRating = (userName: string, date: string, rating: number) => {
    setDailyRatings(prev => ({
      ...prev,
      [`${userName}_${date}`]: rating
    }));
  };

  const performAutoPunchOut = async (overrideEndTime?: number) => {
    if (!isPunchedIn) return;
    const endTime = overrideEndTime || Date.now();
    const duration = punchInTime ? Math.max(0, Math.floor((endTime - punchInTime) / 1000)) : 0;

    let finalJobId = 'N/A';
    let finalJobTitle = 'N/A';

    if (activeJobTracker) {
      finalJobId = activeJobTracker.jobId;
      const job = jobs.find(j => j.id === finalJobId);
      if (job) {
        finalJobTitle = job.title;
        const jobDuration = Math.max(0, Math.floor((endTime - activeJobTracker.startTime) / 1000));
        await updateJob(finalJobId, { trackedTime: (job.trackedTime || 0) + jobDuration, status: 'Pending' });
      } else if (finalJobId.startsWith('activity-')) {
        if (finalJobId === 'activity-courier-drop') finalJobTitle = '📦 Courier Drop-off';
        else if (finalJobId === 'activity-courier-collect') finalJobTitle = '📦 Courier Collection / Pickup';
        else if (finalJobId === 'activity-outdoor-visit') finalJobTitle = '🚗 Client Visit / Outdoor Duty';
        else finalJobTitle = 'Field Duty';
      } else {
        finalJobTitle = 'General Work';
      }
      setActiveJobTracker(null);
    }

    const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
    const loggedStaffName = currentUser?.name || staff.find(s => s.id === loggedStaffId)?.name || 'Unknown';

    const todayStr = localDateStr(endTime);
    const checkOutStr = new Date(endTime).toTimeString().slice(0, 5);
    const checkInStr = punchInTime ? new Date(punchInTime).toTimeString().slice(0, 5) : checkOutStr;

    await addWorkLog({
      staff_id: loggedStaffId,
      staff_name: loggedStaffName,
      job_id: finalJobId,
      job_title: finalJobTitle,
      date: todayStr,
      start_time: punchInTime || endTime,
      end_time: endTime,
      duration,
      hours: duration / 3600
    });

    const newPunchSession = { in: checkInStr, out: checkOutStr };
    const existingRecord = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffId && a.date === todayStr);

    if (existingRecord) {
      const existingPunches = existingRecord.punches || [];
      let hasClosedActive = false;
      const newPunches = existingPunches.map((p: any) => {
        if (!p.out) {
          hasClosedActive = true;
          return { ...p, out: checkOutStr };
        }
        return p;
      });
      if (!hasClosedActive) {
        newPunches.push(newPunchSession);
      }
      await updateAttendance(existingRecord.id, {
        status: 'Present',
        check_in: existingRecord.checkIn || existingRecord.check_in || checkInStr,
        check_out: checkOutStr,
        punches: newPunches
      });
    } else {
      await addAttendance({
        staff_id: loggedStaffId,
        staff_name: loggedStaffName,
        date: todayStr,
        status: 'Present',
        check_in: checkInStr,
        check_out: checkOutStr,
        punches: [newPunchSession]
      });
    }

    setIsPunchedIn(false);
    setPunchInTime(null);
  };

  return (
    <DataContext.Provider value={{
      leads, setLeads, addLead, updateLead, deleteLead,
      clients, setClients, addClient, updateClient, deleteClient,
      products, setProducts, addProduct, updateProduct, deleteProduct,
      staff, setStaff, addStaff, updateStaff, deleteStaff,
      attendance, setAttendance, addAttendance, updateAttendance,
      payroll, setPayroll, addPayroll, updatePayroll,
      vendors, setVendors, addVendor, updateVendor, deleteVendor,
      jobs, setJobs, addJob, updateJob, deleteJob,
      invoices, setInvoices, addInvoice, updateInvoice, deleteInvoice,
      holidays, setHolidays, addHoliday, deleteHoliday,
      leaveRequests, setLeaveRequests, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest,
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
      fieldDuties, setFieldDuties, addFieldDuty, updateFieldDuty, deleteFieldDuty,
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
      currentUser,
      isPunchInModalOpen,
      setIsPunchInModalOpen,
      openPunchInModal,
      performAutoPunchOut,
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
