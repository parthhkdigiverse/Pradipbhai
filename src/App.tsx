import { useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { AdminDashboard } from './components/AdminDashboard';
import { LeadsPage } from './components/LeadsPage';
import { ClientsPage } from './components/ClientsPage';
import { SettingsPage } from './components/SettingsPage';
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
          {currentPage === 'settings' && <SettingsPage />}
        </DashboardLayout>
      </DataProvider>
    </SettingsProvider>
  );
}

export default App;

