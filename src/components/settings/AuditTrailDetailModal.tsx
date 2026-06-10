import type { ComponentType } from "react";
import { useEffect } from "react";
import {
  Activity,
  ArrowRight,
  Clock,
  Database,
  User,
  X,
} from "lucide-react";
import { useAuditLogDetail } from "../../hooks/useAuditLogs";
import { Spinner } from "../ui/spinner";
import { AuditTrailActionBadge } from "./AuditTrailActionBadge";
import {
  formatAuditDateTime,
  formatAuditDateTimeUtc,
  formatAuditFieldValue,
  formatModuleLabel,
} from "./auditTrailUtils";

interface AuditTrailDetailModalProps {
  auditLogId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-blue-500" />
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function DateTimeInfoCard({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  const readable = formatAuditDateTime(value);
  const utc = formatAuditDateTimeUtc(value);

  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5">
        <Clock className="h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-xs font-medium text-gray-400">{label}</p>
      </div>
      <p className="text-sm font-semibold text-gray-900">{readable}</p>
      {readable !== "—" && utc !== "—" && (
        <p className="mt-0.5 font-mono text-xs text-gray-500">{utc}</p>
      )}
    </div>
  );
}

function DiffRow({
  field,
  oldVal,
  newVal,
}: {
  field: string;
  oldVal: unknown;
  newVal: unknown;
}) {
  const hasOld =
    oldVal !== undefined && oldVal !== null && String(oldVal) !== "";
  const hasNew =
    newVal !== undefined && newVal !== null && String(newVal) !== "";
  const oldDisplay = hasOld ? formatAuditFieldValue(field, oldVal) : "—";
  const newDisplay = hasNew ? formatAuditFieldValue(field, newVal) : "—";

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="w-36 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {field.replace(/_/g, " ")}
      </td>
      <td className="rounded-l bg-red-50 px-3 py-2.5 font-mono text-sm text-red-600">
        {hasOld ? (
          oldDisplay
        ) : (
          <span className="italic text-gray-300">—</span>
        )}
      </td>
      <td className="px-2 py-2.5 text-center">
        <ArrowRight className="inline-block h-3.5 w-3.5 text-gray-400" />
      </td>
      <td className="rounded-r bg-emerald-50 px-3 py-2.5 font-mono text-sm text-emerald-700">
        {hasNew ? (
          newDisplay
        ) : (
          <span className="italic text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}

export function AuditTrailDetailModal({
  auditLogId,
  open,
  onOpenChange,
}: AuditTrailDetailModalProps) {
  const { data, isLoading, isError, refetch } = useAuditLogDetail(
    open ? auditLogId : null
  );

  const close = () => onOpenChange(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  const oldData = data?.oldData ?? {};
  const newData = data?.newData ?? {};
  const changedFields = data?.changedFields ?? [];
  const allFields = Array.from(
    new Set([...Object.keys(oldData), ...Object.keys(newData)])
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={close}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-trail-detail-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            {!isLoading && data ? (
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                  #{data.id}
                </span>
                <AuditTrailActionBadge action={data.action} />
              </div>
            ) : null}
            <h2
              id="audit-trail-detail-title"
              className="mt-1 text-lg font-bold text-gray-900"
            >
              Audit Trail Detail
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl p-2 transition-colors hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <Spinner className="py-16" label="Loading audit log…" />
          ) : isError || !data ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-600">Failed to load audit log.</p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="mt-4 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard
                  icon={Database}
                  label="Module"
                  value={formatModuleLabel(data.moduleName)}
                />
                <InfoCard icon={Database} label="Table" value={data.tableName} />
                <InfoCard
                  icon={Activity}
                  label="Record ID"
                  value={`#${data.recordId}`}
                />
                <InfoCard
                  icon={User}
                  label="User"
                  value={data.performedByName ?? "—"}
                />
                <DateTimeInfoCard label="Created At" value={data.createdAt} />
                <DateTimeInfoCard label="Updated At" value={data.updatedAt} />
                <InfoCard
                  icon={Activity}
                  label="IP Address"
                  value={data.ipAddress ?? "—"}
                />
                <InfoCard icon={Activity} label="Action" value={data.action} />
              </div>

              {changedFields.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Changed Fields
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {changedFields.map((field) => (
                      <span
                        key={field}
                        className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                      >
                        {field.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {allFields.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Data Changes
                  </p>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <div className="grid grid-cols-[144px_1fr_24px_1fr] border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      <div className="px-3 py-2">Field</div>
                      <div className="px-3 py-2 text-red-500">Before</div>
                      <div />
                      <div className="px-3 py-2 text-emerald-600">After</div>
                    </div>
                    <table className="w-full">
                      <tbody>
                        {allFields.map((field) => (
                          <DiffRow
                            key={field}
                            field={field}
                            oldVal={oldData[field]}
                            newVal={newData[field]}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={close}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
