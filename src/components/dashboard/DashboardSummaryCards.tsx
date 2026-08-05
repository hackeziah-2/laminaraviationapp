import {
  AlertTriangle,
  Clock,
  Database,
  Droplets,
  Fuel,
  Gauge,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { Skeleton } from "../ui/skeleton";
import {
  formatReportInteger,
  formatReportNumber,
  type PeriodTotals,
} from "../../types/dashboardReport.types";

type DashboardSummaryCardsProps = {
  grandTotal: PeriodTotals | null;
  loading?: boolean;
};

type KpiDef = {
  id: string;
  label: string;
  value: string;
  icon: typeof Clock;
  iconWrap: string;
  iconColor: string;
  valueClass?: string;
  tooltip?: string;
  warn?: boolean;
};

export function DashboardSummaryCards({
  grandTotal,
  loading = false,
}: DashboardSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
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
    );
  }

  const dataIssues =
    (grandTotal?.incompleteRecordCount ?? 0) +
    (grandTotal?.invalidRecordCount ?? 0);

  const cards: KpiDef[] = [
    {
      id: "hours",
      label: "Total ATL Hours",
      value: formatReportNumber(grandTotal?.totalFlightHours),
      icon: Clock,
      iconWrap: "bg-sky-50",
      iconColor: "text-sky-600",
    },
    {
      id: "fuel",
      label: "Total Fuel Used",
      value: formatReportNumber(grandTotal?.totalFuelGallons),
      icon: Fuel,
      iconWrap: "bg-slate-50",
      iconColor: "text-slate-600",
    },
    {
      id: "burn",
      label: "Average Fuel Burn / Hour",
      value: formatReportNumber(grandTotal?.fuelBurnPerHour),
      icon: Gauge,
      iconWrap: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      id: "oil",
      label: "Total Oil Usage",
      value: formatReportNumber(grandTotal?.totalOilQuarts),
      icon: Droplets,
      iconWrap: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      id: "atl",
      label: "ATL Record Count",
      value: formatReportInteger(grandTotal?.atlRecordCount),
      icon: Database,
      iconWrap: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      id: "issues",
      label: "Data Issues",
      value: formatReportInteger(dataIssues),
      icon: AlertTriangle,
      iconWrap: dataIssues > 0 ? "bg-amber-50" : "bg-gray-50",
      iconColor: dataIssues > 0 ? "text-amber-600" : "text-gray-500",
      valueClass: dataIssues > 0 ? "text-amber-700" : undefined,
      warn: dataIssues > 0,
      tooltip:
        "Some ATL records were excluded because of missing or invalid information.",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const content = (
          <div
            className={`flex h-full items-start gap-3 rounded-xl border bg-white p-4 shadow-sm ${
              card.warn
                ? "border-amber-300 ring-1 ring-amber-100"
                : "border-gray-200"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconWrap}`}
            >
              <Icon className={`h-5 w-5 ${card.iconColor}`} aria-hidden />
            </div>
            <div className="min-w-0">
              <p
                className={`text-xl font-bold tabular-nums text-gray-900 sm:text-2xl ${
                  card.valueClass ?? ""
                }`}
              >
                {card.value}
              </p>
              <p className="mt-0.5 text-xs font-medium leading-snug text-gray-500">
                {card.label}
                {card.tooltip ? (
                  <span className="sr-only">. {card.tooltip}</span>
                ) : null}
              </p>
            </div>
          </div>
        );

        if (!card.tooltip) {
          return <div key={card.id}>{content}</div>;
        }

        return (
          <Tooltip key={card.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="w-full rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {content}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {card.tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
