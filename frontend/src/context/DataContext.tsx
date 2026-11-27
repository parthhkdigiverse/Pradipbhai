import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from './SettingsContext';
import { localDateStr } from '../utils/dateUtils';
import { parseJobStartTimeMs } from '../utils/dateFormatter';

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

export interface ActiveFilterIntent {
  page: string;
  filterKey?: string;
  filterValue?: string;
  filters?: {
    status?: string;
    type?: string;
    billing?: string;
    client?: string;
    staff?: string;
    product?: string;
    searchTerm?: string;
    dateFrom?: string;
    dateTo?: string;
    [key: string]: any;
  };
  jobId?: string;
}

export const isDesigningJob = (job: any): boolean => {
  if (!job) return false;
  const title = (job.title || '').trim();
  const id = (job.id || '').trim();
  if (title.toUpperCase().startsWith('[PRINT]') || id.endsWith('-p') || job.type === 'Printing') return false;

  if (job.type === 'Designing') return true;
  if (title.toUpperCase().startsWith('[DESIGN]') || id.endsWith('-d')) return true;
  if (job.type === 'Des+Print') return true;
  return false;
};

export const isPrintingJob = (job: any): boolean => {
  if (!job) return false;
  const title = (job.title || '').trim();
  const id = (job.id || '').trim();
  if (title.toUpperCase().startsWith('[DESIGN]') || id.endsWith('-d') || job.type === 'Designing') return false;

  if (job.type === 'Printing') return true;
  if (title.toUpperCase().startsWith('[PRINT]') || id.endsWith('-p')) return true;
  return false;
};

export const getCleanJobTitle = (title: string): string => {
  if (!title) return '';
  return title.replace(/^\[(DESIGN|PRINT)\]\s*/i, '').trim();
};

export const unifyDesPrintJobs = (jobsList: any[]): any[] => {
  if (!jobsList || !Array.isArray(jobsList)) return [];

  const processedPrintPairIds = new Set<string>();
  const unified: any[] = [];

  for (let i = 0; i < jobsList.length; i++) {
    const job = jobsList[i];
    if (!job) continue;

    // If this job was already paired with a previous job, skip it
    if (processedPrintPairIds.has(String(job.id))) {
      continue;
    }

    const titleUpper = (job.title || '').toUpperCase().trim();
    const jobIdStr = String(job.id || '');
    const isDes = titleUpper.startsWith('[DESIGN]') || jobIdStr.endsWith('-d');
    const isPrn = titleUpper.startsWith('[PRINT]') || jobIdStr.endsWith('-p');

    if ((job.type === 'Des+Print' || isDes || isPrn) && (isDes || isPrn)) {
      const baseTitle = getCleanJobTitle(job.title).toLowerCase();

      // Find the counterpart job in the list
      const counterpart = jobsList.find(other => {
        if (!other || other.id === job.id) return false;
        if (processedPrintPairIds.has(String(other.id))) return false;

        const otherIdStr = String(other.id || '');
        const otherTitleUpper = (other.title || '').toUpperCase().trim();

        // 1. Direct ID matching: -d <-> -p
        if (jobIdStr.endsWith('-d') && otherIdStr === jobIdStr.slice(0, -2) + '-p') return true;
        if (jobIdStr.endsWith('-p') && otherIdStr === jobIdStr.slice(0, -2) + '-d') return true;

        // 2. Direct delayReason reference
        if (job.delayReason && String(job.delayReason) === otherIdStr) return true;
        if (other.delayReason && String(other.delayReason) === jobIdStr) return true;

        // 3. Title matching: one has [DESIGN], one has [PRINT], same client and same base title
        const otherIsOpposite = (isDes && (otherTitleUpper.startsWith('[PRINT]') || otherIdStr.endsWith('-p'))) ||
                                (isPrn && (otherTitleUpper.startsWith('[DESIGN]') || otherIdStr.endsWith('-d')));

        if (otherIsOpposite && other.clientId === job.clientId) {
          const otherBaseTitle = getCleanJobTitle(other.title).toLowerCase();
          if (baseTitle && otherBaseTitle && baseTitle === otherBaseTitle) return true;
        }

        return false;
      });

      if (counterpart) {
        processedPrintPairIds.add(String(job.id));
        processedPrintPairIds.add(String(counterpart.id));

        const designJob = isDes ? job : counterpart;
        const printJob = isPrn ? job : counterpart;

        // Status resolution for unified job:
        let unifiedStatus = printJob.status || designJob.status || 'Pending';
        if (printJob.status === 'Completed' || printJob.status === 'Done') {
          unifiedStatus = 'Completed';
        } else if (printJob.status === 'Progress' || printJob.status === 'In Progress') {
          unifiedStatus = printJob.status;
        } else if (designJob.status === 'Completed' || designJob.status === 'Done') {
          unifiedStatus = printJob.status === 'Awaiting Design' ? 'Ready for Print' : (printJob.status || 'In Progress');
        } else {
          unifiedStatus = designJob.status || 'Pending';
        }

        const displayTitle = getCleanJobTitle(job.title) || job.title;
        const combinedJobIds = [designJob.id, printJob.id];
        const combinedTracked = (Number(designJob.trackedTime) || 0) + (Number(printJob.trackedTime) || 0);

        unified.push({
          ...printJob,
          id: printJob.id,
          title: displayTitle,
          description: printJob.description || designJob.description || '',
          type: 'Des+Print',
          status: unifiedStatus,
          trackedTime: combinedTracked,
          // Amount is taken ONCE to avoid double counting revenue!
          totalAmount: Number(printJob.totalAmount) || Number(designJob.totalAmount) || 0,
          paidAmount: Math.max(Number(printJob.paidAmount) || 0, Number(designJob.paidAmount) || 0),
          paymentStatus: (printJob.paymentStatus === 'Paid' || designJob.paymentStatus === 'Paid') ? 'Paid' : (printJob.paymentStatus || designJob.paymentStatus || 'Unpaid'),
          isUnifiedDesPrint: true,
          pairedJobIds: combinedJobIds,
          designJobId: designJob.id,
          printJobId: printJob.id,
          designJob,
          printJob
        });
        continue;
      }
    }

    // Normal job (or standalone Des+Print without a pair)
    unified.push(job);
  }

  return unified;
};

