import { useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { AdminDashboard } from './components/AdminDashboard';
import { LeadsPage } from './components/LeadsPage';
import { ClientsPage } from './components/ClientsPage';
import { SettingsPage } from './components/SettingsPage';
import { ProjectsPage } from './components/ProjectsPage';
import { SocialMediaPage } from './components/SocialMediaPage';
import { ChatPage } from './components/ChatPage';
import { CatalogPage } from './components/CatalogPage';
import { StaffPage } from './components/StaffPage';
import { AttendancePage } from './components/AttendancePage';
import { PayrollPage } from './components/PayrollPage';
import { VendorsPage } from './components/VendorsPage';
import { JobsPage } from './components/JobsPage';
import { InvoicesPage } from './components/InvoicesPage';
import { ReportsPage } from './components/ReportsPage';
import { SettingsProvider } from './context/SettingsContext';
import { DataProvider } from './context/DataContext';

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('currentPage') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  return (
    <SettingsProvider>
      <DataProvider>
        <DashboardLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
          {currentPage === 'dashboard' && <AdminDashboard />}
          {currentPage === 'leads' && <LeadsPage />}
          {currentPage === 'clients' && <ClientsPage />}
          {currentPage === 'projects' && <ProjectsPage />}
          {currentPage === 'social' && <SocialMediaPage />}
          {currentPage === 'chat' && <ChatPage />}
          {currentPage === 'catalog' && <CatalogPage />}
          {currentPage === 'staff' && <StaffPage />}
          {currentPage === 'attendance' && <AttendancePage />}
          {currentPage === 'payroll' && <PayrollPage />}
          {currentPage === 'vendors' && <VendorsPage />}
          {currentPage === 'jobs' && <JobsPage />}
          {currentPage === 'invoices' && <InvoicesPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'settings' && <SettingsPage />}
        </DashboardLayout>
      </DataProvider>
    </SettingsProvider>
  );
}

export default App;

