import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { AircraftFleetProfile } from './components/AircraftFleetProfile';
import { AircraftFleetDailyUpdate } from './components/AircraftFleetDailyUpdate';
import { AircraftTechnicalLogbook } from './components/AircraftTechnicalLogbook';
import { DocumentOnBoard } from './components/DocumentOnBoard';
import { AircraftDocumentOnBoard } from './components/AircraftDocumentOnBoard';
import { CertificateMonitoring } from './components/CertificateMonitoring';
import { Settings } from './components/Settings';
import { AircraftDetail } from './components/AircraftDetail';
import { MaintenanceLogbook } from './components/MaintenanceLogbook';
import { Maintenance } from './components/Maintenance';
import { Operation } from './components/Operation';
import { ReliabilityMonitoring } from './components/ReliabilityMonitoring';
import { TCCDetail } from './components/TCCDetail';
import { ADWorkOrders } from './components/ADWorkOrders';
import { Copy, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

function RedirectToMaintenanceLdnd() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/profile/${id ?? ""}/maintenance-ldnd`} replace />;
}

function AppContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => Boolean(localStorage.getItem("access_token"))
  );
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  // Determine if we're on a special page that hides the header
  const isSpecialPage = location.pathname.includes('/reliability/') ||
                        location.pathname.includes('/maintenance-ad-work-orders/');

  if (!isAuthenticated && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  if (isLoginPage && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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
        <div 
          className={`${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 lg:py-5 flex items-center justify-between transition-all duration-300`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <Copy className="w-5 h-5 text-gray-600" />
            <h1 className="text-gray-900 text-base sm:text-lg lg:text-xl truncate">Aircraft Fleet Management System</h1>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div 
        className={`${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} ${isSpecialPage ? 'min-h-screen' : 'p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-[calc(100vh-65px)] lg:min-h-[calc(100vh-73px)]'} transition-all duration-300`}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<AircraftFleetProfile />} />
          <Route path="/profile/:id" element={<AircraftDetail />} />
          <Route path="/profile/:id/logbook" element={<MaintenanceLogbook />} />
          <Route path="/profile/:id/maintenance" element={<RedirectToMaintenanceLdnd />} />
          <Route path="/profile/:id/maintenance-ad-work-orders/:ad_monitoring_id" element={<ADWorkOrders />} />
          <Route path="/profile/:id/maintenance-tcc" element={<Maintenance />} />
          <Route path="/profile/:id/maintenance-ldnd" element={<Maintenance />} />
          <Route path="/profile/:id/maintenance-ad" element={<Maintenance />} />
          <Route path="/profile/:id/maintenance-cpcp" element={<Maintenance />} />
          <Route path="/profile/:id/operation" element={<Operation />} />
          <Route path="/profile/:id/operation/reliability/:recordId" element={<ReliabilityMonitoring />} />
          <Route path="/profile/:aircraft_id/document_on_board" element={<AircraftDocumentOnBoard />} />
          <Route path="/daily-update" element={<AircraftFleetDailyUpdate />} />
          <Route path="/technical-logbook" element={<AircraftTechnicalLogbook />} />
          <Route path="/document-on-board" element={<DocumentOnBoard />} />
          <Route path="/certificate-monitoring" element={<CertificateMonitoring />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
