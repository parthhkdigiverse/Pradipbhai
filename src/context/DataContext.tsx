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

interface DataContextType {
  leads: any[];
  setLeads: React.Dispatch<React.SetStateAction<any[]>>;
  clients: any[];
  setClients: React.Dispatch<React.SetStateAction<any[]>>;
  convertLeadToClient: (lead: any) => void;
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

  useEffect(() => {
    localStorage.setItem('app_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('app_clients', JSON.stringify(clients));
  }, [clients]);

  return (
    <DataContext.Provider value={{ leads, setLeads, clients, setClients, convertLeadToClient }}>
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
