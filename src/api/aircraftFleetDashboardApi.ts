import apiClient from "./index";
import { toCamelDeep } from "../utility/utils";

/** GET /api/v1/reports/aircraft-fleet-dashboard */
export const AIRCRAFT_FLEET_DASHBOARD_PATH = "reports/aircraft-fleet-dashboard";

/** Matches the report default: one page is 20 aircraft, not magneto rows. */
export const AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE = 20;

export interface AircraftFleetDashboardComponent {
  magneto: string | null;
  dueForReplacementTach: string | null;
  remainingHours: string | null;
  partNumber: string | null;
  serialNumber: string | null;
}

export interface AircraftFleetDashboardItem {
  aircraftIdent: string;
  status: string | null;
  eodTach: string | null;
  components: AircraftFleetDashboardComponent[];
}

export interface AircraftFleetDashboardResponse {
  items: AircraftFleetDashboardItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface AircraftFleetDashboardQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Daily Fleet Update status. Omit or "all" to skip the filter. */
  status?: string;
}

function textOrNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

function nonNegativeInt(value: unknown, fallback: number): number {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function normalizeAircraftFleetDashboard(
  payload: unknown
): AircraftFleetDashboardResponse {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const body =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const camel = toCamelDeep(body) as Record<string, unknown>;
  const rawItems = Array.isArray(camel.items) ? camel.items : [];
  const items: AircraftFleetDashboardItem[] = rawItems.map((item) => {
    const row =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const componentsRaw = Array.isArray(row.components) ? row.components : [];
    return {
      aircraftIdent: String(row.aircraftIdent ?? "").trim(),
      status: textOrNull(row.status),
      eodTach: textOrNull(row.eodTach),
      components: componentsRaw.map((component) => {
        const record =
          component && typeof component === "object"
            ? (component as Record<string, unknown>)
            : {};
        return {
          magneto: textOrNull(record.magneto),
          dueForReplacementTach: textOrNull(record.dueForReplacementTach),
          remainingHours: textOrNull(record.remainingHours),
          partNumber: textOrNull(record.partNumber),
          serialNumber: textOrNull(record.serialNumber),
        };
      }),
    };
  });

  return {
    items,
    total: nonNegativeInt(camel.total, items.length),
    page: positiveInt(camel.page, 1),
    pageSize: positiveInt(camel.pageSize, AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE),
    pages: nonNegativeInt(camel.pages, 0),
  };
}

/**
 * GET /api/v1/reports/aircraft-fleet-dashboard
 * One item per registered aircraft, with Daily Fleet Update and magneto components.
 */
export async function getAircraftFleetDashboard(
  query: AircraftFleetDashboardQuery = {}
): Promise<AircraftFleetDashboardResponse> {
  const params: Record<string, string | number> = {
    page: positiveInt(query.page, 1),
    page_size: positiveInt(query.pageSize, AIRCRAFT_FLEET_DASHBOARD_PAGE_SIZE),
  };
  const search = query.search?.trim();
  if (search) params.search = search;
  const status = query.status?.trim();
  if (status && status.toLowerCase() !== "all") params.status = status;

  const response = await apiClient.get(AIRCRAFT_FLEET_DASHBOARD_PATH, {
    params,
  });
  return normalizeAircraftFleetDashboard(response.data);
}
