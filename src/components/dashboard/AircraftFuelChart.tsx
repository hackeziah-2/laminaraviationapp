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
  CHART_TITLE,
  flagsByMonth,
  formatBarWholeNumber,
  formatBurnLabel,
  formatReportNumber,
  fuelBurnLabel,
  fuelQuantityLabel,
  type AircraftFuelReportResponse,
  type DataQualityFlag,
  type MonthlyFuelRow,
} from "../../types/dashboardReport.types";

type AircraftFuelChartProps = {
  data: AircraftFuelReportResponse | null;
  loading?: boolean;
  fuelUnit?: string;
};

type ChartRow = {
  month: string;
  monthLabel: string;
  hours: number;
  fuel: number;
  burn: number | null;
  landings: number;
  oil: number;
  flags: DataQualityFlag[];
};

const HOURS_COLOR = "#55C2E8";
const FUEL_COLOR = "#AFAFAF";
const BURN_COLOR = "#F0A078";

function seriesMeta(fuelUnit: string | undefined) {
  const fuelLabel = fuelQuantityLabel(fuelUnit);
  const burnLabel = fuelBurnLabel(fuelUnit);
  return {
    hours: { label: "Hours", color: HOURS_COLOR, unit: "hours" },
    fuel: {
      label: fuelLabel,
      color: FUEL_COLOR,
      unit: fuelUnit || "gallons",
    },
    burn: { label: burnLabel, color: BURN_COLOR, unit: burnLabel },
  } as const;
}

function formatAxisTick(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return formatReportNumber(n);
}

function formatBarLabel(value: unknown): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return formatBarWholeNumber(n);
}

function formatLineLabel(value: unknown): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return formatBurnLabel(n);
}

function buildChartRows(data: AircraftFuelReportResponse): ChartRow[] {
  const byMonth = flagsByMonth(data.dataQualityFlags);
  return (data.monthly ?? []).map((row: MonthlyFuelRow) => ({
    month: row.month,
    monthLabel: row.monthLabel,
    hours: Number(row.hours) || 0,
    fuel: Number(row.fuelGal) || 0,
    // Keep null burn as null (chart gap) — never coerce to 0
    burn:
      row.fuelBurnPerHour == null || !Number.isFinite(Number(row.fuelBurnPerHour))
        ? null
        : Number(row.fuelBurnPerHour),
    landings: Number(row.landings) || 0,
    oil: Number(row.oilUsageQrts) || 0,
    flags: byMonth.get(row.month) ?? [],
  }));
}

/** Left axis: 0 → max(hours, fuel) with headroom for labels. */
function leftAxisDomain(rows: ChartRow[]): [number, number] {
  let max = 0;
  for (const row of rows) {
    max = Math.max(max, row.hours, row.fuel);
  }
  if (max <= 0) return [0, 1];
  return [0, max * 1.18];
}

/** Right axis: tight around burn range — do NOT start at 0. */
function rightAxisDomain(rows: ChartRow[]): [number, number] | ["auto", "auto"] {
  const burns = rows
    .map((r) => r.burn)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (burns.length === 0) return ["auto", "auto"];
  const min = Math.min(...burns);
  const max = Math.max(...burns);
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.08, 0.25);
    return [min - pad, max + pad];
  }
  const span = max - min;
  const pad = Math.max(span * 0.2, 0.1);
  return [min - pad, max + pad];
}

