import { Clock, Eye, User as UserIcon } from "lucide-react";
import type { AuditLog } from "../../services/audit-log.service";
import { AuditTrailActionBadge } from "./AuditTrailActionBadge";
import {
  formatAuditDate,
  formatAuditTime,
  formatModuleLabel,
  renderChangedFieldsSummary,
} from "./auditTrailUtils";

interface AuditTrailTableProps {
  items: AuditLog[];
  onView: (id: number) => void;
}

export function AuditTrailTable({ items, onView }: AuditTrailTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              ID
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Date &amp; Time
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Module
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Action
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              User
            </th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Changes
            </th>
            <th className="px-5 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
              View
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="px-5 py-16 text-center text-sm text-gray-400"
              >
                No audit records match the current filters.
              </td>
            </tr>
          ) : (
            items.map((row) => {
              const { visible, extra } = renderChangedFieldsSummary(
                row.changedFields
              );
              return (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-blue-50/40"
                >
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-gray-400">
                      #{row.id}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatAuditDate(row.createdAt)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {formatAuditTime(row.createdAt)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-semibold text-gray-800">
                        {formatModuleLabel(row.moduleName)}
                      </span>
                    </div>
                    <p className="mt-0.5 pl-4 text-xs text-gray-400">
                      {row.tableName}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <AuditTrailActionBadge action={row.action} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100">
                        <UserIcon className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {row.performedByName ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {visible.length > 0 ? (
                      <div className="flex max-w-[200px] flex-wrap gap-1">
                        {visible.map((field) => (
                          <span
                            key={field}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                          >
                            {field.replace(/_/g, " ")}
                          </span>
                        ))}
                        {extra > 0 && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            +{extra} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs italic text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => onView(row.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
