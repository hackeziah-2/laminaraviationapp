import { Activity, Database, X } from "lucide-react";
import type { AuditLogSummary } from "../../services/audit-log.service";
import { Spinner } from "../ui/spinner";

const CARDS = [
  {
    label: "Total Records",
    key: "total" as const,
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Activity,
  },
  {
    label: "Creates",
    key: "creates" as const,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: Database,
  },
  {
    label: "Updates",
    key: "updates" as const,
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Activity,
  },
  {
    label: "Deletes",
    key: "deletes" as const,
    color: "text-red-600",
    bg: "bg-red-50",
    icon: X,
  },
];

export function AuditTrailSummaryCards({
  summary,
  loading,
}: {
  summary: AuditLogSummary;
  loading: boolean;
}) {
  if (loading) {
    return <Spinner className="py-10" />;
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map(({ label, key, color, bg, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}
          >
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{summary[key]}</p>
            <p className="text-xs font-medium text-gray-400">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
