import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Droplets,
  Fuel,
  Gauge,
  PlaneLanding,
} from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import {
  cleanFlagMessage,
  formatReportInteger,
  formatReportNumber,
  type DataQualityFlag,
  type FuelReportSummary,
} from "../../types/dashboardReport.types";
import { DataQualityFlagsModal } from "./DataQualityFlagsModal";

type DashboardSummaryCardsProps = {
  summary: FuelReportSummary | null;
  dataQualityFlags?: DataQualityFlag[];
  loading?: boolean;
  errorMessage?: string | null;
  filterKey?: string;
};

type KpiDef = {
  id: string;
  label: string;
  value: string;
  icon: typeof Clock;
  iconWrap: string;
  iconColor: string;
  valueClass?: string;
};

const PREVIEW_LIMIT = 5;

function formatFlagLine(flag: DataQualityFlag): string {
  const parts = [
    cleanFlagMessage(flag.message || flag.code),
    flag.aircraftTail ? `(${flag.aircraftTail})` : null,
    flag.sequenceNo ? `seq ${flag.sequenceNo}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

export function DashboardSummaryCards({
  summary,
  dataQualityFlags = [],
  loading = false,
  errorMessage = null,
  filterKey = "",
}: DashboardSummaryCardsProps) {
  const [viewAllOpen, setViewAllOpen] = useState(false);

  const flagCount = dataQualityFlags.length;
  const previewFlags = useMemo(
    () => dataQualityFlags.slice(0, PREVIEW_LIMIT),
    [dataQualityFlags]
  );
  const remainingCount = Math.max(0, flagCount - PREVIEW_LIMIT);

  const cards: KpiDef[] = [
    {
      id: "hours",
      label: "Total ATL Hours",
      value: formatReportNumber(summary?.totalHours),
      icon: Clock,
      iconWrap: "bg-sky-50",
      iconColor: "text-sky-600",
    },
    {
      id: "fuel",
      label: "Total Fuel Used",
      value: formatReportNumber(summary?.totalFuelGal),
      icon: Fuel,
      iconWrap: "bg-slate-50",
      iconColor: "text-slate-600",
    },
    {
      id: "burn",
      label: "Avg Fuel Burn / Hour",
      value: formatReportNumber(summary?.avgFuelBurnPerHour),
      icon: Gauge,
      iconWrap: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      id: "oil",
      label: "Total Oil Usage",
      value: formatReportNumber(summary?.totalOilUsageQrts),
      icon: Droplets,
      iconWrap: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      id: "landings",
      label: "Total Landings",
      value: formatReportInteger(summary?.totalLandings),
      icon: PlaneLanding,
      iconWrap: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <>
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <Skeleton className="mb-3 h-10 w-10 rounded-xl bg-gray-100" />
              <Skeleton className="mb-2 h-7 w-20 bg-gray-100" />
              <Skeleton className="h-3 w-28 bg-gray-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="flex min-w-0 items-start gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconWrap}`}
                >
                  <Icon className={`h-5 w-5 ${card.iconColor}`} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-xl font-bold tabular-nums text-gray-900 sm:text-2xl ${
                      card.valueClass ?? ""
                    }`}
                  >
                    {card.value}
                  </p>
                  <p className="mt-0.5 text-xs font-medium leading-snug text-gray-500">
                    {card.label}
                  </p>
                </div>
              </div>
            );
          })}

          <div
            className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-sm ${
              flagCount > 0
                ? "border-amber-300 ring-1 ring-amber-100"
                : "border-gray-200"
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  flagCount > 0 ? "bg-amber-50" : "bg-gray-50"
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${
                    flagCount > 0 ? "text-amber-600" : "text-gray-500"
                  }`}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xl font-bold tabular-nums sm:text-2xl ${
                    flagCount > 0 ? "text-amber-700" : "text-gray-900"
                  }`}
                >
                  {formatReportInteger(flagCount)}
                </p>
                <p className="mt-0.5 text-xs font-medium leading-snug text-gray-500">
                  Data Quality Flags
                </p>
              </div>
            </div>

            {flagCount > 0 ? (
              <div className="mt-3 min-w-0 flex-1">
                <ul
                  className="max-h-[7.5rem] space-y-1.5 overflow-y-auto overscroll-contain pr-1"
                  aria-label="Data quality flag preview"
                >
                  {previewFlags.map((flag, idx) => (
                    <li
                      key={`${flag.code}-${flag.sequenceNo ?? idx}-${idx}`}
                      className="min-w-0 rounded-md bg-amber-50/80 px-2 py-1.5 text-[11px] leading-snug text-amber-900"
                      style={{
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                        wordBreak: "break-word",
                      }}
                    >
                      {formatFlagLine(flag)}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
                  {remainingCount > 0 ? (
                    <span className="text-[11px] font-medium text-amber-700">
                      +{remainingCount.toLocaleString("en-US")} more
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setViewAllOpen(true);
                    }}
                    className="relative z-10 shrink-0 rounded-md border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    View All
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-snug text-gray-400">
                No data-quality warnings for this range.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Always mounted so View All can open even across loading transitions */}
      <DataQualityFlagsModal
        open={viewAllOpen}
        onOpenChange={setViewAllOpen}
        flags={dataQualityFlags}
        loading={loading}
        errorMessage={errorMessage}
        filterKey={filterKey}
      />
    </>
  );
}
