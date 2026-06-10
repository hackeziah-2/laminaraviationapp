import { useQuery } from "@tanstack/react-query";
import {
  getAuditLogDetail,
  getAuditLogFilterOptions,
  getAuditLogs,
  type AuditLogQueryParams,
} from "../services/audit-log.service";

export const auditLogQueryKeys = {
  all: ["audit-logs"] as const,
  list: (params: AuditLogQueryParams) =>
    [...auditLogQueryKeys.all, "list", params] as const,
  detail: (id: number | null) =>
    [...auditLogQueryKeys.all, "detail", id] as const,
  filterOptions: () => [...auditLogQueryKeys.all, "filter-options"] as const,
};

export function useAuditLogs(params: AuditLogQueryParams) {
  return useQuery({
    queryKey: auditLogQueryKeys.list(params),
    queryFn: () => getAuditLogs(params),
    placeholderData: (previous) => previous,
  });
}

export function useAuditLogDetail(id: number | null) {
  return useQuery({
    queryKey: auditLogQueryKeys.detail(id),
    queryFn: () => getAuditLogDetail(id!),
    enabled: id != null && id > 0,
  });
}

export function useAuditLogFilterOptions() {
  return useQuery({
    queryKey: auditLogQueryKeys.filterOptions(),
    queryFn: getAuditLogFilterOptions,
    staleTime: 5 * 60 * 1000,
  });
}
