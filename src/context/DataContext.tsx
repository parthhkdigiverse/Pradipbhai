import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSettings } from './SettingsContext';

// Initial Mock Data
const initialLeads = [
  {
    id: '1',
    company: 'Tech Solutions Inc',
    contact: 'John Doe',
    email: 'john@techsolutions.com',
    phone: '+1 234-567-8900',
    source: 'Website',
    category: 'Hot Lead',
    status: 'Lead',
    priority: 'High',
    isHot: true,
    createdByUserName: 'Admin',
    date: '2026-09-01',
    expectedIncome: '10000',
    followUps: [
      { date: '2026-09-10', note: 'Call to discuss pricing proposal' }
    ]
  },
  {
    id: '2',
    company: 'Digital Marketing Co',
    contact: 'Jane Smith',
    email: 'jane@digitalmarketing.com',
    phone: '+1 987-654-3210',
    source: 'Referral',
    category: 'Warm Lead',
    status: 'Contacted',
    priority: 'Medium',
    isHot: false,
    createdByUserName: 'Sales Rep 1',
    date: '2026-08-28',
    expectedIncome: '5000',
    followUps: [
      { date: '2026-09-05', note: 'Check if they received the email' }
    ]
  },
  {
    id: '3',
    company: 'Global Enterprises',
    contact: 'Mike Johnson',
    email: 'mike@global.com',
    phone: '+1 555-123-4567',
    source: 'Cold Call',
    category: 'Cold Lead',
    status: 'Proposal Sent',
    priority: 'Low',
    isHot: false,
    createdByUserName: 'Sales Rep 2',
    date: '2026-08-15',
    expectedIncome: '2000',
    followUps: []
  },
  {
    id: '4',
    company: 'Alpha Innovations',
    contact: 'Sarah Connor',
    email: 'sarah@alpha.com',
    phone: '+1 111-222-3333',
    source: 'Event',
    category: 'Hot Lead',
    status: 'Client Won',
    priority: 'High',
    isHot: false,
    createdByUserName: 'Admin',
    date: '2026-07-20',
    expectedIncome: '25000',
    followUps: []
  }
];

const initialClients = [
  {
    id: '1',
    company: 'TechCorp Industries',
    contact: 'Sarah Jenkins',
    email: 'sarah.j@techcorp.com',
    phone: '+91 98765 43210',
    status: 'Active',
    clientSince: '2024-01-15',
    projects: [
      { name: 'Website Redesign', category: 'Designing', status: 'In Progress', budget: '500000', deadline: '2026-12-01' },
      { name: 'SEO Campaign', category: 'Social Media', status: 'Active', budget: '250000', deadline: '2026-10-31' }
    ]
  },
  {
    id: '2',
    company: 'Global Retail Solutions',
    contact: 'Michael Chang',
    email: 'm.chang@globalretail.com',
    phone: '+91 87654 32109',
    status: 'Onboarding',
    clientSince: '2026-08-20',
    projects: [
      { name: 'ERP Integration', category: 'Des+Print', status: 'Planning', budget: '450000', deadline: '2027-02-28' }
    ]
  },
  {
    id: '3',
    company: 'NextGen Startup',
    contact: 'Priya Sharma',
    email: 'priya@nextgen.in',
    phone: '+91 76543 21098',
    status: 'Active',
    clientSince: '2025-05-10',
    projects: [
      { name: 'Mobile App V2', category: 'Designing', status: 'Completed', budget: '600000', deadline: '2026-01-15' },
      { name: 'Maintenance Contract', category: 'Printing', status: 'Active', budget: '200000', deadline: '2026-12-31' }
    ]
  },
  {
    id: '4',
    company: 'Legacy Manufacturing',
    contact: 'Robert Fox',
    email: 'robert@legacy.com',
    phone: '+91 65432 10987',
    status: 'Inactive',
    clientSince: '2023-11-05',
    projects: [
      { name: 'Digital Audit', category: 'Social Media', status: 'Completed', budget: '150000', deadline: '2024-02-10' }
    ]
  }
];

const initialProducts = [
  { id: '1', name: 'Bag (Non woven)', description: '-', type: 'Printing' },
  { id: '2', name: 'LANYARD', description: '-', type: 'Printing' },
  { id: '3', name: 'Bank Details Corrections', description: '-', type: 'Designing' },
  { id: '4', name: 'Folder File', description: 'Folder File', type: 'Designing' },
  { id: '5', name: 'Channel letter Lighiting Board', description: '-', type: 'Printing' },
  { id: '6', name: 'Carousel', description: 'Carousel', type: 'Designing' },
  { id: '7', name: 'Amazone Listing post', description: 'Amazone Listing post', type: 'Designing' },
  { id: '8', name: 'UV Printing', description: '-', type: 'Printing' }
];

const initialStaff = [
  { id: '1', name: 'Alice Smith', role: 'Senior Designer', email: 'alice@example.com', phone: '+91 98765 11111', status: 'Active', joinDate: '2023-01-15', baseSalary: 60000 },
  { id: '2', name: 'Bob Johnson', role: 'Marketing Manager', email: 'bob@example.com', phone: '+91 98765 22222', status: 'Active', joinDate: '2023-03-20', baseSalary: 75000 },
  { id: '3', name: 'Charlie Brown', role: 'Print Specialist', email: 'charlie@example.com', phone: '+91 98765 33333', status: 'On Leave', joinDate: '2024-05-10', baseSalary: 45000 }
];

const initialAttendance = [
  { id: '1', staffId: '1', date: '2026-09-01', status: 'Present', checkIn: '09:00', checkOut: '18:00' },
  { id: '2', staffId: '2', date: '2026-09-01', status: 'Present', checkIn: '09:15', checkOut: '18:30' },
  { id: '3', staffId: '3', date: '2026-09-01', status: 'Leave', checkIn: '', checkOut: '' },
];

