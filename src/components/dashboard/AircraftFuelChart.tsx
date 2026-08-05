import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "../ui/skeleton";
import {
  chartTitleForPeriod,
  formatReportNumber,
  type AircraftFuelReportResponse,
  type FuelReportPeriod,
} from "../../types/dashboardReport.types";

type AircraftFuelChartProps = {
  data: AircraftFuelReportResponse | null;
  period: FuelReportPeriod;
  loading?: boolean;
};

type ChartRow = {
  period: string;
  hours: number | null;
  fuel: number | null;
  burn: number | null;
};

const SERIES_META: Record<
  string,
  { label: string; color: string; unit: string }
> = {
  hours: { label: "Hours", color: "#55C2E8", unit: "hours" },
  fuel: { label: "Fuel (Gal)", color: "#AFAFAF", unit: "gallons" },
  burn: { label: "Fuel Burn / Hour", color: "#F0A078", unit: "gal/hour" },
};

function formatAxisTick(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return formatReportNumber(n);
}

/** LabelList formatter — ignore null/undefined so gaps stay unlabeled. */
function formatBarLabel(value: unknown): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return formatReportNumber(n);
}

function buildChartRows(data: AircraftFuelReportResponse): ChartRow[] {
  const hoursSeries = data.series.find((item) => item.key === "flight_hours");
  const fuelSeries = data.series.find((item) => item.key === "fuel_gallons");
  const burnSeries = data.series.find(
    (item) => item.key === "fuel_burn_per_hour"
  );

  return data.categories.map((category, index) => {
    const burn = burnSeries?.data[index];
    return {
      period: category,
      hours: hoursSeries?.data[index] ?? null,
      fuel: fuelSeries?.data[index] ?? null,
      // Keep null burn rates as null (chart gap), never coerce to 0
      burn: burn === undefined ? null : burn,
    };
  });
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number | null;
    color?: string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-gray-900">Period: {label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? "");
          const meta = SERIES_META[key];
          const seriesLabel = meta?.label ?? entry.name ?? key;
          const unit = meta?.unit ?? "";
          const raw = entry.value;
          return (
            <li key={key} className="flex items-center gap-2 text-gray-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? meta?.color }}
                aria-hidden
              />
              <span>
                {seriesLabel}:{" "}
                <span className="font-medium tabular-nums">
                  {raw == null ? "N/A" : formatReportNumber(Number(raw))}
                </span>
                {unit ? ` ${unit}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AircraftFuelChart({
  data,
  period,
  loading = false,
}: AircraftFuelChartProps) {
  const rows = useMemo(() => (data ? buildChartRows(data) : []), [data]);
  const title = chartTitleForPeriod(period);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Skeleton className="mb-4 h-5 w-64 bg-gray-100" />
        <Skeleton className="h-[350px] w-full rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 sm:text-base">
        {title}
      </h3>
      <div className="w-full min-h-[350px]" style={{ height: 380, width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={350}>
          <ComposedChart
            data={rows}
            margin={{ top: 28, right: 16, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={{ stroke: "#E5E7EB" }}
              tick={{ fill: "#6B7280", fontSize: 11 }}
              interval={0}
              angle={rows.length > 8 ? -30 : 0}
              textAnchor={rows.length > 8 ? "end" : "middle"}
              height={rows.length > 8 ? 56 : 36}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6B7280", fontSize: 11 }}
              tickFormatter={formatAxisTick}
              width={52}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6B7280", fontSize: 11 }}
              tickFormatter={formatAxisTick}
              width={52}
            />
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltipContent
                  active={active}
                  payload={payload as Array<{
                    dataKey?: string | number;
                    name?: string;
                    value?: number | null;
                    color?: string;
                  }>}
                  label={label != null ? String(label) : undefined}
                />
              )}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              wrapperStyle={{ paddingTop: 8 }}
            />
            <Bar
              yAxisId="left"
              dataKey="hours"
              name="Hours"
              fill="#55C2E8"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="hours"
                position="top"
                formatter={formatBarLabel}
                style={{ fill: "#374151", fontSize: 10 }}
              />
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="fuel"
              name="Fuel (Gal)"
              fill="#AFAFAF"
              radius={[3, 3, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="fuel"
                position="top"
                formatter={formatBarLabel}
                style={{ fill: "#374151", fontSize: 10 }}
              />
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="burn"
              name="Fuel Burn / Hour"
              stroke="#F0A078"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#F0A078", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="burn"
                position="top"
                formatter={formatBarLabel}
                style={{ fill: "#C2410C", fontSize: 10 }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