function ChartTooltipContent({
  active,
  payload,
  label,
  fuelUnit,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    name?: string;
    value?: number | null;
    color?: string;
    payload?: ChartRow;
  }>;
  label?: string;
  fuelUnit?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const seen = new Set<string>();
  const metaByKey = seriesMeta(fuelUnit);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-gray-900">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? "");
          if (seen.has(key)) return null;
          seen.add(key);
          const meta = metaByKey[key as keyof typeof metaByKey];
          const seriesLabel = meta?.label ?? entry.name ?? key;
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
                  {raw == null ? "N/A" : formatReportNumber(Number(raw), 4)}
                </span>
              </span>
            </li>
          );
        })}
        {row != null && (
          <>
            <li className="text-gray-700">
              Landings:{" "}
              <span className="font-medium tabular-nums">
                {formatReportNumber(row.landings, 0)}
              </span>
            </li>
            <li className="text-gray-700">
              Oil usage:{" "}
              <span className="font-medium tabular-nums">
                {formatReportNumber(row.oil)} qrts
              </span>
            </li>
          </>
        )}
        {row?.flags?.length ? (
          <li className="mt-1 border-t border-amber-100 pt-1 text-amber-800">
            <span className="font-semibold">Data quality:</span>
            <ul className="mt-0.5 list-disc pl-4">
              {row.flags.map((f, i) => (
                <li key={`${f.code}-${i}`}>
                  {f.message || f.code}
                  {f.aircraftTail ? ` (${f.aircraftTail})` : ""}
                </li>
              ))}
            </ul>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Warning icon above a month that has data_quality_flags — data stays visible. */
function QualityFlagMarker(props: {
  x?: number;
  y?: number;
  width?: number;
  index?: number;
  payload?: ChartRow;
}) {
  const { x = 0, y = 0, width = 0, payload } = props;
  if (!payload?.flags?.length) return null;
  const cx = x + width / 2;
  const reason = payload.flags.map((f) => f.message || f.code).join("; ");
  return (
    <g
      transform={`translate(${cx - 7}, ${y - 36})`}
      style={{ pointerEvents: "all" }}
    >
      <title>{reason}</title>
      <path
        d="M7 1.5 L13 12.5 H1 Z"
        fill="#FEF3C7"
        stroke="#F59E0B"
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
      <rect x={6.25} y={5} width={1.5} height={4} rx={0.5} fill="#D97706" />
      <circle cx={7} cy={11} r={0.85} fill="#D97706" />
    </g>
  );
}

export function AircraftFuelChart({
  data,
  loading = false,
  fuelUnit,
}: AircraftFuelChartProps) {
  const unit = fuelUnit ?? data?.meta?.fuelUnit;
  const fuelLabel = fuelQuantityLabel(unit);
  const burnSeriesLabel = fuelBurnLabel(unit);
  const rows = useMemo(() => (data ? buildChartRows(data) : []), [data]);
  const leftDomain = useMemo(() => leftAxisDomain(rows), [rows]);
  const rightDomain = useMemo(() => rightAxisDomain(rows), [rows]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Skeleton className="mx-auto mb-4 h-5 w-72 bg-gray-100" />
        <div className="relative h-[380px] w-full overflow-hidden rounded-lg bg-gray-50">
          <Skeleton className="absolute inset-x-8 bottom-12 top-8 rounded-md bg-gray-100" />
          <div className="absolute inset-x-10 bottom-16 flex h-40 items-end justify-between gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full rounded-t bg-gray-200/80"
                style={{ height: `${35 + ((i * 17) % 55)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[380px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-sm">
        <h3 className="mb-2 text-center text-base font-bold text-gray-900">
          {CHART_TITLE}
        </h3>
        <p className="max-w-sm text-sm text-gray-600">
          No monthly fuel data for this range. Try widening the months or
          clearing the aircraft filter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-center text-sm font-bold text-gray-900 sm:text-base">
        {CHART_TITLE}
      </h3>
      <div
        className="w-full min-h-[350px]"
        style={{ height: 400, width: "100%" }}
      >
        <ResponsiveContainer width="100%" height="100%" minHeight={350}>
          <ComposedChart
            data={rows}
            margin={{ top: 36, right: 20, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="monthLabel"
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
              domain={leftDomain}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6B7280", fontSize: 11 }}
              tickFormatter={formatAxisTick}
              width={52}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={rightDomain}
              allowDataOverflow
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
                  payload={
                    payload as Array<{
                      dataKey?: string | number;
                      name?: string;
                      value?: number | null;
                      color?: string;
                      payload?: ChartRow;
                    }>
                  }
                  label={label != null ? String(label) : undefined}
                  fuelUnit={unit}
                />
              )}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              layout="horizontal"
              height={40}
              wrapperStyle={{ paddingTop: 8 }}
              payload={[
                { value: "Hours", type: "square", color: HOURS_COLOR, id: "hours" },
                {
                  value: fuelLabel,
                  type: "square",
                  color: FUEL_COLOR,
                  id: "fuel",
                },
                {
                  value: burnSeriesLabel,
                  type: "line",
                  color: BURN_COLOR,
                  id: "burn",
                },
              ]}
            />
            <Bar
              yAxisId="left"
              dataKey="hours"
              name="Hours"
              fill={HOURS_COLOR}
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
              <LabelList
                dataKey="hours"
                content={(props) => {
                  const p = props as {
                    x?: number;
                    y?: number;
                    width?: number;
                    index?: number;
                  };
                  const row =
                    typeof p.index === "number" ? rows[p.index] : undefined;
                  return (
                    <QualityFlagMarker
                      x={p.x}
                      y={p.y}
                      width={p.width}
                      index={p.index}
                      payload={row}
                    />
                  );
                }}
              />
            </Bar>
            <Bar
              yAxisId="left"
              dataKey="fuel"
              name={fuelLabel}
              fill={FUEL_COLOR}
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
              name={burnSeriesLabel}
              stroke={BURN_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4, fill: BURN_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="burn"
                position="top"
                formatter={formatLineLabel}
                style={{
                  fill: BURN_COLOR,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
