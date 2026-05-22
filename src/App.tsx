import { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { getMe, getPostLoginPath } from './api/authApi';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { AircraftFleetProfile } from './components/AircraftFleetProfile';
import { AircraftFleetDailyUpdate } from './components/AircraftFleetDailyUpdate';
import { AircraftTechnicalLogbook } from './components/AircraftTechnicalLogbook';
import { AircraftStatutoryCertificates } from './components/AircraftStatutoryCertificates';
import { RegulatoryAdvisory } from './components/RegulatoryAdvisory';
import { OrganizationalApprovals } from './components/OrganizationalApprovals';
import { OEMTechnicalPublication } from './components/OEMTechnicalPublication';
import { PersonnelAuthorization } from './components/PersonnelAuthorization';
import { Settings } from './components/Settings';
import { MyProfile } from './components/MyProfile';
import { AircraftDetail } from './components/AircraftDetail';
import { AircraftHistory } from './components/AircraftHistory';
import { MaintenanceLogbook } from './components/MaintenanceLogbook';
import { Maintenance } from './components/Maintenance';
import { Operation } from './components/Operation';
import { ReliabilityMonitoring } from './components/ReliabilityMonitoring';
import { TCCDetail } from './components/TCCDetail';
import { ADWorkOrders } from './components/ADWorkOrders';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Bell, Menu } from 'lucide-react';
import { NotificationsProvider, useNotifications } from './context/NotificationsContext';
import { NotificationsPanel } from './components/NotificationsPanel';
import { SpinnerIcon } from './components/ui/spinner';

