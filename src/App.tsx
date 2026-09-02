import { useState, useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { AdminDashboard } from './components/AdminDashboard';
import { LeadsPage } from './components/LeadsPage';
import { SettingsPage } from './components/SettingsPage';
import { SettingsProvider } from './context/SettingsContext';

function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('currentPage') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  return (
    <SettingsProvider>
      <DashboardLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
        {currentPage === 'dashboard' && <AdminDashboard />}
        {currentPage === 'leads' && <LeadsPage />}
        {currentPage === 'settings' && <SettingsPage />}
      </DashboardLayout>
    </SettingsProvider>
  );
}

export default App;

