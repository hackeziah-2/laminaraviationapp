import { Skeleton } from "../ui/skeleton";
import {
  formatReportNumber,
  type AircraftFuelReportResponse,
  type PeriodTotals,
} from "../../types/dashboardReport.types";

type FuelConsumptionSummaryTableProps = {
  data: AircraftFuelReportResponse | null;
  loading?: boolean;
};

type SummaryRow = {
  period: string;
  hours: number | null;
  fuel: number | null;
  burn: number | null;
  isTotal?: boolean;
};

function buildRows(
  data: AircraftFuelReportResponse
): SummaryRow[] {
  const hoursSeries = data.series.find((item) => item.key === "flight_hours");
  const fuelSeries = data.series.find((item) => item.key === "fuel_gallons");
  const burnSeries = data.series.find(
    (item) => item.key === "fuel_burn_per_hour"
  );

  return data.categories.map((category, index) => ({
    period: category,
    hours: hoursSeries?.data[index] ?? null,
    fuel: fuelSeries?.data[index] ?? null,
    burn: burnSeries?.data[index] ?? null,
  }));
}

function totalRow(grandTotal: PeriodTotals): SummaryRow {
  return {
    period: "TOTAL",
    hours: grandTotal.totalFlightHours,
    fuel: grandTotal.totalFuelGallons,
    // Must use grand_total.fuel_burn_per_hour (SUM fuel ÷ SUM hours), not an average of period rates
    burn: grandTotal.fuelBurnPerHour,
    isTotal: true,
  };
}

export function FuelConsumptionSummaryTable({
  data,
  loading = false,
}: FuelConsumptionSummaryTableProps) {
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

  const rows = buildRows(data);
  const total = totalRow(data.grandTotal);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#061B50] text-white">
              <th className="border border-gray-300 px-3 py-2.5 text-center text-xs font-bold tracking-wide">
                Period
              </th>
              <th className="border border-gray-300 px-3 py-2.5 text-center text-xs font-bold tracking-wide">
                ATL Hours
              </th>
              <th className="border border-gray-300 px-3 py-2.5 text-center text-xs font-bold tracking-wide">
                Fuel (Gal)
              </th>
              <th className="border border-gray-300 px-3 py-2.5 text-center text-xs font-bold tracking-wide">
                Fuel Burn / Hour
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={`${row.period}-${idx}`}
                className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-800">
                  {row.period}
                </td>
                <td className="border border-gray-200 px-3 py-2 text-right tabular-nums text-gray-800">
                  {formatReportNumber(row.hours)}
                </td>
                <td className="border border-gray-200 px-3 py-2 text-right tabular-nums text-gray-800">
                  {formatReportNumber(row.fuel)}
                </td>
                <td className="border border-gray-200 px-3 py-2 text-right tabular-nums text-gray-800">
                  {formatReportNumber(row.burn)}
                </td>
              </tr>
            ))}
            <tr className="bg-[#19E629]">
              <td className="border border-gray-300 px-3 py-2.5 text-center text-sm font-bold text-gray-900">
                {total.period}
              </td>
              <td className="border border-gray-300 px-3 py-2.5 text-right text-sm font-bold tabular-nums text-gray-900">
                {formatReportNumber(total.hours)}
              </td>
              <td className="border border-gray-300 px-3 py-2.5 text-right text-sm font-bold tabular-nums text-gray-900">
                {formatReportNumber(total.fuel)}
              </td>
              <td className="border border-gray-300 px-3 py-2.5 text-right text-sm font-bold tabular-nums text-gray-900">
                {formatReportNumber(total.burn)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