const initialPayroll = [
  { id: '1', staffId: '1', month: '2026-08', basic: 60000, deductions: 0, netPay: 60000, status: 'Paid' },
  { id: '2', staffId: '2', month: '2026-08', basic: 75000, deductions: 2500, netPay: 72500, status: 'Paid' },
  { id: '3', staffId: '3', month: '2026-08', basic: 45000, deductions: 0, netPay: 45000, status: 'Paid' }
];

const initialVendors = [
  { id: '1', name: 'Laxmi Bag Manufacturer', description: '-', category: 'Printer' },
  { id: '2', name: 'STAR RIBBON - MUMBAI', description: '-', category: 'Printer' },
  { id: '3', name: 'Tapi Digital', description: '-', category: 'Printer' },
  { id: '4', name: 'PROGRESSIVE OFFSET', description: '-', category: 'Printer' },
  { id: '5', name: 'Siddheshwar Trading', description: 'cloth print, Flag, khes, etc', category: 'Printer' }
];

const initialJobs = [
  {
    id: '1',
    createdBy: 'Sweety Patel',
    createdAt: '2026-08-24',
    title: 'CROSSWORD - POST DESIGN',
    type: 'Designing',
    description: 'April month sudhi ni krvani che',
    clientId: '1',
    status: 'Pending',
    teamId: '1',
    dueDate: '2026-08-27',
    paymentStatus: 'Unpaid',
    totalAmount: 500,
    paidAmount: 0,
    printerId: null,
    productId: '1'
  },
  {
    id: '2',
    createdBy: 'Gopi Hirapara',
    createdAt: '2026-08-24',
    title: 'Note Post',
    type: 'Designing',
    description: 'Janmashtami Note Post - English, Gujrati and...',
    clientId: '2',
    status: 'Pending',
    teamId: '2',
    dueDate: '2026-08-24',
    paymentStatus: 'Unpaid',
    totalAmount: 1500,
    paidAmount: 0,
    printerId: null,
    productId: '2'
  },
  {
    id: '3',
    createdBy: 'Jeet',
    createdAt: '2026-08-22',
    title: '1537 - heat therm - A4 Letterhead',
    type: 'Printing',
    description: '100 gsm SS = 1000 copy',
    clientId: '3',
    status: 'Progress',
    teamId: null,
    dueDate: '2026-08-26',
    paymentStatus: 'Unpaid',
    totalAmount: 3000,
    paidAmount: 1000,
    printerId: '3',
    productId: '5'
  }
];

interface DataContextType {
  leads: any[];
  setLeads: React.Dispatch<React.SetStateAction<any[]>>;
  clients: any[];
  setClients: React.Dispatch<React.SetStateAction<any[]>>;
  products: any[];
  setProducts: React.Dispatch<React.SetStateAction<any[]>>;
  staff: any[];
  setStaff: React.Dispatch<React.SetStateAction<any[]>>;
  attendance: any[];
  setAttendance: React.Dispatch<React.SetStateAction<any[]>>;
  payroll: any[];
  setPayroll: React.Dispatch<React.SetStateAction<any[]>>;
  vendors: any[];
  setVendors: React.Dispatch<React.SetStateAction<any[]>>;
  jobs: any[];
  setJobs: React.Dispatch<React.SetStateAction<any[]>>;
  convertLeadToClient: (lead: any) => void;
  updateProject: (clientId: string, projectIndex: number, projectData: any) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_leads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialLeads;
      }
    }
    return initialLeads;
  });

  const [clients, setClients] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_clients');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialClients;
      }
    }
    return initialClients;
  });

  const [products, setProducts] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialProducts;
      }
    }
    return initialProducts;
  });

  const [staff, setStaff] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_staff');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialStaff;
      }
    }
    return initialStaff;
  });

  const [attendance, setAttendance] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_attendance');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialAttendance;
      }
    }
    return initialAttendance;
  });

  const [payroll, setPayroll] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_payroll');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialPayroll;
      }
    }
    return initialPayroll;
  });

  const [vendors, setVendors] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_vendors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialVendors;
      }
    }
    return initialVendors;
  });

  const [jobs, setJobs] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_jobs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialJobs;
      }
    }
    return initialJobs;
  });

  const { autoConvertLeads } = useSettings();

  const convertLeadToClient = (lead: any) => {
    if (!autoConvertLeads) return;
    
    // Check if client already exists to prevent duplicates if somehow triggered multiple times
    if (clients.some(c => c.company === lead.company && c.email === lead.email)) {
      return;
    }

    const newClient = {
      id: Math.random().toString(36).substr(2, 9),
      company: lead.company,
      contact: lead.contact,
      email: lead.email,
      phone: lead.phone,
      status: 'Onboarding', // default client status
      clientSince: new Date().toISOString().split('T')[0],
      projects: [],
    };
    setClients((prevClients) => [newClient, ...prevClients]);
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

  useEffect(() => {
    localStorage.setItem('app_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('app_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('app_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('app_staff', JSON.stringify(staff));
  }, [staff]);

  useEffect(() => {
    localStorage.setItem('app_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('app_payroll', JSON.stringify(payroll));
  }, [payroll]);

  useEffect(() => {
    localStorage.setItem('app_vendors', JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem('app_jobs', JSON.stringify(jobs));
  }, [jobs]);

  return (
    <DataContext.Provider value={{ 
      leads, setLeads, 
      clients, setClients, 
      products, setProducts, 
      staff, setStaff, 
      attendance, setAttendance, 
      payroll, setPayroll,
      vendors, setVendors,
      jobs, setJobs,
      convertLeadToClient, 
      updateProject 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
