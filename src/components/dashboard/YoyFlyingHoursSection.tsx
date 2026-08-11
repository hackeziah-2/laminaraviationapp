import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "../ui/skeleton";
import {
  cleanFlagMessage,
  formatReportNumber,
  type DataQualityFlag,
  type YoyFlyingHours,
} from "../../types/dashboardReport.types";

const YOY_TITLE = "Monthly Total Flying Hours";
const YOY_TABLE_TITLE = "MONTHLY FLYING HOURS";
const PRIOR_YEAR_COLOR = "#9CA3AF";
const CURRENT_YEAR_COLOR = "#2563EB";
/** Distinct strokes when comparing more than two years (oldest → newest-1). */
const MULTI_YEAR_COLORS = ["#9CA3AF", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899"];
const VARIANCE_ROW_BG = "bg-[#FFF59D]";
const TABLE_HEADER_BG = "bg-[#B8D4E8]";
const AVERAGE_ROW_BG = "bg-[#39B54A]";
const CELL_BORDER = "border border-dotted border-gray-400";

type YoyFlyingHoursSectionProps = {
  data: YoyFlyingHours | null;
  dataQualityFlags?: DataQualityFlag[];
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
};

type ChartRow = {
  month: string;
  [yearKey: string]: string | number | null;
};

function yearColor(year: number, years: number[]): string {
  const sorted = [...years].sort((a, b) => a - b);
  const newest = sorted[sorted.length - 1];
  if (year === newest) return CURRENT_YEAR_COLOR;
  if (sorted.length <= 2) return PRIOR_YEAR_COLOR;
  const idx = sorted.indexOf(year);
  if (idx < 0) return PRIOR_YEAR_COLOR;
  return MULTI_YEAR_COLORS[idx % MULTI_YEAR_COLORS.length];
}

/** Last month index with hours > 0 per year key (for chart gaps + blank table cells). */
function lastPositiveMonthIndex(yoy: YoyFlyingHours): Record<string, number> {
  const yearKeys = yoy.years.map(String);
  const lastPositiveIdx: Record<string, number> = {};
  for (const key of yearKeys) {
    lastPositiveIdx[key] = -1;
    yoy.months.forEach((m, idx) => {
      const v = Number(m.values?.[key] ?? 0);
      if (Number.isFinite(v) && v > 0) lastPositiveIdx[key] = idx;
    });
  }
  return lastPositiveIdx;
}

/**
 * Build chart rows with trailing zeros after the last positive month nulled out
 * so incomplete years stop at the last month with data (no drop to zero).
 */
function buildChartRows(yoy: YoyFlyingHours): ChartRow[] {
  const yearKeys = yoy.years.map(String);
  const lastPositiveIdx = lastPositiveMonthIndex(yoy);

  return yoy.months.map((m, idx) => {
    const row: ChartRow = { month: m.month };
    for (const key of yearKeys) {
      const raw = Number(m.values?.[key] ?? 0);
      if (!Number.isFinite(raw)) {
        row[key] = null;
        continue;
      }
      // No data yet for this year past last flown month → gap, not zero.
      if (idx > lastPositiveIdx[key]) {
        row[key] = null;
      } else {
        row[key] = raw;
      }
    }
    return row;
  });
}

/** Table cell: blank after last month with data (match reference Aug–Dec empty). */
function formatYoyTableValue(
  value: number | undefined,
  monthIdx: number,
  yearKey: string,
  lastPositiveIdx: Record<string, number>
): string {
  const last = lastPositiveIdx[yearKey] ?? -1;
  // Year with no flown hours at all → show zeros (API zeroed structure).
  if (last < 0) {
    return formatReportNumber(value ?? 0);
  }
  // Incomplete year: leave months after last flown month blank (not "0").
  if (monthIdx > last) return "";
  if (value == null || !Number.isFinite(Number(value))) return "";
  return formatReportNumber(Number(value));
}

function formatHoursLabel(value: unknown): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return formatReportNumber(n);
}

