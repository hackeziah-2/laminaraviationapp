import type { AuditActionType } from "../../services/audit-log.service";

export const AUDIT_ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "CREATE", label: "CREATE" },
  { value: "UPDATE", label: "UPDATE" },
  { value: "DELETE", label: "DELETE" },
  { value: "RESTORE", label: "RESTORE" },
  { value: "LOGIN", label: "LOGIN" },
  { value: "LOGOUT", label: "LOGOUT" },
  { value: "BULK_UPDATE", label: "BULK_UPDATE" },
] as const;

export function formatModuleLabel(moduleName: string): string {
  return moduleName
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatFieldLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAuditDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatAuditTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Readable local date-time, e.g. Jun 9, 2026, 04:14:22 PM */
export function formatAuditDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/** UTC date-time, e.g. 2026-06-09 08:14:22 UTC */
export function formatAuditDateTimeUtc(
  value: string | null | undefined
): string {
  if (!value?.trim()) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}

const DATE_FIELD_PATTERN =
  /(^created_at$|^updated_at$|_at$|_date$|timestamp$|expiry|effective)/i;
const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(T|\s|\b)/;

function looksLikeDateField(field: string, value: unknown): boolean {
  if (DATE_FIELD_PATTERN.test(field)) return true;
  if (typeof value === "string" && ISO_DATE_PATTERN.test(value.trim())) {
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
  }
  return false;
}

export function formatAuditFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || String(value) === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (looksLikeDateField(field, value)) {
    const formatted = formatAuditDateTime(String(value));
    if (formatted !== "—") return formatted;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function getActionBadgeClass(action: string): string {
  switch (action as AuditActionType) {
    case "CREATE":
      return "bg-emerald-50 text-emerald-700";
    case "UPDATE":
      return "bg-blue-50 text-blue-700";
    case "DELETE":
      return "bg-red-50 text-red-700";
    case "RESTORE":
      return "bg-purple-50 text-purple-700";
    case "LOGIN":
      return "bg-orange-50 text-orange-700";
    case "LOGOUT":
      return "bg-gray-100 text-gray-600";
    case "BULK_UPDATE":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function getActionDotClass(action: string): string {
  switch (action as AuditActionType) {
    case "CREATE":
      return "bg-emerald-500";
    case "UPDATE":
      return "bg-blue-500";
    case "DELETE":
      return "bg-red-500";
    case "RESTORE":
      return "bg-purple-500";
    case "LOGIN":
      return "bg-orange-500";
    case "LOGOUT":
      return "bg-gray-400";
    case "BULK_UPDATE":
      return "bg-indigo-500";
    default:
      return "bg-gray-400";
  }
}

export interface ChangeRow {
  field: string;
  before?: unknown;
  after?: unknown;
}

export function buildChangeRows(
  action: string,
  changedFields: string[] | null,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): ChangeRow[] {
  const actionUpper = action.toUpperCase();

  if (actionUpper === "CREATE" && newData) {
    const fields = changedFields?.length
      ? changedFields
      : Object.keys(newData);
    return fields.map((field) => ({
      field,
      after: newData[field],
    }));
  }

  if (actionUpper === "DELETE" && oldData) {
    const fields = changedFields?.length
      ? changedFields
      : Object.keys(oldData);
    return fields.map((field) => ({
      field,
      before: oldData[field],
    }));
  }

  const fields = changedFields?.length
    ? changedFields
    : [
        ...new Set([
          ...Object.keys(oldData ?? {}),
          ...Object.keys(newData ?? {}),
        ]),
      ];

  return fields.map((field) => ({
    field,
    before: oldData?.[field],
    after: newData?.[field],
  }));
}

export function renderChangedFieldsSummary(
  fields: string[] | null | undefined,
  maxVisible = 2
): { visible: string[]; extra: number } {
  const list = fields ?? [];
  if (list.length <= maxVisible) {
    return { visible: list, extra: 0 };
  }
  return {
    visible: list.slice(0, maxVisible),
    extra: list.length - maxVisible,
  };
}
