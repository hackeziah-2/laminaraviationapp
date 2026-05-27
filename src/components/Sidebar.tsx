import { useState, useEffect, useRef } from "react";
import {
  LayoutGrid,
  Plane,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Award,
  Settings,
  LogOut,
  Shield,
  FileWarning,
  BadgeCheck,
  Building2,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUserPermissions } from "../hooks/useUserPermissions";
import type { LucideIcon } from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onLogout?: () => void;
  isMobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

interface SidebarChildItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarMenuItem {
  id: string;
  moduleCode: string;
  label: string;
  icon: LucideIcon;
  path: string;
  children?: SidebarChildItem[];
}

/** Sidebar menu item id maps to module code for role-based access */
const MENU_ITEMS: SidebarMenuItem[] = [
  {
    id: "dashboard",
    moduleCode: "dashboard" as const,
    label: "Dashboard",
    icon: LayoutGrid,
    path: "/dashboard",
  },
  {
    id: "profile",
    moduleCode: "profile" as const,
    label: "Aircraft Fleet Profile",
    icon: Plane,
    path: "/profile",
  },
  {
    id: "daily-update",
    moduleCode: "daily-update" as const,
    label: "Aircraft Fleet Daily Update",
    icon: Calendar,
    path: "/daily-update",
  },
  {
    id: "technical-logbook",
    moduleCode: "logbook" as const,
    label: "Aircraft Technical Logbook",
    icon: FileText,
    path: "/technical-logbook",
  },
  {
    id: "regulatory-compliance",
    moduleCode: "regulatory-compliance" as const,
    label: "Regulatory Compliance",
    icon: Shield,
    path: "/regulatory-compliance",
    children: [
      {
        id: "advisory",
        label: "Advisory",
        icon: FileWarning,
        path: "/regulatory-compliance/advisory",
      },
      {
        id: "aircraft-statutory-certificates",
        label: "Aircraft Statutory Certificates",
        icon: Award,
        path: "/regulatory-compliance/aircraft-statutory-certificates",
      },
      {
        id: "organizational-approvals",
        label: "Organizational Approvals",
        icon: Building2,
        path: "/regulatory-compliance/organizational-approvals",
      },
      {
        id: "oem-technical-publication",
        label: "OEM Technical Publication",
        icon: BookOpen,
        path: "/regulatory-compliance/oem-technical-publication",
      },
      {
        id: "personnel-authorization",
        label: "Personnel Authorization",
        icon: UserCheck,
        path: "/regulatory-compliance/personnel-authorization",
      },
    ],
  },
  {
    id: "settings",
    moduleCode: "settings" as const,
    label: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

export function Sidebar({
  isCollapsed,
  onToggle,
  onLogout,
  isMobileMenuOpen = false,
  onMobileMenuClose,
}: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccess, user: meUser, loading: meLoading } = useUserPermissions();

  const headerDisplayName =
    meUser?.name?.trim() || meUser?.email?.trim() || (meLoading ? "…" : "User");
  const headerRole = meUser?.role?.trim() || (meLoading ? "…" : "—");
  const [regulatoryExpanded, setRegulatoryExpanded] = useState(false);
  const regulatoryCloseTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    return () => {
      if (regulatoryCloseTimeoutRef.current)
        clearTimeout(regulatoryCloseTimeoutRef.current);
    };
  }, []);

  const menuItems = MENU_ITEMS.filter((item) => canAccess(item.moduleCode));

  const goToMyProfile = () => {
    navigate("/my-profile");
    onMobileMenuClose?.();
  };

  const isActive = (path: string) => {
    if (path === "/profile") {
      return (
        location.pathname === "/profile" ||
        location.pathname.startsWith("/profile/")
      );
    }
    if (path === "/regulatory-compliance") {
      return location.pathname.startsWith("/regulatory-compliance");
    }
    return location.pathname === path;
  };

  return (
    <div
      className={`
      ${isCollapsed ? "w-20" : "w-64"} 
      bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-50
      ${
        isMobileMenuOpen
          ? "translate-x-0"
          : "-translate-x-full lg:translate-x-0"
      }
    `}
    >
      {/* Logo Header */}
      <div className="p-6 border-b border-gray-100 relative">
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "gap-3"
          }`}
        >
          <button
            type="button"
            onClick={goToMyProfile}
            className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Open profile settings"
            title="Profile settings"
          >
            <Plane className="w-5 h-5 text-white" />
          </button>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1
                className="text-gray-900 text-base font-semibold leading-tight truncate"
                title={headerDisplayName}
              >
                {headerDisplayName}
              </h1>
              <button
                type="button"
                onClick={goToMyProfile}
                className="mt-0.5 w-full truncate text-left text-xs font-medium text-blue-600 underline underline-offset-2 decoration-blue-600/80 transition-colors hover:text-blue-800 hover:decoration-blue-800 focus:outline-none focus:text-blue-800 focus:decoration-blue-800"
                title={`My Profile - ${headerRole}`}
              >
                My Profile
              </button>
              {headerRole}
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
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 pt-6 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-xs text-gray-500 mb-3 px-3">Main Menu</p>
        )}
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasChildren =
              "children" in item && item.children && item.children.length > 0;
            const active = isActive(item.path);
            const isExpanded =
              hasChildren &&
              (item.id === "regulatory-compliance"
                ? regulatoryExpanded
                : false);

            if (hasChildren && item.id === "regulatory-compliance") {
              return (
                <li key={item.id}>
                  {isCollapsed ? (
                    <Link
                      to="/regulatory-compliance"
                      onClick={onMobileMenuClose}
                      className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg transition-all ${
                        active
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      title={item.label}
                    >
                      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                    </Link>
                  ) : (
                    <div
                      className="w-full"
                      onMouseEnter={() => {
                        if (regulatoryCloseTimeoutRef.current) {
                          clearTimeout(regulatoryCloseTimeoutRef.current);
                          regulatoryCloseTimeoutRef.current = null;
                        }
                        setRegulatoryExpanded(true);
                      }}
                      onMouseLeave={() => {
                        regulatoryCloseTimeoutRef.current = setTimeout(() => {
                          setRegulatoryExpanded(false);
                          regulatoryCloseTimeoutRef.current = null;
                        }, 150);
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setRegulatoryExpanded((prev) => !prev);
                        }}
                        aria-expanded={isExpanded}
                        aria-label={`${item.label}, submenu ${
                          isExpanded ? "visible" : "hidden"
                        }`}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 cursor-pointer ${
                          active ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <Icon
                          className={`w-[18px] h-[18px] flex-shrink-0 ${
                            active ? "text-blue-600" : "currentColor"
                          }`}
                        />
                        <span
                          className={`flex-1 min-w-0 text-sm font-medium whitespace-nowrap truncate text-left ${
                            active ? "text-blue-600" : "text-gray-700"
                          }`}
                        >
                          {item.label}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 flex-shrink-0 ${
                            active ? "text-blue-600" : "text-gray-500"
                          }`}
                          style={{
                            transition: "transform 0.2s ease",
                            transform: isExpanded
                              ? "rotate(0deg)"
                              : "rotate(-90deg)",
                          }}
                          aria-hidden
                        />
                      </button>
                      <div
                        style={{
                          overflow: "hidden",
                          transition:
                            "max-height 0.3s ease-in-out, opacity 0.3s ease-in-out",
                          maxHeight: isExpanded ? "500px" : "0px",
                          opacity: isExpanded ? 1 : 0,
                          marginTop: isExpanded ? "4px" : "0px",
                        }}
                        aria-hidden={!isExpanded}
                      >
                        {item.children && (
                          <ul className="ml-4 mt-1 pt-0.5 space-y-0.5 border-l border-gray-200 pl-3 pb-1">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon;
                              const childActive =
                                location.pathname === child.path;
                              return (
                                <li key={child.id}>
                                  <Link
                                    to={child.path}
                                    onClick={onMobileMenuClose}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-sm transition-colors duration-200 ${
                                      childActive
                                        ? "text-blue-600 font-medium bg-blue-50"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                  >
                                    <ChildIcon
                                      className={`w-4 h-4 flex-shrink-0 ${
                                        childActive
                                          ? "text-blue-600"
                                          : "text-gray-500"
                                      }`}
                                    />
                                    <span className="whitespace-nowrap truncate">
                                      {child.label}
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            }

            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  onClick={onMobileMenuClose}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center" : "gap-3"
                  } px-3 py-2.5 rounded-lg transition-all ${
                    active
                      ? "bg-blue-50 text-gray-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
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
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center" : "gap-3"
          } px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all mb-2`}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </button>

        <button
          onClick={onToggle}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center" : "gap-3"
          } px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-all`}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