function RedirectToMaintenanceLdnd() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/profile/${id ?? ""}/maintenance-ldnd`} replace />;
}

/** Authenticated user opened /login — send them to the same default as post-sign-in. */
function PostLoginRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) navigate(getPostLoginPath(me.role), { replace: true });
      } catch {
        if (!cancelled) navigate("/dashboard", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SpinnerIcon size="lg" />
    </div>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => Boolean(localStorage.getItem("access_token"))
  );
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  if (!isAuthenticated && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  if (isLoginPage && isAuthenticated) {
    return <PostLoginRedirect />;
  }

  if (isLoginPage) {
    return (
      <Login
        onLogin={(username) => {
          localStorage.setItem("auth_username", username);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
    <AuthenticatedShell setIsAuthenticated={setIsAuthenticated} />
  );
}

function AuthenticatedShell({
  setIsAuthenticated,
}: {
  setIsAuthenticated: (v: boolean) => void;
}) {
  const {
    open: openNotifications,
    isOpen: isNotificationsOpen,
    unreadCount,
  } = useNotifications();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isSpecialPage =
    location.pathname.includes("/reliability/") ||
    location.pathname.includes("/maintenance-ad-work-orders/");

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onLogout={() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("auth_username");
          setIsAuthenticated(false);
        }}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      />
      
      {/* Top Header - Hidden for special pages */}
      {!isSpecialPage && (
        <header
          className={`z-30 border-b border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} transition-all duration-300`}
        >
          <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-xl p-2 text-gray-600 transition-colors hover:bg-gray-100 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold tracking-tight text-gray-900 sm:text-base lg:text-lg">
                  Aircraft Fleet Management
                </h1>
                <p className="hidden text-xs text-gray-500 sm:block">Operations dashboard</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openNotifications()}
              className="relative shrink-0 overflow-visible rounded-xl p-2.5 text-gray-600 ring-1 ring-gray-200/80 transition-colors hover:bg-gray-50 hover:text-gray-900"
              aria-label={
                unreadCount > 0
                  ? `Open notifications, ${unreadCount} unread`
                  : 'Open notifications'
              }
              aria-expanded={isNotificationsOpen}
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <Bell className="h-5 w-5 shrink-0" aria-hidden />
                {unreadCount > 0 && (
                  <span className="absolute right-0 top-0 z-10 flex min-h-[1.125rem] min-w-[1.125rem] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-red-600 bg-white px-1 text-[11px] font-bold leading-none text-red-600 shadow-md ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
            </button>
          </div>
        </header>
      )}

      {/* Bell when top header is hidden (e.g. reliability / AD work orders full-screen views) */}
      {isSpecialPage && (
        <button
          type="button"
          onClick={() => openNotifications()}
          className="fixed right-4 top-4 z-30 overflow-visible rounded-xl border border-gray-200/80 bg-white/95 p-2.5 text-gray-600 shadow-md backdrop-blur-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
          aria-label={
            unreadCount > 0
              ? `Open notifications, ${unreadCount} unread`
              : 'Open notifications'
          }
          aria-expanded={isNotificationsOpen}
        >
          <span className="relative inline-flex h-5 w-5 items-center justify-center">
            <Bell className="h-5 w-5 shrink-0" aria-hidden />
            {unreadCount > 0 && (
              <span className="absolute right-0 top-0 z-10 flex min-h-[1.125rem] min-w-[1.125rem] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-red-600 bg-white px-1 text-[11px] font-bold leading-none text-red-600 shadow-md ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
        </button>
      )}

      {/* Main Content */}
      <div 
        className={`min-w-0 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} ${isSpecialPage ? 'min-h-screen' : 'p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-73px)]'} transition-all duration-300`}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute moduleCode="dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/profile" element={<ProtectedRoute moduleCode="profile"><AircraftFleetProfile /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute moduleCode="profile"><AircraftDetail /></ProtectedRoute>} />
          <Route path="/profile/:id/history" element={<ProtectedRoute moduleCode="profile"><AircraftHistory /></ProtectedRoute>} />
          <Route path="/profile/:id/logbook" element={<ProtectedRoute moduleCode="logbook"><MaintenanceLogbook /></ProtectedRoute>} />
          <Route path="/profile/:id/maintenance" element={<ProtectedRoute moduleCode="maintenance"><RedirectToMaintenanceLdnd /></ProtectedRoute>} />
          <Route path="/profile/:id/maintenance-ad-work-orders/:ad_monitoring_id" element={<ProtectedRoute moduleCode="maintenance"><ADWorkOrders /></ProtectedRoute>} />
          <Route path="/profile/:id/maintenance-tcc" element={<ProtectedRoute moduleCode="maintenance"><Maintenance /></ProtectedRoute>} />
          <Route path="/profile/:id/maintenance-ldnd" element={<ProtectedRoute moduleCode="maintenance"><Maintenance /></ProtectedRoute>} />
          <Route path="/profile/:id/maintenance-ad" element={<ProtectedRoute moduleCode="maintenance"><Maintenance /></ProtectedRoute>} />
          <Route path="/profile/:id/maintenance-cpcp" element={<ProtectedRoute moduleCode="maintenance"><Maintenance /></ProtectedRoute>} />
          <Route path="/profile/:id/operation" element={<ProtectedRoute moduleCode="operation"><Operation /></ProtectedRoute>} />
          <Route path="/profile/:id/operation/reliability/:recordId" element={<ProtectedRoute moduleCode="operation"><ReliabilityMonitoring /></ProtectedRoute>} />
          <Route path="/daily-update" element={<ProtectedRoute moduleCode="daily-update"><AircraftFleetDailyUpdate /></ProtectedRoute>} />
          <Route path="/technical-logbook" element={<ProtectedRoute moduleCode="logbook"><AircraftTechnicalLogbook /></ProtectedRoute>} />
          <Route path="/regulatory-compliance" element={<Navigate to="/regulatory-compliance/advisory" replace />} />
          <Route path="/regulatory-compliance/advisory" element={<ProtectedRoute moduleCode="regulatory-compliance"><RegulatoryAdvisory /></ProtectedRoute>} />
          <Route path="/regulatory-compliance/aircraft-statutory-certificates" element={<ProtectedRoute moduleCode="regulatory-compliance"><AircraftStatutoryCertificates /></ProtectedRoute>} />
          <Route path="/regulatory-compliance/organizational-approvals" element={<ProtectedRoute moduleCode="regulatory-compliance"><OrganizationalApprovals /></ProtectedRoute>} />
          <Route path="/regulatory-compliance/oem-technical-publication" element={<ProtectedRoute moduleCode="regulatory-compliance"><OEMTechnicalPublication /></ProtectedRoute>} />
          <Route path="/regulatory-compliance/personnel-authorization" element={<ProtectedRoute moduleCode="regulatory-compliance"><PersonnelAuthorization /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute moduleCode="settings"><Settings /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <NotificationsProvider>
        <AppContent />
        <NotificationsPanel />
      </NotificationsProvider>
    </Router>
  );
}
