import { LayoutGrid, Plane, Calendar, Bell, ChevronLeft, ChevronRight, X, FileText, FolderOpen, Award, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUserPermissions } from '../hooks/useUserPermissions';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onLogout?: () => void;
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

/** Sidebar menu item id maps to module code for role-based access */
const MENU_ITEMS = [
  { id: 'dashboard', moduleCode: 'dashboard' as const, label: 'Dashboard', icon: LayoutGrid, path: '/dashboard' },
  { id: 'profile', moduleCode: 'profile' as const, label: 'Aircraft Fleet Profile', icon: Plane, path: '/profile' },
  { id: 'daily-update', moduleCode: 'daily-update' as const, label: 'Aircraft Fleet Daily Update', icon: Calendar, path: '/daily-update' },
  { id: 'technical-logbook', moduleCode: 'logbook' as const, label: 'Aircraft Technical Logbook', icon: FileText, path: '/technical-logbook' },
  { id: 'document-on-board', moduleCode: 'document_on_board' as const, label: 'Document On Board', icon: FolderOpen, path: '/document-on-board' },
  { id: 'certificate-monitoring', moduleCode: 'certificate-monitoring' as const, label: 'Certificate Monitoring', icon: Award, path: '/certificate-monitoring' },
  { id: 'settings', moduleCode: 'settings' as const, label: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar({ isCollapsed, onToggle, onLogout, isMobileMenuOpen = false, onMobileMenuClose }: SidebarProps) {
  const location = useLocation();
  const { canAccess } = useUserPermissions();

  const menuItems = MENU_ITEMS.filter((item) => canAccess(item.moduleCode));

  const isActive = (path: string) => {
    if (path === '/profile') {
      return location.pathname === '/profile' || location.pathname.startsWith('/profile/');
    }
    return location.pathname === path;
  };

  return (
    <div className={`
      ${isCollapsed ? 'w-20' : 'w-64'} 
      bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-50
      ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Logo Header */}
      <div className="p-6 border-b border-gray-100 relative">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Plane className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1">
              <h1 className="text-gray-900">FleetManager</h1>
              <p className="text-xs text-gray-500">Aviation Pro</p>
            </div>
          )}
          {/* Mobile Close Button */}
          {!isCollapsed && isMobileMenuOpen && (
            <button
              onClick={onMobileMenuClose}
              className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
        {/* Notification Badge */}
        {!isCollapsed && !isMobileMenuOpen && (
          <div className="absolute top-6 right-6">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white px-1">
                9+
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 pt-6">
        {!isCollapsed && (
          <p className="text-xs text-gray-500 mb-3 px-3">Main Menu</p>
        )}
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  onClick={onMobileMenuClose}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-all ${
                    active
                      ? 'bg-blue-50 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Toggle Button - Hidden on Mobile */}
      <div className="p-4 border-t border-gray-100 hidden lg:block">
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all mb-2`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </button>

        <button
          onClick={onToggle}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-all`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-[18px] h-[18px]" />
          ) : (
            <>
              <ChevronLeft className="w-[18px] h-[18px]" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
