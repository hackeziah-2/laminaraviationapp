import apiClient from "./index";

/** Dashboard stats (counts for overview cards). Backend: total_aircraft, total_aircraft_running, total_aircraft_ongoing_maintenance, total_aircraft_aog */
export interface DashboardStats {
  totalAircraft?: number | string;           // total_aircraft
  totalAircraftRunning?: number | string;    // total_aircraft_running (operational)
  totalAircraftOngoingMaintenance?: number | string;  // total_aircraft_ongoing_maintenance (in maintenance)
  totalAircraftAog?: number | string;         // total_aircraft_aog (AOG)
}

/** Single recent activity item */
export interface DashboardRecentActivity {
  aircraft?: string;
  registration?: string;
  status?: string;
  location?: string;
  time?: string;
}

/** Single maintenance alert */
export interface DashboardMaintenanceAlert {
  aircraft?: string;
  issue?: string;
  priority?: "high" | "medium" | "low";
}

/** Fleet performance metrics */
export interface DashboardFleetPerformance {
  flightHoursMtd?: number | string;
  flightHoursTrend?: string;
  utilizationRate?: number | string;
  utilizationTrend?: string;
  onTimeMaintenance?: number | string;
  onTimeMaintenanceTrend?: string;
}

/** Full dashboard API response (supports snake_case from backend). Stats may be at root or under stats. */
export interface DashboardResponse {
  stats?: DashboardStats;
  /** From backend total_aircraft */
  totalAircraft?: number | string;
  /** From backend total_aircraft_running */
  totalAircraftRunning?: number | string;
  /** From backend total_aircraft_ongoing_maintenance */
  totalAircraftOngoingMaintenance?: number | string;
  /** From backend total_aircraft_aog */
  totalAircraftAog?: number | string;
  recentActivities?: DashboardRecentActivity[];
  maintenanceAlerts?: DashboardMaintenanceAlert[];
  fleetPerformance?: DashboardFleetPerformance;
  [key: string]: unknown;
}

const DASHBOARD_PATH = "dashboard/";

/**
 * Recursively convert object keys to camelCase (for nested API responses).
 */
function deepToCamel(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepToCamel);
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = deepToCamel((obj as Record<string, unknown>)[key]);
  }
  return result;
}

/**
 * Fetch dashboard data from GET /api/v1/dashboard/
 */
export const getDashboard = async (): Promise<DashboardResponse> => {
  const response = await apiClient.get(DASHBOARD_PATH);
  const data = response.data ?? {};
  const normalized = deepToCamel(data) as DashboardResponse;
  return normalized;
};
