import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AircraftFleetProfile } from './components/AircraftFleetProfile';
import { AircraftFleetDailyUpdate } from './components/AircraftFleetDailyUpdate';
import { AircraftTechnicalLogbook } from './components/AircraftTechnicalLogbook';
import { AircraftDetail } from './components/AircraftDetail';
import { MaintenanceLogbook } from './components/MaintenanceLogbook';
import { Maintenance } from './components/Maintenance';
import { Operation } from './components/Operation';
import { ReliabilityMonitoring } from './components/ReliabilityMonitoring';
import { TCCDetail } from './components/TCCDetail';
import { CPCPDetail } from './components/CPCPDetail';
import { ADWorkOrders } from './components/ADWorkOrders';
import { Copy, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

function AppContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Determine if we're on a special page that hides the header
  const isSpecialPage = location.pathname.includes('/reliability/') || 
                        location.pathname.includes('/tcc/') ||
                        location.pathname.includes('/cpcp/') ||
                        location.pathname.includes('/ad-work-orders/');

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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<AircraftFleetProfile />} />
          <Route path="/profile/:id" element={<AircraftDetail />} />
          <Route path="/profile/:id/logbook" element={<MaintenanceLogbook />} />
          <Route path="/profile/:id/maintenance" element={<Maintenance />} />
          <Route path="/profile/:id/maintenance/tcc/:msn" element={<TCCDetail />} />
          <Route path="/profile/:id/maintenance/cpcp/:msn" element={<CPCPDetail />} />
          <Route path="/profile/:id/maintenance/ad-work-orders/:msn" element={<ADWorkOrders adNumber='1' onBack={()=>console.log("baba")}/>} />
          <Route path="/profile/:id/operation" element={<Operation />} />
          <Route path="/profile/:id/operation/reliability/:recordId" element={<ReliabilityMonitoring />} />
          <Route path="/daily-update" element={<AircraftFleetDailyUpdate />} />
          <Route path="/technical-logbook" element={<AircraftTechnicalLogbook />} />
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
