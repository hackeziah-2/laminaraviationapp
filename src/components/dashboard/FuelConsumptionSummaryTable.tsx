import { Skeleton } from "../ui/skeleton";
import {
  formatReportNumber,
  fuelBurnLabel,
  fuelQuantityLabel,
  type AircraftFuelReportResponse,
  type FuelReportSummary,
  type MonthlyFuelRow,
} from "../../types/dashboardReport.types";

const TABLE_TITLE = "SUMMARY";
const CELL_BORDER = "border border-dotted border-gray-400";
const COL_HEADER_BG = "bg-[#B8D4E8]";

type FuelConsumptionSummaryTableProps = {
  data: AircraftFuelReportResponse | null;
  loading?: boolean;
  fuelUnit?: string;
};

type SummaryRow = {
  period: string;
  hours: number | null;
  fuel: number | null;
  burn: number | null;
  isTotal?: boolean;
};

function buildRows(monthly: MonthlyFuelRow[]): SummaryRow[] {
  return monthly.map((row) => ({
    period: row.monthLabel,
    hours: row.hours,
    fuel: row.fuelGal,
    burn: row.fuelBurnPerHour,
  }));
}

function totalRow(summary: FuelReportSummary): SummaryRow {
  return {
    period: "TOTAL",
    hours: summary.totalHours,
    fuel: summary.totalFuelGal,
    // Must use summary.avg_fuel_burn_per_hour (SUM fuel ÷ SUM hours)
    burn: summary.avgFuelBurnPerHour,
    isTotal: true,
  };
}

export function FuelConsumptionSummaryTable({
  data,
  loading = false,
  fuelUnit,
}: FuelConsumptionSummaryTableProps) {
  const unit = fuelUnit ?? data?.meta?.fuelUnit;
  const fuelLabel = fuelQuantityLabel(unit);
  const burnHeader = fuelBurnLabel(unit);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Skeleton className="mb-3 h-5 w-40 bg-gray-100" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const rows = buildRows(data.monthly ?? []);
  const total = totalRow(data.summary);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-3 sm:p-4">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-black text-white">
              <th
                colSpan={4}
                className={`${CELL_BORDER} px-3 py-2 text-center text-xs font-bold tracking-wide`}
              >
                {TABLE_TITLE}
              </th>
            </tr>
            <tr className={`${COL_HEADER_BG} text-gray-900`}>
              <th
                className={`${CELL_BORDER} px-3 py-2 text-center text-xs font-bold`}
              >
                Month
              </th>
              <th
                className={`${CELL_BORDER} px-3 py-2 text-center text-xs font-bold`}
              >
                ATL Hours
              </th>
              <th
                className={`${CELL_BORDER} px-3 py-2 text-center text-xs font-bold`}
              >
                {fuelLabel}
              </th>
              <th
                className={`${CELL_BORDER} px-3 py-2 text-center text-xs font-bold`}
              >
                {burnHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.period}-${idx}`}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td
                  className={`${CELL_BORDER} px-3 py-2 text-center font-medium text-gray-800`}
                >
                  {row.period}
                </td>
                <td
                  className={`${CELL_BORDER} px-3 py-2 text-right tabular-nums text-gray-800`}
                >
                  {formatReportNumber(row.hours)}
                </td>
                <td
                  className={`${CELL_BORDER} px-3 py-2 text-right tabular-nums text-gray-800`}
                >
                  {formatReportNumber(row.fuel)}
                </td>
                <td
                  className={`${CELL_BORDER} px-3 py-2 text-right tabular-nums text-gray-800`}
                >
                  {formatReportNumber(row.burn)}
                </td>
              </tr>
            ))}
            <tr className="bg-[#19E629]">
              <td
                className={`${CELL_BORDER} px-3 py-2.5 text-center text-sm font-bold text-gray-900`}
              >
                {total.period}
              </td>
              <td
                className={`${CELL_BORDER} px-3 py-2.5 text-right text-sm font-bold tabular-nums text-gray-900`}
              >
                {formatReportNumber(total.hours)}
              </td>
              <td
                className={`${CELL_BORDER} px-3 py-2.5 text-right text-sm font-bold tabular-nums text-gray-900`}
              >
                {formatReportNumber(total.fuel)}
              </td>
              <td
                className={`${CELL_BORDER} px-3 py-2.5 text-right text-sm font-bold tabular-nums text-gray-900`}
              >
                {formatReportNumber(total.burn)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
