import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LoginPage } from './components/LoginPage';
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
import { WorkLogsPage } from './components/WorkLogsPage';
import { ProfilePage } from './components/ProfilePage';
import { DailyProgressPage } from './components/DailyProgressPage';
import { PermissionsPage } from './components/PermissionsPage';
import { RestrictionsPage } from './components/RestrictionsPage';
import { HolidaysPage } from './components/HolidaysPage';
import { LeaveManagementPage } from './components/LeaveManagementPage';
import { ThemeProvider } from './context/ThemeProvider';
import { SettingsProvider } from './context/SettingsContext';
import { DataProvider, useData } from './context/DataContext';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserRole } = useData();
  const isAdmin = currentUserRole === 'Admin';
  const isManager = currentUserRole === 'Manager';
  const isEmployee = !isAdmin && !isManager;

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const handleLogin = (role: string, email: string) => {
    setIsAuthenticated(true);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('userEmail', email);
    window.location.href = '/';
  };

  // Extract current page key from URL pathname (e.g. "/clients" -> "clients")
  const currentPath = location.pathname.substring(1) || 'dashboard';

  const handlePageChange = (pageKey: string) => {
    const targetPath = pageKey === 'dashboard' ? '/' : `/${pageKey}`;
    navigate(targetPath);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout currentPage={currentPath} setCurrentPage={handlePageChange}>
      <Routes>
        <Route path="/" element={<AdminDashboard setCurrentPage={handlePageChange} />} />
        <Route path="/dashboard" element={<AdminDashboard setCurrentPage={handlePageChange} />} />
        <Route path="/leads" element={isEmployee ? <Navigate to="/" replace /> : <LeadsPage />} />
        <Route path="/clients" element={isEmployee ? <Navigate to="/" replace /> : <ClientsPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/social" element={isEmployee ? <Navigate to="/" replace /> : <SocialMediaPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/daily-progress" element={<DailyProgressPage />} />
        <Route path="/staff" element={isEmployee ? <Navigate to="/" replace /> : <StaffPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/worklogs" element={<WorkLogsPage />} />
        <Route path="/payroll" element={isEmployee ? <Navigate to="/" replace /> : <PayrollPage />} />
        <Route path="/vendors" element={isEmployee ? <Navigate to="/" replace /> : <VendorsPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/invoices" element={isEmployee ? <Navigate to="/" replace /> : <InvoicesPage />} />
        <Route path="/reports" element={isEmployee ? <Navigate to="/" replace /> : <ReportsPage setCurrentPage={handlePageChange} />} />
        <Route path="/settings" element={isAdmin || isManager ? <SettingsPage /> : <Navigate to="/" replace />} />
        <Route path="/permissions" element={isAdmin ? <PermissionsPage /> : <Navigate to="/" replace />} />
        <Route path="/restrictions" element={isAdmin ? <RestrictionsPage /> : <Navigate to="/" replace />} />
        <Route path="/holidays" element={<HolidaysPage />} />
        <Route path="/leaves" element={<LeaveManagementPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