function ChartTooltipContent({
  active,
  payload,
  label,
  years,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number | null;
    color?: string;
  }>;
  label?: string;
  years: number[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-gray-900">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? "");
          const year = Number(key);
          return (
            <li key={key} className="flex items-center gap-2 text-gray-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    entry.color ??
                    (Number.isFinite(year)
                      ? yearColor(year, years)
                      : PRIOR_YEAR_COLOR),
                }}
                aria-hidden
              />
              <span>
                {key}:{" "}
                <span className="font-medium tabular-nums">
                  {entry.value == null
                    ? "—"
                    : formatReportNumber(Number(entry.value))}
                </span>{" "}
                FH
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function flagReason(
  month: string,
  flag: string | null,
  flags: DataQualityFlag[]
): string {
  if (!flag) return "";
  const match = flags.find(
    (f) =>
      f.code === flag &&
      (f.message?.toLowerCase().includes(month.toLowerCase()) ||
        f.originDate != null)
  );
  return cleanFlagMessage(match?.message || flag);
}

export function YoyFlyingHoursSection({
  data,
  dataQualityFlags = [],
  loading = false,
  errorMessage = null,
  onRetry,
}: YoyFlyingHoursSectionProps) {
  const years = data?.years ?? [];
  const chartRows = useMemo(
    () => (data ? buildChartRows(data) : []),
    [data]
  );
  const lastPositiveIdx = useMemo(
    () => (data ? lastPositiveMonthIndex(data) : {}),
    [data]
  );
  const hasAnyPoint = useMemo(
    () =>
      chartRows.some((row) =>
        years.some((y) => {
          const v = row[String(y)];
          return v != null && Number(v) > 0;
        })
      ),
    [chartRows, years]
  );

  if (loading) {
    return (
      <section
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
        aria-label={YOY_TITLE}
      >
        <Skeleton className="mb-4 h-6 w-72 bg-gray-100" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,62%)_minmax(0,38%)]">
          <Skeleton className="h-[360px] w-full rounded-lg bg-gray-100" />
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full bg-gray-100" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section
        className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm sm:p-5"
        role="alert"
        aria-label={YOY_TITLE}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-red-900">{YOY_TITLE}</h3>
            <p className="mt-1 text-sm text-red-800">{errorMessage}</p>
          </div>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Retry
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  if (!data || years.length === 0) {
    return (
      <section
        className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-sm"
        aria-label={YOY_TITLE}
      >
        <h3 className="mb-2 text-base font-bold text-gray-900">{YOY_TITLE}</h3>
        <p className="max-w-sm text-sm text-gray-600">
          No year-over-year flying hours data available.
        </p>
      </section>
    );
  }

  const sortedYears = [...years].sort((a, b) => a - b);

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      aria-label={YOY_TITLE}
    >
      <h3 className="mb-4 text-center text-sm font-bold text-gray-900 sm:text-base">
        {YOY_TITLE}
      </h3>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,62%)_minmax(0,38%)] lg:gap-5">
        <div className="min-h-[360px] w-full" style={{ height: 380 }}>
          {!hasAnyPoint ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-600">
              No flying hours recorded for {sortedYears.join(" / ")}.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={350}>
              <LineChart
                data={chartRows}
                margin={{ top: 28, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  tickFormatter={(v) => formatReportNumber(Number(v))}
                  width={52}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTooltipContent
                      active={active}
                      payload={
                        payload as Array<{
                          dataKey?: string | number;
                          value?: number | null;
                          color?: string;
                        }>
                      }
                      label={label != null ? String(label) : undefined}
                      years={sortedYears}
                    />
                  )}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  height={36}
                  wrapperStyle={{ paddingTop: 8 }}
                />
                {sortedYears.map((year) => {
                  const key = String(year);
                  const color = yearColor(year, sortedYears);
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={color}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    >
                      <LabelList
                        dataKey={key}
                        position="top"
                        formatter={formatHoursLabel}
                        style={{
                          fill: color,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      />
                    </Line>
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="min-h-0 overflow-x-auto overflow-y-auto rounded-lg border border-gray-300">
          <table className="w-full min-w-[260px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-black text-white">
                <th
                  colSpan={1 + sortedYears.length}
                  className={`${CELL_BORDER} px-3 py-2 text-center text-xs font-bold tracking-wide`}
                >
                  {YOY_TABLE_TITLE}
                </th>
              </tr>
              <tr className={`${TABLE_HEADER_BG} text-gray-900`}>
                <th className={`${CELL_BORDER} px-3 py-2 text-center text-xs font-bold`}>
                  Month
                </th>
                {sortedYears.map((year) => (
                  <th
                    key={year}
                    className={`${CELL_BORDER} px-3 py-2 text-center text-xs font-bold`}
                  >
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.months.map((row, idx) => {
                const isVariance = row.flag === "large_yoy_variance";
                const reason = flagReason(
                  row.month,
                  row.flag,
                  dataQualityFlags
                );
                return (
                  <tr
                    key={row.month}
                    className={isVariance ? VARIANCE_ROW_BG : "bg-white"}
                    title={isVariance ? reason : undefined}
                  >
                    <td
                      className={`${CELL_BORDER} px-3 py-1.5 text-left font-medium text-gray-900`}
                    >
                      {row.month}
                    </td>
                    {sortedYears.map((year) => {
                      const key = String(year);
                      return (
                        <td
                          key={year}
                          className={`${CELL_BORDER} px-3 py-1.5 text-right tabular-nums text-gray-900 ${
                            isVariance ? "font-semibold" : ""
                          }`}
                        >
                          {formatYoyTableValue(
                            row.values[key],
                            idx,
                            key,
                            lastPositiveIdx
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className={`${AVERAGE_ROW_BG} font-bold`}>
                <td className={`${CELL_BORDER} px-3 py-2 text-left text-sm text-black`}>
                  Average FH
                </td>
                {sortedYears.map((year) => (
                  <td
                    key={year}
                    className={`${CELL_BORDER} px-3 py-2 text-right text-sm tabular-nums text-black`}
                  >
                    {formatReportNumber(data.averageFh[String(year)] ?? 0)}
                  </td>
                ))}
              </tr>
              <tr className="bg-white font-bold">
                <td className={`${CELL_BORDER} px-3 py-2 text-left text-sm text-black`}>
                  Grand Total
                </td>
                {sortedYears.map((year) => (
                  <td
                    key={year}
                    className={`${CELL_BORDER} px-3 py-2 text-right text-sm tabular-nums text-black`}
                  >
                    {formatReportNumber(data.grandTotal[String(year)] ?? 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
