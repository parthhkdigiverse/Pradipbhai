import { useState, useEffect } from 'react';
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
import { EmployeeOfMonthPage } from './components/EmployeeOfMonthPage';
import { InactivityTimeoutGuard } from './components/InactivityTimeoutGuard';
import { ModalFocusGuard } from './components/ModalFocusGuard';
import { ThemeProvider } from './context/ThemeProvider';
import { SettingsProvider } from './context/SettingsContext';
import { DataProvider, useData } from './context/DataContext';
import { ConfirmProvider } from './context/ConfirmContext';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserRole, hasTabPermission } = useData();

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('authToken');
    const isRealToken = Boolean(
      token &&
      token !== 'fallback-session-token' &&
      token !== 'session-active-token' &&
      token !== 'admin' &&
      token !== 'super-admin'
    );
    if (!isRealToken) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('isAuthenticated');
      return false;
    }
    return true;
  });

  useEffect(() => {
    const onAuthExpired = () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('isAuthenticated');
      setIsAuthenticated(false);
    };
    window.addEventListener('auth_expired', onAuthExpired);
    return () => window.removeEventListener('auth_expired', onAuthExpired);
  }, []);

  const handleLogin = (role: string, email: string) => {
    const token = localStorage.getItem('authToken');
    if (!token || token === 'fallback-session-token' || token === 'session-active-token') {
      return;
    }
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

  // Web browser fallback: prompt confirmation dialog before closing / refreshing browser tab if user is logged in
  useEffect(() => {
    // In Electron desktop app, native close confirmation dialog is handled by Electron main process
    if ((window as any).electronAPI) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      if (isAuth) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout currentPage={currentPath} setCurrentPage={handlePageChange}>
      <InactivityTimeoutGuard />
      <ModalFocusGuard />
      <Routes>
        <Route path="/" element={<AdminDashboard setCurrentPage={handlePageChange} />} />
        <Route path="/dashboard" element={<AdminDashboard setCurrentPage={handlePageChange} />} />
        <Route path="/leads" element={hasTabPermission(currentUserRole, 'leads') ? <LeadsPage /> : <Navigate to="/" replace />} />
        <Route path="/clients" element={hasTabPermission(currentUserRole, 'clients') ? <ClientsPage /> : <Navigate to="/" replace />} />
        <Route path="/projects" element={hasTabPermission(currentUserRole, 'projects') ? <ProjectsPage /> : <Navigate to="/" replace />} />
        <Route path="/social" element={hasTabPermission(currentUserRole, 'social') ? <SocialMediaPage /> : <Navigate to="/" replace />} />
        <Route path="/chat" element={hasTabPermission(currentUserRole, 'chat') ? <ChatPage /> : <Navigate to="/" replace />} />
        <Route path="/catalog" element={hasTabPermission(currentUserRole, 'catalog') ? <CatalogPage /> : <Navigate to="/" replace />} />
        <Route path="/daily-progress" element={hasTabPermission(currentUserRole, 'daily-progress') ? <DailyProgressPage /> : <Navigate to="/" replace />} />
        <Route path="/employee-of-month" element={hasTabPermission(currentUserRole, 'employee-of-month') ? <EmployeeOfMonthPage /> : <Navigate to="/" replace />} />
        <Route path="/staff" element={hasTabPermission(currentUserRole, 'staff') ? <StaffPage /> : <Navigate to="/" replace />} />
        <Route path="/attendance" element={hasTabPermission(currentUserRole, 'attendance') ? <AttendancePage /> : <Navigate to="/" replace />} />
        <Route path="/worklogs" element={hasTabPermission(currentUserRole, 'worklogs') ? <WorkLogsPage /> : <Navigate to="/" replace />} />
        <Route path="/payroll" element={hasTabPermission(currentUserRole, 'payroll') ? <PayrollPage /> : <Navigate to="/" replace />} />
        <Route path="/vendors" element={hasTabPermission(currentUserRole, 'vendors') ? <VendorsPage /> : <Navigate to="/" replace />} />
        <Route path="/jobs" element={hasTabPermission(currentUserRole, 'jobs') ? <JobsPage /> : <Navigate to="/" replace />} />
        <Route path="/invoices" element={hasTabPermission(currentUserRole, 'invoices') ? <InvoicesPage /> : <Navigate to="/" replace />} />
        <Route path="/reports" element={hasTabPermission(currentUserRole, 'reports') ? <ReportsPage setCurrentPage={handlePageChange} /> : <Navigate to="/" replace />} />
        <Route path="/settings" element={hasTabPermission(currentUserRole, 'settings') ? <SettingsPage /> : <Navigate to="/" replace />} />
        <Route path="/permissions" element={hasTabPermission(currentUserRole, 'permissions') ? <PermissionsPage /> : <Navigate to="/" replace />} />
        <Route path="/restrictions" element={hasTabPermission(currentUserRole, 'restrictions') ? <RestrictionsPage /> : <Navigate to="/" replace />} />
        <Route path="/holidays" element={hasTabPermission(currentUserRole, 'holidays') ? <HolidaysPage /> : <Navigate to="/" replace />} />
        <Route path="/leaves" element={hasTabPermission(currentUserRole, 'leaves') ? <LeaveManagementPage /> : <Navigate to="/" replace />} />
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
          <ConfirmProvider>
            <AppContent />
          </ConfirmProvider>
        </DataProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
