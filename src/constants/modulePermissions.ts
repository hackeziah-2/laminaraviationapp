/**
 * Module permissions: maps module code (API/route) to UI label.
 * Used by Settings (Roles & Permissions) and by role-based access (Sidebar, routes).
 */
export const MODULE_PERMISSIONS_LIST: { code: string; label: string }[] = [
  { code: "dashboard", label: "Dashboard" },
  { code: "profile", label: "General Information" },
  { code: "operation", label: "Operation" },
  { code: "maintenance", label: "Maintenance" },
  { code: "logbook", label: "Logbook" },
  { code: "regulatory-compliance", label: "Regulatory Compliance" },
  { code: "daily-update", label: "Daily Update" },
  { code: "settings", label: "System Settings" },
];

/** Get label for a module code */
export function getModuleLabel(code: string): string | undefined {
  return MODULE_PERMISSIONS_LIST.find((m) => m.code === code)?.label;
}

/** Get code for a module label */
export function getModuleCode(label: string): string | undefined {
  return MODULE_PERMISSIONS_LIST.find(
    (m) => m.label.toLowerCase() === label.toLowerCase()
  )?.code;
}

/**
 * Map route path (or path pattern) to module code for permission check.
 * First match wins; use more specific paths first.
 */
const PATH_TO_MODULE: { pattern: RegExp | string; moduleCode: string }[] = [
  { pattern: "/dashboard/aircraft-fuel-report", moduleCode: "dashboard" },
  { pattern: "/dashboard", moduleCode: "dashboard" },
  { pattern: "/settings", moduleCode: "settings" },
  { pattern: "/daily-update", moduleCode: "daily-update" },
  { pattern: "/technical-logbook", moduleCode: "logbook" },
  { pattern: /^\/regulatory-compliance/, moduleCode: "regulatory-compliance" },
  { pattern: /^\/profile\/[^/]+\/operation/, moduleCode: "operation" },
  { pattern: /^\/profile\/[^/]+\/maintenance/, moduleCode: "maintenance" },
  { pattern: /^\/profile\/[^/]+\/logbook/, moduleCode: "logbook" },
  { pattern: "/profile", moduleCode: "profile" },
];

/**
 * Resolve the module code for a given path (for route protection).
 */
export function getModuleCodeForPath(pathname: string): string | null {
  const path = pathname.replace(/\/$/, "") || "/";
  for (const { pattern, moduleCode } of PATH_TO_MODULE) {
    if (typeof pattern === "string") {
      if (path === pattern || path.startsWith(pattern + "/")) return moduleCode;
    } else if (pattern.test(path)) {
      return moduleCode;
    }
  }
  return null;
}