export interface EmployeeEvaluationRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_role?: string;
  month: string; // e.g. "2026-10"
  year: number;
  criteria_scores: Record<string, number>;
  total_score: number;
  max_score: number;
  percentage: number;
  is_winner: boolean;
  badge?: string;
  manager_remarks?: string;
  evaluated_by?: string;
  evaluated_by_role?: string;
  created_at?: string;
  updated_at?: string;
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
  bulkUpsertPayroll: (records: any[]) => Promise<any[]>;

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
  deletedSundayDates: string[];
  restoreAllSundays: (year?: number) => void;

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
  updateLeaveBalance: (staffId: string, updates: Partial<LeaveBalance>) => Promise<any>;
  resetLeaveBalances: () => Promise<any>;
  
  convertLeadToClient: (lead: any) => void;
  projects: any[];
  setProjects: React.Dispatch<React.SetStateAction<any[]>>;
  addProject: (clientId: string, projectData: any) => Promise<any> | void;
  updateProject: (clientId: string, projectIndexOrId: any, projectData: any) => Promise<any> | void;
  deleteProject: (id: string, clientId?: string) => Promise<void>;
  
  activeFilterIntent: ActiveFilterIntent | null;
  setActiveFilterIntent: React.Dispatch<React.SetStateAction<ActiveFilterIntent | null>>;
  
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

  employeeEvaluations: EmployeeEvaluationRecord[];
  setEmployeeEvaluations: React.Dispatch<React.SetStateAction<EmployeeEvaluationRecord[]>>;
  addOrUpdateEvaluation: (evalData: Partial<EmployeeEvaluationRecord>) => Promise<any>;
  crownWinner: (evalId: string) => Promise<any>;
  deleteEvaluation: (evalId: string) => Promise<void>;
  
  rolePermissions: Record<string, Record<string, boolean>>;
  toggleRolePermission: (role: string, action: string) => void;
  hasPermission: (role: string, action: string) => boolean;
  hasTabPermission: (role: string, tabKey: string) => boolean;

  unreadChatCount: number;
  setUnreadChatCount: React.Dispatch<React.SetStateAction<number>>;
  fetchUnreadSummaries: () => Promise<void>;

  currentUserRole: string;
  setCurrentUserRole: React.Dispatch<React.SetStateAction<string>>;
  currentUser: { id: string; name: string; email: string; role: string };
  isPunchInModalOpen: boolean;
  setIsPunchInModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openPunchInModal: () => void;
  performAutoPunchOut: (overrideEndTime?: number) => Promise<void>;
  refreshApiData: () => Promise<void>;
  accessRestrictions: {
    ipWhitelist?: string[];
    enableTimeRestrictions?: boolean;
    startTime?: string;
    endTime?: string;
    enableGeoRestrictions?: boolean;
    allowedPincodes?: any[];
  } | null;
}

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  'Admin': {
    'View Dashboard': true, 'View Metrics': true, 'Export Data': true,
    'View Projects': true, 'Create/Edit Projects': true, 'Delete Projects': true,
    'View Jobs': true, 'Create Job': true, 'Edit Job': true, 'Delete Job': true,
    'View Catalog': true, 'Manage Products': true,
    'View Vendors': true, 'Manage Vendors': true,
    'View Staff': true, 'Create/Edit Staff': true, 'Delete Staff': true,
    'View Attendance': true, 'Punch In/Out': false,
    'View Work Logs': true, 'Add Work Log': true,
    'View Daily Progress': true, 'Verify & Rate Reports': true,
    'View Employee of the Month': true, 'Evaluate Employee of the Month': true,
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
    'View Projects': true, 'Create/Edit Projects': true, 'Delete Projects': false,
    'View Jobs': true, 'Create Job': true, 'Edit Job': true, 'Delete Job': false,
    'View Catalog': true, 'Manage Products': true,
    'View Vendors': true, 'Manage Vendors': true,
    'View Staff': true, 'Create/Edit Staff': true, 'Delete Staff': false,
    'View Attendance': true, 'Punch In/Out': true,
    'View Work Logs': true, 'Add Work Log': true,
    'View Daily Progress': true, 'Verify & Rate Reports': true,
    'View Employee of the Month': true, 'Evaluate Employee of the Month': true,
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
    'View Projects': true, 'Create/Edit Projects': false, 'Delete Projects': false,
    'View Jobs': true, 'Create Job': false, 'Edit Job': false, 'Delete Job': false,
    'View Catalog': true, 'Manage Products': false,
    'View Vendors': false, 'Manage Vendors': false,
    'View Staff': false, 'Create/Edit Staff': false, 'Delete Staff': false,
    'View Attendance': true, 'Punch In/Out': true,
    'View Work Logs': true, 'Add Work Log': true,
    'View Daily Progress': true, 'Verify & Rate Reports': false,
    'View Employee of the Month': true, 'Evaluate Employee of the Month': false,
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
    const r = localStorage.getItem('userRole') || 'Admin';
    if (r.toLowerCase() === 'admin') return 'Admin';
    if (r.toLowerCase() === 'manager') return 'Manager';
    if (r.toLowerCase() === 'employee') return 'Employee';
    return r;
  });
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('rolePermissions');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_PERMISSIONS;
  });

  useEffect(() => {
    // Only fetch permissions if user has a real JWT session token
    const token = localStorage.getItem('authToken');
    const isRealToken = Boolean(
      token &&
      token !== 'fallback-session-token' &&
      token !== 'session-active-token' &&
      token !== 'admin' &&
      token !== 'super-admin'
    );
    if (!isRealToken) return;

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

  const resolveCurrentStaffObj = () => {
    const userId = (localStorage.getItem('userId') || '').trim();
    if (userId) {
      const byId = staff.find(s => String(s.id).trim() === userId);
      if (byId) return byId;
    }
    const email = (localStorage.getItem('userEmail') || '').trim().toLowerCase();
    if (email) {
      return staff.find(s => s.email?.trim().toLowerCase() === email);
    }
    return undefined;
  };

  const hasPermission = (role: string, action: string): boolean => {
    // 1. Check if logged-in staff member has a specific individual permission override
    const currentStaffObj = resolveCurrentStaffObj();
    let customPerms: any = currentStaffObj?.permissions;
    if (typeof customPerms === 'string') {
      try {
        customPerms = JSON.parse(customPerms);
      } catch {
        customPerms = null;
      }
    }

    if (customPerms && typeof customPerms === 'object' && customPerms[action] !== undefined) {
      return !!customPerms[action];
    }

    // 2. Fallback to system role permission matrix
    const roleMap = getRoleMap(role);
    if (roleMap[action] !== undefined) {
      return !!roleMap[action];
    }
    return role === 'Admin';
  };

  const hasTabPermission = (role: string, tabKey: string): boolean => {
    const normalizedTab = tabKey.toLowerCase();
    if (normalizedTab === 'security') {
      return hasPermission(role, 'View Security') || hasPermission(role, 'Edit Permissions');
    }

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
      'employee-of-month': 'View Employee of the Month',
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
      'settings': 'View Settings'
    };

    const key = tabPermissionKeys[normalizedTab];
    if (key) {
      return hasPermission(role, key);
    }
    return role === 'Admin';
  };

  const [activeFilterIntent, setActiveFilterIntent] = useState<ActiveFilterIntent | null>(null);

  const loadCachedData = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveCache = (key: string, val: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  };

  const generateSundaysForYear = (year: number): Holiday[] => {
    const sundays: Holiday[] = [];
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const curr = new Date(start);

    while (curr <= end) {
      if (curr.getDay() === 0) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        sundays.push({
          id: `sun-${dateStr}`,
          name: 'Sunday (Weekly Off)',
          date: dateStr,
          type: 'Company',
        });
      }
      curr.setDate(curr.getDate() + 1);
    }
    return sundays;
  };

  const mergeSundaysWithHolidays = (existing: Holiday[], deletedDates: string[] = []): Holiday[] => {
    const existingDateMap = new Map((existing || []).map(h => [h.date, h]));
    const deletedSet = new Set(deletedDates || []);
    const currentYr = new Date().getFullYear();
    const years = [currentYr - 1, currentYr, currentYr + 1, currentYr + 2];

    const additions: Holiday[] = [];
    years.forEach(yr => {
      const suns = generateSundaysForYear(yr);
      suns.forEach(s => {
        if (!existingDateMap.has(s.date) && !deletedSet.has(s.date)) {
          additions.push(s);
          existingDateMap.set(s.date, s);
        }
      });
    });

    if (additions.length === 0) return existing || [];
    return [...(existing || []), ...additions].sort((a, b) => a.date.localeCompare(b.date));
  };

  const [leads, setLeads] = useState<any[]>(() => loadCachedData('cache_leads', []));
  const [clients, setClients] = useState<any[]>(() => loadCachedData('cache_clients', []));
  const [products, setProducts] = useState<any[]>(() => {
    const cached = loadCachedData('cache_products', []);
    return Array.isArray(cached) ? cached.map((p: any) => ({
      ...p,
      estimatedTime: (p.estimatedTime !== undefined && p.estimatedTime !== null && p.estimatedTime !== '')
        ? p.estimatedTime
        : ((p.estimated_time !== undefined && p.estimated_time !== null && p.estimated_time !== '') ? p.estimated_time : undefined),
      estimated_time: (p.estimated_time !== undefined && p.estimated_time !== null && p.estimated_time !== '')
        ? p.estimated_time
        : ((p.estimatedTime !== undefined && p.estimatedTime !== null && p.estimatedTime !== '') ? p.estimatedTime : undefined),
      estimatedTimeUnit: p.estimatedTimeUnit || p.estimated_time_unit || 'Hours',
      estimated_time_unit: p.estimated_time_unit || p.estimatedTimeUnit || 'Hours'
    })) : [];
  });
  const [staff, setStaff] = useState<any[]>(() => loadCachedData('cache_staff', []));
  const staffRef = useRef(staff);
  useEffect(() => {
    staffRef.current = staff;
  }, [staff]);

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

  const [attendance, setAttendance] = useState<any[]>(() => loadCachedData('cache_attendance', []));
  const [payroll, setPayroll] = useState<any[]>(() => loadCachedData('cache_payroll', []));
  const [vendors, setVendors] = useState<any[]>(() => loadCachedData('cache_vendors', []));
  const [jobs, setJobs] = useState<any[]>(() => loadCachedData('cache_jobs', []));
  const [invoices, setInvoices] = useState<any[]>(() => loadCachedData('cache_invoices', []));
  const [deletedSundayDates, setDeletedSundayDates] = useState<string[]>(() => loadCachedData('cache_deleted_sundays', []));
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const cached = loadCachedData('cache_holidays', []);
    const deleted = loadCachedData('cache_deleted_sundays', []);
    return mergeSundaysWithHolidays(cached, deleted);
  });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => loadCachedData('cache_leave_requests', []));
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(() => loadCachedData('cache_leave_balances', []));
  const [accessRestrictions, setAccessRestrictions] = useState<any>(() => loadCachedData('accessRestrictions', null));
  const [dailyRatings, setDailyRatings] = useState<Record<string, number>>({});
  const [dailyProgressRecords, setDailyProgressRecords] = useState<DailyRecord[]>(() => loadCachedData('cache_daily_progress', []));
  const [employeeEvaluations, setEmployeeEvaluations] = useState<EmployeeEvaluationRecord[]>(() => loadCachedData('cache_employee_evaluations', []));
  const [fieldDuties, setFieldDuties] = useState<any[]>(() => loadCachedData('cache_field_duties', []));
  const [projects, setProjects] = useState<any[]>(() => loadCachedData('cache_projects', []));

  const [isPunchedIn, setIsPunchedIn] = useState<boolean>(false);
  const [punchInTime, setPunchInTime] = useState<number | null>(null);
  const [activeJobTrackerState, setActiveJobTrackerState] = useState<{ jobId: string, startTime: number } | null>(null);
  const [isPunchInModalOpen, setIsPunchInModalOpen] = useState<boolean>(false);
  const openPunchInModal = () => {
    if (currentUserRole === 'Admin' || currentUserRole === 'Manager') return;
    setIsPunchInModalOpen(true);
  };

  const setActiveJobTracker = (val: { jobId: string, startTime: number } | null | ((prev: { jobId: string, startTime: number } | null) => { jobId: string, startTime: number } | null)) => {
    setActiveJobTrackerState(prev => typeof val === 'function' ? val(prev) : val);
  };
  const activeJobTracker = activeJobTrackerState;
  const [workLogs, setWorkLogs] = useState<any[]>(() => loadCachedData('cache_worklogs', []));
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const fetchUnreadSummaries = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/chat/summary/recent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: Record<string, any> = await res.json();
        const total = Object.values(data || {}).reduce<number>((acc, c: any) => acc + (Number(c?.unread) || 0), 0);
        setUnreadChatCount(total);
      }
    } catch {}
  }, []);

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
      if (res.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('isAuthenticated');
        window.dispatchEvent(new Event('auth_expired'));
      }
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
  const normalizeClient = (c: any) => {
    const fallbackId = c.id || c._id || `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const comp = c.company || c.name || c.contact || 'Client';
    return {
      ...c,
      id: fallbackId,
      company: comp,
      contact: c.contact || c.name || comp,
      name: c.name || comp,
      email: c.email || '',
      phone: c.phone || '',
      status: c.status || 'Onboarding',
      trafficLight: c.trafficLight || 'Green',
      clientSince: c.clientSince || c.created_at || new Date().toISOString().split('T')[0],
      projects: Array.isArray(c.projects) ? c.projects : []
    };
  };

  const normalizeJob = (j: any) => {
    // If teamId is explicitly specified (including empty string or null), respect it.
    // Otherwise fallback to assigned_staff_id or assignedStaffId.
    const resolvedTeamId = j.teamId !== undefined && j.teamId !== null
      ? String(j.teamId).trim()
      : (j.assigned_staff_id || j.assignedStaffId || '');

    return {
      ...j,
      description: j.description !== undefined && j.description !== null ? j.description : '',
      clientId: j.clientId || j.client_id || '',
      projectId: j.projectId || j.project_id || '',
      assignedStaffId: resolvedTeamId,
      assigned_staff_id: resolvedTeamId,
      teamId: resolvedTeamId,
      totalAmount: j.totalAmount !== undefined ? j.totalAmount : (j.total_amount || 0),
      paidAmount: j.paidAmount !== undefined ? j.paidAmount : 0,
      status: j.status || 'Pending',
      title: j.title || 'Untitled Job',
      type: j.type || 'Designing'
    };
  };

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

  const normalizeLeaveRequest = (l: any) => {
    const isHalf = Boolean(l.is_half_day !== undefined ? l.is_half_day : l.isHalfDay);
    const rawDays = Number(l.days);
    const days = (rawDays > 0) ? rawDays : (isHalf ? 0.5 : 1);
    return {
      ...l,
      staffId: l.staff_id || l.staffId,
      staffName: l.staff_name || l.staffName,
      fromDate: l.from_date || l.fromDate,
      toDate: l.to_date || l.toDate,
      days,
      isHalfDay: isHalf,
      halfDaySession: l.half_day_session || l.halfDaySession || '',
      appliedOn: l.applied_on || l.appliedOn,
      reviewedBy: l.reviewed_by || l.reviewedBy,
      reviewNote: l.review_note || l.reviewNote,
      reviewedOn: l.reviewed_on || l.reviewedOn
    };
  };

  const normalizeWorkLog = (w: any) => ({
    ...w,
    id: w.id || `wlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    staffId: w.staff_id || w.staffId,
    staff_id: w.staff_id || w.staffId,
    userName: w.staff_name || w.userName || 'Staff Member',
    staff_name: w.staff_name || w.userName || 'Staff Member',
    jobId: w.job_id || w.jobId,
    job_id: w.job_id || w.jobId,
    jobTitle: w.job_title || w.jobTitle || 'General Task',
    job_title: w.job_title || w.jobTitle || 'General Task',
    startTime: w.start_time !== undefined ? w.start_time : w.startTime,
    endTime: w.end_time !== undefined ? w.end_time : w.endTime,
    duration: w.duration !== undefined ? Number(w.duration) : ((w.hours || 0) * 3600),
    hours: w.hours !== undefined ? Number(w.hours) : ((w.duration || 0) / 3600),
    date: w.date || new Date().toISOString().slice(0, 10),
    description: w.description || ''
  });

  const normalizeLeaveBalance = (b: any): LeaveBalance => ({
    staffId: b.staff_id || b.staffId,
    casual: b.casual !== undefined ? Number(b.casual) : 0,
    sick: b.sick !== undefined ? Number(b.sick) : 3,
    earned: b.earned !== undefined ? Number(b.earned) : 12,
  });

  const normalizePayroll = (p: any) => ({
    ...p,
    id: p.id,
    staffId: p.staff_id || p.staffId,
    staff_id: p.staff_id || p.staffId,
    employeeName: p.employee_name || p.employeeName || p.name || '',
    employee_name: p.employee_name || p.employeeName || p.name || '',
    month: p.month,
    basic: p.salary !== undefined ? p.salary : (p.basic !== undefined ? p.basic : 0),
    salary: p.salary !== undefined ? p.salary : (p.basic !== undefined ? p.basic : 0),
    bonus: p.bonus || 0,
    deductions: p.deductions !== undefined ? p.deductions : 0,
    netPay: p.net_salary !== undefined ? p.net_salary : (p.netPay !== undefined ? p.netPay : 0),
    net_salary: p.net_salary !== undefined ? p.net_salary : (p.netPay !== undefined ? p.netPay : 0),
    status: p.status || 'Pending',
    paymentAccount: (p.account_type === 'Savings A/c' || p.paymentAccount === 'Savings') ? 'Savings' : 'Current',
    account_type: p.account_type || (p.paymentAccount === 'Savings' ? 'Savings A/c' : 'Current A/c'),
    deductionReason: p.deduction_reason !== undefined ? (p.deduction_reason || '') : (p.deductionReason || ''),
    deduction_reason: p.deduction_reason !== undefined ? (p.deduction_reason || '') : (p.deductionReason || ''),
    isManualDeduction: Boolean(p.is_manual_deduction !== undefined ? p.is_manual_deduction : p.isManualDeduction),
    is_manual_deduction: Boolean(p.is_manual_deduction !== undefined ? p.is_manual_deduction : p.isManualDeduction),
  });

  const normalizeProject = (p: any) => ({
    ...p,
    id: p.id,
    name: p.name || p.title || '',
    title: p.title || p.name || '',
    clientId: p.client_id || p.clientId || '',
    client_id: p.client_id || p.clientId || '',
    category: p.category || 'Designing',
    status: p.status || 'Planning',
    budget: p.budget !== undefined ? (parseFloat(p.budget) || 0) : 0,
    deadline: p.deadline || '',
    productId: p.product_id || p.productId || '',
    product_id: p.product_id || p.productId || '',
    contentCalendar: Array.isArray(p.content_calendar) ? p.content_calendar : (Array.isArray(p.contentCalendar) ? p.contentCalendar : [])
  });

  const normalizeProduct = (p: any) => {
    if (!p) return p;
    const estTime = (p.estimatedTime !== undefined && p.estimatedTime !== null && p.estimatedTime !== '')
      ? p.estimatedTime
      : ((p.estimated_time !== undefined && p.estimated_time !== null && p.estimated_time !== '') ? p.estimated_time : undefined);
    const estUnit = p.estimatedTimeUnit || p.estimated_time_unit || 'Hours';
    return {
      ...p,
      id: p.id,
      name: p.name || '',
      description: p.description !== undefined && p.description !== null ? p.description : '',
      type: p.type || 'Designing',
      price: p.price !== undefined && p.price !== null ? p.price : 0,
      estimatedTime: estTime,
      estimated_time: estTime,
      estimatedTimeUnit: estUnit,
      estimated_time_unit: estUnit
    };
  };

  const isSyncingRef = useRef<boolean>(false);
  const currentSyncVersionRef = useRef<number>(0);
  const isCheckingVersionRef = useRef<boolean>(false);
  const invoicesSyncGuardRef = useRef<number>(0);

  const refreshApiData = async () => {
    const token = localStorage.getItem('authToken');
    const isRealToken = Boolean(
      token &&
      token !== 'fallback-session-token' &&
      token !== 'session-active-token' &&
      token !== 'admin' &&
      token !== 'super-admin'
    );
    if (!isRealToken) return;
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const invoicesStartGuard = invoicesSyncGuardRef.current;
    try {
      const headers = getAuthHeaders();

      const fetchWithAuth = async (url: string) => {
        const res = await fetch(url, { headers, cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('isAuthenticated');
            window.dispatchEvent(new Event('auth_expired'));
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      };

      const [clientsRes, jobsRes, invoicesRes, payrollRes, progressRes, leadsRes, staffRes, attRes, holRes, leaveRes, leaveBalRes, workRes, venRes, permRes, prodRes, fdRes, projRes, eomRes, restrictionsRes, syncVerRes] = await Promise.allSettled([
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
        fetchWithAuth(`${API_BASE_URL}/leaves/balances`),
        fetchWithAuth(`${API_BASE_URL}/worklogs`),
        fetchWithAuth(`${API_BASE_URL}/vendors`),
        fetchWithAuth(`${API_BASE_URL}/permissions`),
        fetchWithAuth(`${API_BASE_URL}/products`),
        fetchWithAuth(`${API_BASE_URL}/field-duties`),
        fetchWithAuth(`${API_BASE_URL}/projects`),
        fetchWithAuth(`${API_BASE_URL}/employee-of-month`),
        fetchWithAuth(`${API_BASE_URL}/restrictions`),
        fetch(`${API_BASE_URL}/sync/version`).then(r => r.ok ? r.json() : null),
      ]);

      const saveCache = (key: string, val: any) => {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
      };

      let fetchedProjects: any[] = [];
      if (projRes.status === 'fulfilled' && Array.isArray(projRes.value)) {
        fetchedProjects = projRes.value.map(normalizeProject);
        setProjects(fetchedProjects);
        saveCache('cache_projects', fetchedProjects);
      }

      if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value)) {
        const normalizedClients = clientsRes.value.map((c: any) => {
          const norm = normalizeClient(c);
          const clientProjs = fetchedProjects.filter((p: any) => p.clientId === norm.id);
          return {
            ...norm,
            projects: clientProjs.length > 0 ? clientProjs : (norm.projects || [])
          };
        });
        setClients(normalizedClients);
        saveCache('cache_clients', normalizedClients);
      }
      if (jobsRes.status === 'fulfilled' && Array.isArray(jobsRes.value)) {
        const normalized = jobsRes.value.map(normalizeJob);
        normalized.sort((a: any, b: any) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        setJobs(normalized);
        saveCache('cache_jobs', normalized);
      }
      if (invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value) && invoicesSyncGuardRef.current === invoicesStartGuard) {
        const normInvoices = invoicesRes.value.map(normalizeInvoice);
        setInvoices(normInvoices);
        saveCache('cache_invoices', normInvoices);
      }
      if (payrollRes.status === 'fulfilled' && Array.isArray(payrollRes.value)) {
        const normPayroll = payrollRes.value.map(normalizePayroll);
        setPayroll(normPayroll);
        saveCache('cache_payroll', normPayroll);
      }
      if (progressRes.status === 'fulfilled' && Array.isArray(progressRes.value)) {
        const normProgress = progressRes.value.map((r: any) => normalizeDailyProgress(r));
        setDailyProgressRecords(normProgress);
        saveCache('cache_daily_progress', normProgress);
      }
      if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value)) {
        setLeads(leadsRes.value);
        saveCache('cache_leads', leadsRes.value);
      }
      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
        setStaff(staffRes.value);
        saveCache('cache_staff', staffRes.value);
      }
      if (attRes.status === 'fulfilled' && Array.isArray(attRes.value)) {
        const normAtt = attRes.value.map(normalizeAttendance);
        setAttendance(normAtt);
        saveCache('cache_attendance', normAtt);
      }
      if (holRes.status === 'fulfilled' && Array.isArray(holRes.value)) {
        const deleted = loadCachedData('cache_deleted_sundays', []);
        const merged = mergeSundaysWithHolidays(holRes.value, deleted);
        setHolidays(merged);
        saveCache('cache_holidays', merged);
      }
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
        const normProds = prodRes.value.map(normalizeProduct);
        setProducts(normProds);
        saveCache('cache_products', normProds);
      }
      if (fdRes.status === 'fulfilled' && Array.isArray(fdRes.value)) {
        setFieldDuties(fdRes.value);
        saveCache('cache_field_duties', fdRes.value);
      }
      if (leaveRes.status === 'fulfilled' && Array.isArray(leaveRes.value)) {
        const normLeaves = leaveRes.value.map(normalizeLeaveRequest);
        setLeaveRequests(normLeaves);
        saveCache('cache_leave_requests', normLeaves);
      }
      if (leaveBalRes.status === 'fulfilled' && Array.isArray(leaveBalRes.value)) {
        const normBalances = leaveBalRes.value.map(normalizeLeaveBalance);
        setLeaveBalances(normBalances);
        saveCache('cache_leave_balances', normBalances);
      }
      if (workRes.status === 'fulfilled' && Array.isArray(workRes.value)) {
        const normWork = workRes.value.map(normalizeWorkLog);
        setWorkLogs(normWork);
        saveCache('cache_worklogs', normWork);
      }
      if (venRes.status === 'fulfilled' && Array.isArray(venRes.value)) {
        setVendors(venRes.value);
        saveCache('cache_vendors', venRes.value);
      }
      if (permRes.status === 'fulfilled' && permRes.value && typeof permRes.value === 'object') {
        setRolePermissions(permRes.value);
        saveCache('cache_permissions', permRes.value);
      }
      if (eomRes.status === 'fulfilled' && Array.isArray(eomRes.value)) {
        setEmployeeEvaluations(eomRes.value);
        saveCache('cache_employee_evaluations', eomRes.value);
      }
      if (restrictionsRes.status === 'fulfilled' && restrictionsRes.value && typeof restrictionsRes.value === 'object') {
        setAccessRestrictions(restrictionsRes.value);
        saveCache('accessRestrictions', restrictionsRes.value);
      }
      if (syncVerRes.status === 'fulfilled' && syncVerRes.value?.version) {
        currentSyncVersionRef.current = Number(syncVerRes.value.version) || 0;
      }
    } catch (err) {
      console.warn("FastAPI Backend connecting...", err);
    } finally {
      isSyncingRef.current = false;
    }
  };

  const checkSyncVersion = async () => {
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuth || isCheckingVersionRef.current || isSyncingRef.current) return;
    isCheckingVersionRef.current = true;
    try {
      const res = await fetch(`${API_BASE_URL}/sync/version`);
      if (res.ok) {
        const data = await res.json();
        const serverVer = Number(data?.version) || 0;
        // Only trigger heavy table fetching if server version in RAM is greater than local version
        if (serverVer > currentSyncVersionRef.current) {
          currentSyncVersionRef.current = serverVer;
          await refreshApiData();
        }
      }
    } catch {
      // Backend temporarily unreachable, skip silently
    } finally {
      isCheckingVersionRef.current = false;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const isRealToken = Boolean(
      token &&
      token !== 'fallback-session-token' &&
      token !== 'session-active-token' &&
      token !== 'admin' &&
      token !== 'super-admin'
    );
    if (!isRealToken) return;

    // 1. Initial data & chat summaries fetch on mount
    refreshApiData();
    fetchUnreadSummaries();

    // 2. Event-driven WebSocket push (0 polling calls, 0 DB queries while idle!)
    let isCleanedUp = false;
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectGlobalWS = () => {
      if (isCleanedUp) return;
      const uid = currentUser?.id || localStorage.getItem('userId');
      if (!uid) return;
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/chat/ws/${uid}`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Dispatch event for any active page (e.g. ChatPage)
            window.dispatchEvent(new CustomEvent('app_ws_event', { detail: data }));

            // Instant data sync: Refresh tables only when an actual database mutation happens
            if (data.type === 'data_sync') {
              const serverVer = Number(data.version) || 0;
              if (serverVer > currentSyncVersionRef.current) {
                currentSyncVersionRef.current = serverVer;
                refreshApiData();
              }
            }

            // Chat message: update unread count and trigger notification
            if (data.type === 'new_message' && data.message) {
              if (data.message.sender === 'them') {
                setUnreadChatCount(prev => prev + 1);

                // Desktop notification & taskbar alert
                try {
                  (window as any).electronAPI?.flashFrame?.();
                } catch {}

                if ('Notification' in window && Notification.permission === 'granted') {
                  try {
                    const cid = String(data.contactId || '').trim().toLowerCase();
                    const senderStaff = staffRef.current.find((s: any) => 
                      String(s.id).trim().toLowerCase() === cid || 
                      (s.email && s.email.trim().toLowerCase() === cid)
                    );
                    const senderName = senderStaff?.name || 'Team Member';
                    const preview = data.message.text || (data.message.attachment ? '📎 Attachment' : 'Sent a message');
                    new Notification(`💬 ${senderName}`, {
                      body: preview,
                      icon: '/favicon.ico'
                    });
                  } catch {}
                }
              }
            }
          } catch (e) {
            console.warn("WebSocket parse error:", e);
          }
        };

        ws.onclose = () => {
          if (!isCleanedUp) {
            reconnectTimeout = setTimeout(connectGlobalWS, 4000);
          }
        };
      } catch (err) {
        if (!isCleanedUp) {
          reconnectTimeout = setTimeout(connectGlobalWS, 4000);
        }
      }
    };

    connectGlobalWS();

    // 3. Instant sync check when user switches back to the app window
    const onWindowFocus = () => {
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      if (isAuth) {
        checkSyncVersion();
        fetchUnreadSummaries();
      }
    };

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onWindowFocus);

    // 4. Relaxed fallback timer: Only fires every 60s IF WebSocket is disconnected
    const fallbackTimer = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        const isAuth = localStorage.getItem('isAuthenticated') === 'true';
        if (isAuth && typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
          checkSyncVersion();
          fetchUnreadSummaries();
        }
      }
    }, 60000);

    return () => {
      isCleanedUp = true;
      clearTimeout(reconnectTimeout);
      clearInterval(fallbackTimer);
      if (ws) {
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        } catch {}
      }
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onWindowFocus);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUserRole === 'Admin') {
      setIsPunchedIn(prev => prev ? false : prev);
      setActiveJobTrackerState(prev => prev ? null : prev);
      return;
    }
    if (!attendance || attendance.length === 0) return;
    const loggedStaffId = currentUser?.id || staff[0]?.id || '1';
    const todayStr = localDateStr();
    const todayAtt = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffId && a.date === todayStr);

    if (todayAtt && todayAtt.punches && todayAtt.punches.length > 0) {
      const activePunch = todayAtt.punches.find((p: any) => !p.out);
      if (activePunch) {
        setIsPunchedIn(prev => prev ? prev : true);
        if (activePunch.in) {
          const [h, m] = activePunch.in.split(':');
          const pDate = new Date();
          pDate.setHours(parseInt(h) || 0, parseInt(m) || 0, 0, 0);
          const calculatedTime = pDate.getTime();
          setPunchInTime(prev => prev === calculatedTime ? prev : calculatedTime);
        }

        // Auto-restore activeJobTracker if null but there is an active punch with an explicit in-progress jobId (only for non-managers)
        if (!activeJobTrackerState && activePunch.jobId && currentUserRole !== 'Manager') {
          const isActivity = activePunch.jobId.startsWith('activity-') || activePunch.jobId.startsWith('fd-') || activePunch.jobId === 'manager-shift';
          const targetJob = jobs.find(j => j.id === activePunch.jobId);
          const isTargetInProgress = targetJob && (targetJob.status === 'Progress' || targetJob.status === 'In Progress');
          if (isActivity || isTargetInProgress) {
            let jobStartTime = activePunch.jobStartedAt;
            if (!jobStartTime && targetJob?.startedAt) {
              const ms = parseJobStartTimeMs(targetJob.startedAt);
              if (ms) jobStartTime = ms;
            }
            if (!jobStartTime && activePunch.in) {
              const [h, m] = activePunch.in.split(':');
              const pDate = new Date();
              pDate.setHours(parseInt(h) || 0, parseInt(m) || 0, 0, 0);
              jobStartTime = pDate.getTime();
            }
            if (jobStartTime) {
              setActiveJobTracker({ jobId: activePunch.jobId, startTime: jobStartTime });
            }
          }
        }
      } else {
        if (!activeJobTrackerState) {
          setIsPunchedIn(prev => prev ? false : prev);
        } else {
          setIsPunchedIn(prev => prev ? prev : true);
        }
      }
    } else if (activeJobTrackerState) {
      setIsPunchedIn(prev => prev ? prev : true);
    }
  }, [attendance, currentUser, staff, jobs, activeJobTrackerState, currentUserRole]);

  // Clients API
  const addClient = async (clientData: any) => {
    const generatedId = clientData.id || `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const compName = (clientData.company || clientData.name || clientData.contact || '').trim() || 'New Client';
    const contactName = (clientData.contact || clientData.name || compName).trim();
    const cleanPhone = (clientData.phone || '').trim();

    const payload = {
      ...clientData,
      id: generatedId,
      company: compName,
      name: contactName,
      contact: contactName,
      phone: cleanPhone,
      email: (clientData.email || '').trim(),
      trafficLight: clientData.trafficLight || 'Green',
      clientSince: clientData.clientSince || new Date().toISOString().split('T')[0],
      projects: []
    };

    try {
      const data = await apiFetch(`${API_BASE_URL}/clients`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizeClient(data || payload);
      setClients(prev => {
        const next = [norm, ...prev.filter(c => c.id !== norm.id)];
        try { localStorage.setItem('cache_clients', JSON.stringify(next)); } catch {}
        return next;
      });
      return norm;
    } catch (err) {
      console.warn('[addClient] Server save failed or offline, caching locally:', err);
      const norm = normalizeClient(payload);
      setClients(prev => {
        const next = [norm, ...prev.filter(c => c.id !== norm.id)];
        try { localStorage.setItem('cache_clients', JSON.stringify(next)); } catch {}
        return next;
      });
      return norm;
    }
  };

  const updateClient = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/clients/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      const norm = normalizeClient(data);
      setClients(prev => {
        const next = prev.map(c => c.id === id ? norm : c);
        try { localStorage.setItem('cache_clients', JSON.stringify(next)); } catch {}
        return next;
      });
      return norm;
    } catch {
      setClients(prev => {
        const next = prev.map(c => c.id === id ? normalizeClient({ ...c, ...updateData }) : c);
        try { localStorage.setItem('cache_clients', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  };

  const deleteClient = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE' }); } catch (e) {
      console.warn('Backend delete client error:', e);
    }
    setClients(prev => {
      const next = prev.filter(c => c.id !== id);
      try { localStorage.setItem('cache_clients', JSON.stringify(next)); } catch {}
      return next;
    });
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
    const sanitizedUpdate = { ...updateData };
    if ('teamId' in sanitizedUpdate) {
      const cleanTeamId = sanitizedUpdate.teamId ? String(sanitizedUpdate.teamId).trim() : '';
      sanitizedUpdate.teamId = cleanTeamId;
      sanitizedUpdate.assignedStaffId = cleanTeamId;
      sanitizedUpdate.assigned_staff_id = cleanTeamId;
    }
    try {
      const data = await apiFetch(`${API_BASE_URL}/jobs/${id}`, { method: 'PUT', body: JSON.stringify(sanitizedUpdate) });
      resultData = normalizeJob(data);
      setJobs(prev => prev.map(j => j.id === id ? resultData : j));
    } catch {
      setJobs(prev => prev.map(j => {
        if (j.id === id) {
          resultData = normalizeJob({ ...j, ...sanitizedUpdate });
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
    try {
      await apiFetch(`${API_BASE_URL}/jobs/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete job on server:', e);
    }
    setJobs(prev => prev.filter(j => j.id !== id));
    if (activeJobTracker && activeJobTracker.jobId === id) {
      setActiveJobTracker(null);
      localStorage.removeItem('activeJobTracker');
    }
  };

  const normalizeInvoice = (inv: any) => ({
    ...inv,
    invoiceNumber: inv.invoice_number || inv.invoiceNumber || '',
    clientId: inv.client_id || inv.clientId || '',
    jobIds: inv.job_ids || inv.jobIds || [],
    items: inv.custom_items || inv.items || [],
    issueDate: inv.date || inv.issueDate || '',
    dueDate: inv.due_date || inv.dueDate || '',
    invoiceType: inv.invoice_type || inv.invoiceType || 'Standard',
    taxRate: inv.tax_rate || inv.taxRate || '0',
    isGst: Boolean(inv.is_gst !== undefined ? inv.is_gst : inv.isGst),
    is_gst: Boolean(inv.is_gst !== undefined ? inv.is_gst : inv.isGst),
  });

  // Invoices API
  const addInvoice = async (invoiceData: any) => {
    invoicesSyncGuardRef.current += 1;
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
        tax_rate: invoiceData.taxRate,
        is_gst: Boolean(invoiceData.isGst !== undefined ? invoiceData.isGst : invoiceData.is_gst),
      };
      const data = await apiFetch(`${API_BASE_URL}/invoices`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizeInvoice(data);
      setInvoices(prev => {
        const next = [norm, ...prev];
        try { localStorage.setItem('cache_invoices', JSON.stringify(next)); } catch {}
        return next;
      });
      return norm;
    } catch (err) {
      console.error('Failed to create invoice on server:', err);
      return null;
    }
  };

  const updateInvoice = async (id: string, updateData: any) => {
    invoicesSyncGuardRef.current += 1;
    try {
      const payload: any = {
        ...updateData,
        invoice_number: updateData.invoiceNumber,
        client_id: updateData.clientId,
        job_ids: updateData.jobIds,
        custom_items: updateData.items,
        date: updateData.issueDate,
        due_date: updateData.dueDate,
        invoice_type: updateData.invoiceType,
        tax_rate: updateData.taxRate,
      };
      if (updateData.isGst !== undefined || updateData.is_gst !== undefined) {
        payload.is_gst = Boolean(updateData.isGst !== undefined ? updateData.isGst : updateData.is_gst);
      }
      const data = await apiFetch(`${API_BASE_URL}/invoices/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (payload.is_gst !== undefined && data && data.is_gst === undefined && data.isGst === undefined) {
        console.error('Server response did not include is_gst — backend needs update/restart.');
        return null;
      }
      const norm = normalizeInvoice(data);
      setInvoices(prev => {
        const next = prev.map(inv => inv.id === id ? norm : inv);
        try { localStorage.setItem('cache_invoices', JSON.stringify(next)); } catch {}
        return next;
      });
      return norm;
    } catch (err) {
      console.error('Failed to update invoice on server:', err);
      return null;
    }
  };

  const deleteInvoice = async (id: string) => {
    invoicesSyncGuardRef.current += 1;
    try { await apiFetch(`${API_BASE_URL}/invoices/${id}`, { method: 'DELETE' }); } catch {}
    setInvoices(prev => {
      const next = prev.filter(inv => inv.id !== id);
      try { localStorage.setItem('cache_invoices', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Payroll API
  const addPayroll = async (payrollData: any) => {
    const payload = {
      id: payrollData.id,
      staff_id: payrollData.staffId || payrollData.staff_id,
      employee_name: payrollData.employeeName || payrollData.employee_name || payrollData.name || '',
      month: payrollData.month,
      salary: payrollData.basic !== undefined ? payrollData.basic : (payrollData.salary || 0),
      bonus: payrollData.bonus || 0,
      deductions: payrollData.deductions !== undefined ? payrollData.deductions : 0,
      net_salary: payrollData.netPay !== undefined ? payrollData.netPay : (payrollData.net_salary || 0),
      status: payrollData.status || 'Pending',
      account_type: payrollData.paymentAccount === 'Savings' ? 'Savings A/c' : (payrollData.account_type || 'Current A/c'),
      deduction_reason: payrollData.deductionReason !== undefined ? payrollData.deductionReason : (payrollData.deduction_reason || null),
      is_manual_deduction: Boolean(payrollData.isManualDeduction !== undefined ? payrollData.isManualDeduction : payrollData.is_manual_deduction),
    };
    try {
      const data = await apiFetch(`${API_BASE_URL}/payroll`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizePayroll(data);
      setPayroll(prev => {
        const next = [norm, ...prev.filter(p => p.id !== norm.id && !(p.staffId === norm.staffId && p.month === norm.month))];
        saveCache('cache_payroll', next);
        return next;
      });
      return norm;
    } catch {
      const norm = normalizePayroll(payrollData);
      setPayroll(prev => {
        const next = [norm, ...prev.filter(p => p.id !== norm.id && !(p.staffId === norm.staffId && p.month === norm.month))];
        saveCache('cache_payroll', next);
        return next;
      });
      return norm;
    }
  };

  const updatePayroll = async (id: string, updateData: any) => {
    const payload: any = {};
    if (updateData.basic !== undefined || updateData.salary !== undefined) {
      payload.salary = updateData.basic !== undefined ? updateData.basic : updateData.salary;
    }
    if (updateData.bonus !== undefined) payload.bonus = updateData.bonus;
    if (updateData.deductions !== undefined) payload.deductions = updateData.deductions;
    if (updateData.netPay !== undefined || updateData.net_salary !== undefined) {
      payload.net_salary = updateData.netPay !== undefined ? updateData.netPay : updateData.net_salary;
    }
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.paymentAccount !== undefined || updateData.account_type !== undefined) {
      payload.account_type = updateData.paymentAccount === 'Savings' ? 'Savings A/c' : (updateData.account_type || 'Current A/c');
    }
    if (updateData.deductionReason !== undefined || updateData.deduction_reason !== undefined) {
      payload.deduction_reason = updateData.deductionReason !== undefined ? updateData.deductionReason : updateData.deduction_reason;
    }
    if (updateData.isManualDeduction !== undefined || updateData.is_manual_deduction !== undefined) {
      payload.is_manual_deduction = Boolean(updateData.isManualDeduction !== undefined ? updateData.isManualDeduction : updateData.is_manual_deduction);
    }

    try {
      const data = await apiFetch(`${API_BASE_URL}/payroll/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const norm = normalizePayroll(data);
      setPayroll(prev => {
        const next = prev.map(p => p.id === id ? norm : p);
        saveCache('cache_payroll', next);
        return next;
      });
      return norm;
    } catch {
      setPayroll(prev => {
        const next = prev.map(p => p.id === id ? normalizePayroll({ ...p, ...updateData }) : p);
        saveCache('cache_payroll', next);
        return next;
      });
    }
  };

  const bulkUpsertPayroll = async (records: any[]) => {
    if (!records || records.length === 0) return [];
    const payloads = records.map(r => ({
      id: r.id,
      staff_id: r.staffId || r.staff_id,
      employee_name: r.employeeName || r.employee_name || r.name || '',
      month: r.month,
      salary: r.basic !== undefined ? r.basic : (r.salary || 0),
      bonus: r.bonus || 0,
      deductions: r.deductions !== undefined ? r.deductions : 0,
      net_salary: r.netPay !== undefined ? r.netPay : (r.net_salary || 0),
      status: r.status || 'Pending',
      account_type: r.paymentAccount === 'Savings' ? 'Savings A/c' : (r.account_type || 'Current A/c'),
      deduction_reason: r.deductionReason !== undefined ? r.deductionReason : (r.deduction_reason || null),
      is_manual_deduction: Boolean(r.isManualDeduction !== undefined ? r.isManualDeduction : r.is_manual_deduction),
    }));
    try {
      const data = await apiFetch(`${API_BASE_URL}/payroll/bulk`, { method: 'POST', body: JSON.stringify(payloads) });
      const normed = Array.isArray(data) ? data.map(normalizePayroll) : [];
      setPayroll(prev => {
        let next = [...prev];
        normed.forEach(nr => {
          next = [nr, ...next.filter(p => p.id !== nr.id && !(p.staffId === nr.staffId && p.month === nr.month))];
        });
        saveCache('cache_payroll', next);
        return next;
      });
      return normed;
    } catch {
      const normed = records.map(normalizePayroll);
      setPayroll(prev => {
        let next = [...prev];
        normed.forEach(nr => {
          next = [nr, ...next.filter(p => p.id !== nr.id && !(p.staffId === nr.staffId && p.month === nr.month))];
        });
        saveCache('cache_payroll', next);
        return next;
      });
      return normed;
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

  // Employee of the Month evaluations API
  const addOrUpdateEvaluation = async (evalData: Partial<EmployeeEvaluationRecord>) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/employee-of-month`, {
        method: 'POST',
        body: JSON.stringify(evalData)
      });
      setEmployeeEvaluations(prev => {
        const next = [data, ...prev.filter(e => e.id !== data.id && !(e.employee_id === data.employee_id && e.month === data.month))];
        try { localStorage.setItem('cache_employee_evaluations', JSON.stringify(next)); } catch {}
        return next;
      });
      return data;
    } catch {
      const fallbackItem: EmployeeEvaluationRecord = {
        id: evalData.id || `eom-${Date.now()}`,
        employee_id: evalData.employee_id || '',
        employee_name: evalData.employee_name || '',
        employee_role: evalData.employee_role || '',
        month: evalData.month || '',
        year: evalData.year || 2026,
        criteria_scores: evalData.criteria_scores || {},
        total_score: evalData.total_score || 0,
        max_score: evalData.max_score || 100,
        percentage: evalData.percentage || 0,
        is_winner: evalData.is_winner || false,
        badge: evalData.badge || '',
        manager_remarks: evalData.manager_remarks || '',
        evaluated_by: evalData.evaluated_by || currentUser.name,
        evaluated_by_role: evalData.evaluated_by_role || currentUserRole
      };
      setEmployeeEvaluations(prev => {
        const next = [fallbackItem, ...prev.filter(e => e.id !== fallbackItem.id && !(e.employee_id === fallbackItem.employee_id && e.month === fallbackItem.month))];
        try { localStorage.setItem('cache_employee_evaluations', JSON.stringify(next)); } catch {}
        return next;
      });
      return fallbackItem;
    }
  };

  const crownWinner = async (evalId: string) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/employee-of-month/${evalId}/crown`, {
        method: 'POST'
      });
      setEmployeeEvaluations(prev => {
        const next = prev.map(e => {
          if (e.id === evalId) return { ...e, is_winner: true, badge: e.badge || 'Employee of the Month' };
          if (e.month === data.month) return { ...e, is_winner: false };
          return e;
        });
        try { localStorage.setItem('cache_employee_evaluations', JSON.stringify(next)); } catch {}
        return next;
      });
      return data;
    } catch {
      setEmployeeEvaluations(prev => {
        const target = prev.find(e => e.id === evalId);
        const targetMonth = target?.month;
        const next = prev.map(e => {
          if (e.id === evalId) return { ...e, is_winner: true, badge: e.badge || 'Employee of the Month' };
          if (targetMonth && e.month === targetMonth) return { ...e, is_winner: false };
          return e;
        });
        try { localStorage.setItem('cache_employee_evaluations', JSON.stringify(next)); } catch {}
        return next;
      });
    }
  };

  const deleteEvaluation = async (evalId: string) => {
    try {
      await apiFetch(`${API_BASE_URL}/employee-of-month/${evalId}`, { method: 'DELETE' });
    } catch {}
    setEmployeeEvaluations(prev => {
      const next = prev.filter(e => e.id !== evalId);
      try { localStorage.setItem('cache_employee_evaluations', JSON.stringify(next)); } catch {}
      return next;
    });
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
      setStaff(prev => {
        const next = [data, ...prev];
        saveCache('cache_staff', next);
        return next;
      });
      return data;
    } catch {
      setStaff(prev => [staffData, ...prev]);
      return staffData;
    }
  };

  const updateStaff = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/staff/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setStaff(prev => {
        const next = prev.map(s => s.id === id ? data : s);
        saveCache('cache_staff', next);
        return next;
      });
      return data;
    } catch {
      setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updateData } : s));
    }
  };

  const deleteStaff = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/staff/${id}`, { method: 'DELETE' }); } catch {}
    setStaff(prev => {
      const next = prev.filter(s => s.id !== id);
      saveCache('cache_staff', next);
      return next;
    });
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
      const payload = {
        ...productData,
        id: productData.id || `PROD-${Date.now()}`,
        estimated_time: productData.estimated_time !== undefined ? productData.estimated_time : productData.estimatedTime,
        estimated_time_unit: productData.estimated_time_unit || productData.estimatedTimeUnit || 'Hours',
        estimatedTime: productData.estimatedTime !== undefined ? productData.estimatedTime : productData.estimated_time,
        estimatedTimeUnit: productData.estimatedTimeUnit || productData.estimated_time_unit || 'Hours'
      };
      const data = await apiFetch(`${API_BASE_URL}/products`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizeProduct(data || payload);
      setProducts(prev => [norm, ...prev]);
      return norm;
    } catch {
      const fallbackPayload = normalizeProduct({ ...productData, id: productData.id || `PROD-${Date.now()}` });
      setProducts(prev => [fallbackPayload, ...prev]);
      return fallbackPayload;
    }
  };

  const updateProduct = async (id: string, updateData: any) => {
    try {
      const payload = {
        ...updateData,
        estimated_time: updateData.estimated_time !== undefined ? updateData.estimated_time : updateData.estimatedTime,
        estimated_time_unit: updateData.estimated_time_unit || updateData.estimatedTimeUnit,
        estimatedTime: updateData.estimatedTime !== undefined ? updateData.estimatedTime : updateData.estimated_time,
        estimatedTimeUnit: updateData.estimatedTimeUnit || updateData.estimated_time_unit
      };
      const data = await apiFetch(`${API_BASE_URL}/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const norm = normalizeProduct(data || { ...updateData, id });
      setProducts(prev => prev.map(p => p.id === id ? norm : p));
      return norm;
    } catch {
      setProducts(prev => prev.map(p => p.id === id ? normalizeProduct({ ...p, ...updateData }) : p));
    }
  };

  const deleteProduct = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' }); } catch {}
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Attendance API
  const addAttendance = async (attData: any) => {
    const staffIdVal = attData.staff_id || attData.staffId;
    const matchedStaff = staffIdVal ? staffRef.current.find((s: any) => s.id === staffIdVal) : null;
    const payload: any = {
      ...attData,
      staff_id: staffIdVal,
      staff_name: attData.staff_name || attData.staffName || matchedStaff?.name || 'Staff Member',
      check_in: attData.check_in !== undefined ? attData.check_in : (attData.checkIn ?? null),
      check_out: attData.check_out !== undefined ? attData.check_out : (attData.checkOut ?? null),
    };
    if (attData.isLate !== undefined && payload.is_late === undefined) payload.is_late = Boolean(attData.isLate);
    if (attData.lateMinutes !== undefined && payload.late_minutes === undefined) payload.late_minutes = Number(attData.lateMinutes) || 0;
    if (attData.penaltyAmount !== undefined && payload.penalty_amount === undefined) payload.penalty_amount = Number(attData.penaltyAmount) || 0;
    if (attData.warningNote !== undefined && payload.warning_note === undefined) payload.warning_note = attData.warningNote;
    try {
      const data = await apiFetch(`${API_BASE_URL}/attendance`, { method: 'POST', body: JSON.stringify(payload) });
      const mapped = {
        ...data,
        staffId: data.staff_id || data.staffId,
        staffName: data.staff_name || data.staffName,
        checkIn: data.check_in ?? data.checkIn ?? '',
        checkOut: data.check_out ?? data.checkOut ?? '',
        isLate: data.is_late !== undefined ? data.is_late : (data.isLate ?? attData.isLate ?? false),
        lateMinutes: data.late_minutes !== undefined ? data.late_minutes : (data.lateMinutes ?? attData.lateMinutes ?? 0),
        penaltyAmount: data.penalty_amount !== undefined ? data.penalty_amount : (data.penaltyAmount ?? attData.penaltyAmount ?? 0),
        warningNote: data.warning_note !== undefined ? (data.warning_note || '') : (data.warningNote || attData.warningNote || '')
      };
      setAttendance(prev => [mapped, ...prev]);
      return mapped;
    } catch {
      setAttendance(prev => [attData, ...prev]);
      return attData;
    }
  };

  const updateAttendance = async (id: string, updateData: any) => {
    const payload: any = { ...updateData };
    if (updateData.checkIn !== undefined && payload.check_in === undefined) payload.check_in = updateData.checkIn;
    if (updateData.checkOut !== undefined && payload.check_out === undefined) payload.check_out = updateData.checkOut;
    if (updateData.isLate !== undefined && payload.is_late === undefined) payload.is_late = Boolean(updateData.isLate);
    if (updateData.lateMinutes !== undefined && payload.late_minutes === undefined) payload.late_minutes = Number(updateData.lateMinutes) || 0;
    if (updateData.penaltyAmount !== undefined && payload.penalty_amount === undefined) payload.penalty_amount = Number(updateData.penaltyAmount) || 0;
    if (updateData.warningNote !== undefined && payload.warning_note === undefined) payload.warning_note = updateData.warningNote;
    try {
      const data = await apiFetch(`${API_BASE_URL}/attendance/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const mapped = {
        ...data,
        staffId: data.staff_id || data.staffId,
        staffName: data.staff_name || data.staffName,
        checkIn: data.check_in ?? data.checkIn ?? '',
        checkOut: data.check_out ?? data.checkOut ?? '',
        isLate: data.is_late !== undefined ? data.is_late : (data.isLate ?? updateData.isLate ?? false),
        lateMinutes: data.late_minutes !== undefined ? data.late_minutes : (data.lateMinutes ?? updateData.lateMinutes ?? 0),
        penaltyAmount: data.penalty_amount !== undefined ? data.penalty_amount : (data.penaltyAmount ?? updateData.penaltyAmount ?? 0),
        warningNote: data.warning_note !== undefined ? (data.warning_note || '') : (data.warningNote || updateData.warningNote || '')
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
      setLeaveRequests(prev => {
        const next = [norm, ...prev];
        saveCache('cache_leave_requests', next);
        return next;
      });
      return norm;
    } catch {
      const norm = normalizeLeaveRequest({ ...leaveData, id: leaveData.id || `leave-${Date.now()}` });
      setLeaveRequests(prev => {
        const next = [norm, ...prev];
        saveCache('cache_leave_requests', next);
        return next;
      });
      return norm;
    }
  };

  const deleteLeaveRequest = async (id: string) => {
    try { await apiFetch(`${API_BASE_URL}/leaves/requests/${id}`, { method: 'DELETE' }); } catch {}
    setLeaveRequests(prev => {
      const next = prev.filter(r => r.id !== id);
      saveCache('cache_leave_requests', next);
      return next;
    });
  };

  const updateLeaveRequest = async (id: string, updateData: any) => {
    const payload: any = {};
    if (updateData.type !== undefined) payload.type = updateData.type;
    if (updateData.fromDate !== undefined || updateData.from_date !== undefined) payload.from_date = updateData.fromDate ?? updateData.from_date;
    if (updateData.toDate !== undefined || updateData.to_date !== undefined) payload.to_date = updateData.toDate ?? updateData.to_date;
    if (updateData.days !== undefined) payload.days = updateData.days;
    if (updateData.reason !== undefined) payload.reason = updateData.reason;
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.reviewedBy !== undefined || updateData.reviewed_by !== undefined) payload.reviewed_by = updateData.reviewedBy ?? updateData.reviewed_by;
    if (updateData.reviewNote !== undefined || updateData.review_note !== undefined) payload.review_note = updateData.reviewNote ?? updateData.review_note;
    if (updateData.reviewedOn !== undefined || updateData.reviewed_on !== undefined) payload.reviewed_on = updateData.reviewedOn ?? updateData.reviewed_on;
    if (updateData.isHalfDay !== undefined || updateData.is_half_day !== undefined) payload.is_half_day = updateData.isHalfDay ?? updateData.is_half_day;
    if (updateData.halfDaySession !== undefined || updateData.half_day_session !== undefined) payload.half_day_session = updateData.halfDaySession ?? updateData.half_day_session;

    try {
      const data = await apiFetch(`${API_BASE_URL}/leaves/requests/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      const norm = normalizeLeaveRequest(data);
      setLeaveRequests(prev => {
        const next = prev.map(r => r.id === id ? norm : r);
        saveCache('cache_leave_requests', next);
        return next;
      });
      return norm;
    } catch {
      setLeaveRequests(prev => {
        const next = prev.map(r => r.id === id ? normalizeLeaveRequest({ ...r, ...updateData }) : r);
        saveCache('cache_leave_requests', next);
        return next;
      });
    }
  };

  const updateLeaveBalance = async (staffId: string, updates: Partial<LeaveBalance>) => {
    setLeaveBalances(prev => {
      const idx = prev.findIndex(b => b.staffId === staffId);
      const next = idx >= 0
        ? prev.map(b => b.staffId === staffId ? { ...b, ...updates } : b)
        : [...prev, { staffId, casual: 0, sick: 3, earned: 12, ...updates }];
      saveCache('cache_leave_balances', next);
      return next;
    });
    try {
      const data = await apiFetch(`${API_BASE_URL}/leaves/balances/${staffId}`, {
        method: 'PUT',
        body: JSON.stringify({
          casual: updates.casual,
          sick: updates.sick,
          earned: updates.earned,
        }),
      });
      const norm = normalizeLeaveBalance(data);
      setLeaveBalances(prev => {
        const idx = prev.findIndex(b => b.staffId === staffId);
        const next = idx >= 0 ? prev.map(b => b.staffId === staffId ? norm : b) : [...prev, norm];
        saveCache('cache_leave_balances', next);
        return next;
      });
      return norm;
    } catch (err) {
      console.warn('Failed to persist leave balance update:', err);
    }
  };

  const resetLeaveBalances = async () => {
    setLeaveBalances(prev => {
      const next = prev.map(b => ({ ...b, casual: 0, sick: 3, earned: 12 }));
      saveCache('cache_leave_balances', next);
      return next;
    });
    try {
      const data = await apiFetch(`${API_BASE_URL}/leaves/balances/reset`, { method: 'POST' });
      if (Array.isArray(data)) {
        const normed = data.map(normalizeLeaveBalance);
        setLeaveBalances(normed);
        saveCache('cache_leave_balances', normed);
        return normed;
      }
    } catch (err) {
      console.warn('Failed to reset leave balances:', err);
    }
  };

  // Holidays API
  const addHoliday = async (holidayData: any) => {
    if (deletedSundayDates.includes(holidayData.date)) {
      const updatedDeleted = deletedSundayDates.filter(d => d !== holidayData.date);
      setDeletedSundayDates(updatedDeleted);
      saveCache('cache_deleted_sundays', updatedDeleted);
    }
    try {
      const data = await apiFetch(`${API_BASE_URL}/holidays`, { method: 'POST', body: JSON.stringify(holidayData) });
      setHolidays(prev => [...prev.filter(h => h.id !== data.id && h.date !== data.date), data].sort((a, b) => a.date.localeCompare(b.date)));
      return data;
    } catch {
      const newHol = { id: holidayData.id || `hol-${Date.now()}`, ...holidayData };
      setHolidays(prev => [...prev.filter(h => h.id !== newHol.id && h.date !== newHol.date), newHol].sort((a, b) => a.date.localeCompare(b.date)));
      return newHol;
    }
  };

  const deleteHoliday = async (id: string) => {
    const target = holidays.find(h => h.id === id);
    if (target) {
      const dateObj = new Date(target.date + 'T00:00:00');
      const isSunday = dateObj.getDay() === 0 || target.id.startsWith('sun-') || target.name.toLowerCase().includes('sunday');
      if (isSunday) {
        const updatedDeleted = Array.from(new Set([...deletedSundayDates, target.date]));
        setDeletedSundayDates(updatedDeleted);
        saveCache('cache_deleted_sundays', updatedDeleted);
      }
    }
    try { await apiFetch(`${API_BASE_URL}/holidays/${id}`, { method: 'DELETE' }); } catch {}
    setHolidays(prev => prev.filter(h => h.id !== id));
  };

  const restoreAllSundays = (year?: number) => {
    const yrStr = year ? String(year) : '';
    const updated = yrStr ? deletedSundayDates.filter(d => !d.startsWith(yrStr)) : [];
    setDeletedSundayDates(updated);
    saveCache('cache_deleted_sundays', updated);
    setHolidays(prev => mergeSundaysWithHolidays(prev, updated));
  };

  // WorkLogs API
  const addWorkLog = async (logData: any) => {
    try {
      const staffName = logData.staff_name || logData.userName || logData.staffName || 'Staff Member';
      const staffId = logData.staff_id || logData.staffId || null;
      const jobId = logData.job_id || logData.jobId || null;
      const jobTitle = logData.job_title || logData.jobTitle || 'Work Log';
      const date = logData.date || new Date().toISOString().slice(0, 10);
      const startTime = Number(logData.start_time ?? logData.startTime) || Date.now();
      const endTime = Number(logData.end_time ?? logData.endTime) || Date.now();
      const duration = Number(logData.duration) || Math.max(0, Math.round((endTime - startTime) / 1000));
      const hours = Number(logData.hours) || Math.round((duration / 3600) * 100) / 100;

      const payload = {
        staff_id: staffId,
        staff_name: staffName,
        job_id: jobId,
        job_title: jobTitle,
        date,
        start_time: startTime,
        end_time: endTime,
        duration,
        hours,
        description: logData.description || ''
      };
      const data = await apiFetch(`${API_BASE_URL}/worklogs`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizeWorkLog(data);
      setWorkLogs(prev => [norm, ...prev]);
      return norm;
    } catch (err) {
      console.warn("Failed to persist worklog via API:", err);
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
    } catch (err: any) {
      if (err?.message?.includes('already exists') || err?.message?.includes('HTTP 400')) {
        throw err;
      }
      setVendors(prev => [vendorData, ...prev]);
      return vendorData;
    }
  };

  const updateVendor = async (id: string, updateData: any) => {
    try {
      const data = await apiFetch(`${API_BASE_URL}/vendors/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      setVendors(prev => prev.map(v => v.id === id ? data : v));
      return data;
    } catch (err: any) {
      if (err?.message?.includes('already exists') || err?.message?.includes('HTTP 400')) {
        throw err;
      }
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
    const payload = {
      id: projectData.id || `proj-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: projectData.name || projectData.title || 'Untitled Project',
      title: projectData.name || projectData.title || 'Untitled Project',
      clientId: clientId,
      client_id: clientId,
      category: projectData.category || 'Designing',
      status: projectData.status || 'Planning',
      budget: parseFloat(projectData.budget) || 0,
      deadline: projectData.deadline || null,
      productId: projectData.productId || null,
      product_id: projectData.productId || null,
      contentCalendar: projectData.contentCalendar || []
    };

    try {
      const data = await apiFetch(`${API_BASE_URL}/projects`, { method: 'POST', body: JSON.stringify(payload) });
      const norm = normalizeProject(data);
      setProjects(prev => [norm, ...prev.filter(p => p.id !== norm.id)]);
      setClients(prev => prev.map(c => {
        if (c.id === clientId) {
          const filtered = (c.projects || []).filter((p: any) => p.id !== norm.id && p.name !== norm.name);
          return { ...c, projects: [norm, ...filtered] };
        }
        return c;
      }));
      return norm;
    } catch {
      const norm = normalizeProject(payload);
      setProjects(prev => [norm, ...prev.filter(p => p.id !== norm.id)]);
      setClients(prev => prev.map(c => {
        if (c.id === clientId) {
          const filtered = (c.projects || []).filter((p: any) => p.id !== norm.id && p.name !== norm.name);
          return { ...c, projects: [norm, ...filtered] };
        }
        return c;
      }));
      return norm;
    }
  };

  const updateProject = async (clientId: string, projectIndexOrId: any, projectData: any) => {
    const client = clients.find(c => c.id === clientId);
    let targetProject: any = null;
    let projIdx = -1;

    if (typeof projectIndexOrId === 'number' && client && client.projects) {
      projIdx = projectIndexOrId;
      targetProject = client.projects[projIdx];
    } else if (typeof projectIndexOrId === 'string') {
      targetProject = projects.find(p => p.id === projectIndexOrId) || (client?.projects || []).find((p: any) => p.id === projectIndexOrId || p.name === projectIndexOrId);
    }

    const projectId = projectData?.id || (typeof projectIndexOrId === 'string' ? projectIndexOrId : targetProject?.id) || null;
    if (!targetProject && projectId) {
      targetProject = projects.find(p => p.id === projectId) || (client?.projects || []).find((p: any) => p.id === projectId);
    }
    if (projIdx === -1 && client?.projects && projectId) {
      projIdx = client.projects.findIndex((p: any) => p.id === projectId);
    }

    const resolvedCalendar = projectData.contentCalendar !== undefined 
      ? projectData.contentCalendar 
      : (projectData.content_calendar !== undefined 
          ? projectData.content_calendar 
          : (targetProject?.contentCalendar || targetProject?.content_calendar || []));

    const payload = {
      ...projectData,
      id: projectId,
      clientId: clientId || targetProject?.clientId || targetProject?.client_id,
      client_id: clientId || targetProject?.clientId || targetProject?.client_id,
      name: projectData.name || projectData.title || targetProject?.name,
      title: projectData.name || projectData.title || targetProject?.title,
      category: projectData.category || targetProject?.category || 'Designing',
      status: projectData.status || targetProject?.status || 'Planning',
      budget: projectData.budget !== undefined ? (parseFloat(projectData.budget) || 0) : targetProject?.budget,
      deadline: projectData.deadline !== undefined ? projectData.deadline : targetProject?.deadline,
      contentCalendar: resolvedCalendar,
      content_calendar: resolvedCalendar
    };

    if (projectId) {
      try {
        const data = await apiFetch(`${API_BASE_URL}/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(payload) });
        const norm = normalizeProject(data || payload);
        setProjects(prev => {
          const exists = prev.some(p => p.id === projectId);
          return exists ? prev.map(p => p.id === projectId ? norm : p) : [norm, ...prev];
        });
        setClients(prev => prev.map(c => {
          if (c.id === clientId || c.id === norm.clientId) {
            let matched = false;
            const updated = (c.projects || []).map((p: any, idx: number) => {
              if (p.id === projectId || (projIdx >= 0 && idx === projIdx)) {
                matched = true;
                return norm;
              }
              return p;
            });
            if (!matched) {
              updated.push(norm);
            }
            return { ...c, projects: updated };
          }
          return c;
        }));
        return norm;
      } catch (err) {
        console.error('Failed to update project via API:', err);
        const norm = normalizeProject({ ...targetProject, ...payload, id: projectId });
        setProjects(prev => {
          const exists = prev.some(p => p.id === projectId);
          return exists ? prev.map(p => p.id === projectId ? norm : p) : [norm, ...prev];
        });
        setClients(prev => prev.map(c => {
          if (c.id === clientId || c.id === norm.clientId) {
            let matched = false;
            const updated = (c.projects || []).map((p: any, idx: number) => {
              if (p.id === projectId || (projIdx >= 0 && idx === projIdx)) {
                matched = true;
                return norm;
              }
              return p;
            });
            if (!matched) {
              updated.push(norm);
            }
            return { ...c, projects: updated };
          }
          return c;
        }));
        return norm;
      }
    } else {
      const norm = normalizeProject({ ...projectData, clientId });
      setClients(prev => prev.map(c => {
        if (c.id === clientId) {
          const updated = [...(c.projects || [])];
          if (projIdx >= 0 && projIdx < updated.length) {
            updated[projIdx] = norm;
          } else {
            updated.push(norm);
          }
          return { ...c, projects: updated };
        }
        return c;
      }));
      return norm;
    }
  };

  const deleteProject = async (id: string, clientId?: string) => {
    try {
      await apiFetch(`${API_BASE_URL}/projects/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend delete project error:', e);
    }
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id && p.name !== id);
      try { localStorage.setItem('cache_projects', JSON.stringify(next)); } catch {}
      return next;
    });
    setClients(prev => {
      const next = prev.map(c => {
        if (!clientId || c.id === clientId) {
          return {
            ...c,
            projects: (c.projects || []).filter((p: any) => p.id !== id && p.name !== id)
          };
        }
        return c;
      });
      try { localStorage.setItem('cache_clients', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const updateDailyRating = (userName: string, date: string, rating: number) => {
    setDailyRatings(prev => ({
      ...prev,
      [`${userName}_${date}`]: rating
    }));
  };

  const performAutoPunchOut = async (overrideEndTime?: number) => {
    if (!isPunchedIn) return;
    const nowMs = Date.now();
    const sessionStartTime = activeJobTracker?.startTime || punchInTime || nowMs;
    const endTime = overrideEndTime
      ? Math.max(sessionStartTime, Math.min(nowMs, overrideEndTime))
      : nowMs;
    const sessionDuration = Math.max(0, Math.floor((endTime - sessionStartTime) / 1000));

    let finalJobId = 'N/A';
    let finalJobTitle = 'N/A';

    if (activeJobTracker) {
      finalJobId = activeJobTracker.jobId;
      const job = jobs.find(j => j.id === finalJobId);
      if (job) {
        finalJobTitle = job.title;
        await updateJob(finalJobId, { trackedTime: (job.trackedTime || 0) + sessionDuration, status: 'Pending', startedAt: null });
      } else if (finalJobId.startsWith('activity-')) {
        if (finalJobId === 'activity-courier-drop') finalJobTitle = '📦 Courier Drop-off';
        else if (finalJobId === 'activity-courier-collect') finalJobTitle = '📦 Courier Collection / Pickup';
        else if (finalJobId === 'activity-outdoor-visit') finalJobTitle = '🚗 Client Visit / Outdoor Duty';
        else finalJobTitle = 'Field Duty';
      } else {
        finalJobTitle = 'General Work';
      }
      setActiveJobTracker(null);
    } else if (currentUserRole === 'Manager') {
      finalJobId = 'manager-shift';
      finalJobTitle = 'Management & Supervision';
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
      start_time: sessionStartTime,
      end_time: endTime,
      duration: sessionDuration,
      hours: sessionDuration / 3600
    });

    const newPunchSession = { in: checkInStr, out: checkOutStr, jobId: null, jobStartedAt: null };
    const existingRecord = attendance.find(a => (a.staffId || a.staff_id) === loggedStaffId && a.date === todayStr);

    if (existingRecord) {
      const existingPunches = existingRecord.punches || [];
      let hasClosedActive = false;
      const newPunches = existingPunches.map((p: any) => {
        if (!p.out) {
          hasClosedActive = true;
          return { ...p, out: checkOutStr, jobId: null, jobStartedAt: null };
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

  const contextValue = useMemo(() => ({
    leads, setLeads, addLead, updateLead, deleteLead,
    clients, setClients, addClient, updateClient, deleteClient,
    products, setProducts, addProduct, updateProduct, deleteProduct,
    staff, setStaff, addStaff, updateStaff, deleteStaff,
    attendance, setAttendance, addAttendance, updateAttendance,
    payroll, setPayroll, addPayroll, updatePayroll, bulkUpsertPayroll,
    vendors, setVendors, addVendor, updateVendor, deleteVendor,
    jobs, setJobs, addJob, updateJob, deleteJob,
    invoices, setInvoices, addInvoice, updateInvoice, deleteInvoice,
    holidays, setHolidays, addHoliday, deleteHoliday,
    deletedSundayDates, restoreAllSundays,
    leaveRequests, setLeaveRequests, addLeaveRequest, updateLeaveRequest, deleteLeaveRequest,
    leaveBalances, setLeaveBalances, updateLeaveBalance, resetLeaveBalances,
    convertLeadToClient,
    projects,
    setProjects,
    addProject,
    updateProject,
    deleteProject,
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
    employeeEvaluations,
    setEmployeeEvaluations,
    addOrUpdateEvaluation,
    crownWinner,
    deleteEvaluation,
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
    refreshApiData,
    accessRestrictions,
    unreadChatCount,
    setUnreadChatCount,
    fetchUnreadSummaries
  }), [
    leads, clients, products, staff, attendance, payroll, vendors, jobs, invoices, holidays,
    deletedSundayDates, leaveRequests, leaveBalances, accessRestrictions, projects, activeFilterIntent,
    isPunchedIn, punchInTime, fieldDuties, activeJobTracker, workLogs, dailyRatings,
    dailyProgressRecords, employeeEvaluations, rolePermissions, currentUserRole, currentUser,
    isPunchInModalOpen, unreadChatCount, fetchUnreadSummaries
  ]);

  return (
    <DataContext.Provider value={contextValue}>
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
