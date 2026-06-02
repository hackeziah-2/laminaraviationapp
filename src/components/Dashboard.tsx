import { useState, useEffect } from "react";
import {
  Plane,
  Wrench,
  MapPin,
  Activity,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { getDashboard } from "../api/dashboardApi";
import type {
  DashboardResponse,
  DashboardRecentActivity,
  DashboardMaintenanceAlert,
} from "../api/dashboardApi";
import { formatDisplayDate } from "../utility/utils";

const DEFAULT_STATS = [
  {
    label: "Total Aircraft",
    value: "30",
    icon: Plane,
    color: "bg-blue-50 text-blue-600",
    bgColor: "bg-blue-500",
  },
  {
    label: "Operational",
    value: "18",
    icon: Activity,
    color: "bg-green-50 text-green-600",
    bgColor: "bg-green-500",
  },
  {
    label: "In Maintenance",
    value: "8",
    icon: Wrench,
    color: "bg-yellow-50 text-yellow-600",
    bgColor: "bg-yellow-500",
  },
  {
    label: "AOG",
    value: "14",
    icon: MapPin,
    color: "bg-purple-50 text-purple-600",
    bgColor: "bg-purple-500",
  },
];

const DEFAULT_ACTIVITIES: DashboardRecentActivity[] = [
  {
    aircraft: "Boeing 737-800",
    registration: "N12345",
    status: "Departed",
    location: "JFK → LAX",
    time: "2 hours ago",
  },
  {
    aircraft: "Airbus A320",
    registration: "N67890",
    status: "Maintenance",
    location: "Hangar B",
    time: "5 hours ago",
  },
  {
    aircraft: "Boeing 787-9",
    registration: "N24680",
    status: "Arrived",
    location: "SFO",
    time: "8 hours ago",
  },
];

const DEFAULT_ALERTS: DashboardMaintenanceAlert[] = [
  {
    aircraft: "N98765 - Airbus A321",
    issue: "Scheduled maintenance due in 3 days",
    priority: "medium",
  },
  {
    aircraft: "N13579 - Boeing 777-300",
    issue: "Engine inspection required",
    priority: "high",
  },
  {
    aircraft: "N86420 - Airbus A330",
    issue: "Tire replacement scheduled",
    priority: "low",
  },
];

export function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboard()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err?.response?.data?.detail ??
              err?.message ??
              "Failed to load dashboard"
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const s = data?.stats;
  const stats = [
    {
      ...DEFAULT_STATS[0],
      value: String(
        s?.totalAircraft ?? data?.totalAircraft ?? DEFAULT_STATS[0].value
      ),
    },
    {
      ...DEFAULT_STATS[1],
      value: String(
        s?.totalAircraftRunning ??
          data?.totalAircraftRunning ??
          DEFAULT_STATS[1].value
      ),
    },
    {
      ...DEFAULT_STATS[2],
      value: String(
        s?.totalAircraftOngoingMaintenance ??
          data?.totalAircraftOngoingMaintenance ??
          DEFAULT_STATS[2].value
      ),
    },
    {
      ...DEFAULT_STATS[3],
      value: String(
        s?.totalAircraftAog ?? data?.totalAircraftAog ?? DEFAULT_STATS[3].value
      ),
    },
  ];

  const recentActivities = (
    data?.recentActivities?.length ? data.recentActivities : DEFAULT_ACTIVITIES
  ) as Array<{
    aircraft: string;
    registration: string;
    status: string;
    location: string;
    time: string;
  }>;

  const maintenanceAlerts = (
    data?.maintenanceAlerts?.length ? data.maintenanceAlerts : DEFAULT_ALERTS
  ) as Array<{
    aircraft: string;
    issue: string;
    priority: "high" | "medium" | "low";
  }>;

  const perf = data?.fleetPerformance;
  const flightHoursMtd = perf?.flightHoursMtd ?? "2,847";
  const flightHoursTrend = perf?.flightHoursTrend ?? "↑ 12% vs last month";
  const utilizationRate = perf?.utilizationRate ?? "87.3%";
  const utilizationTrend = perf?.utilizationTrend ?? "↑ 5% vs last month";
  const onTimeMaintenance = perf?.onTimeMaintenance ?? "94.2%";
  const onTimeMaintenanceTrend =
    perf?.onTimeMaintenanceTrend ?? "↑ 3% vs last month";

  const today = formatDisplayDate(new Date().toISOString());

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 pb-8 sm:gap-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 pt-7 shadow-sm sm:p-8 sm:pt-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-sky-100/90 to-indigo-50/50 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-64 rounded-full bg-gradient-to-tr from-rose-50 to-transparent blur-2xl" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            {today}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Dashboard 
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
            
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200/80 bg-red-50/90 p-4 text-sm text-red-800 shadow-sm backdrop-blur-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white/60 py-16 text-gray-500 shadow-inner">
          Loading dashboard…
        </div>
      )}

      {!loading && (
        <>
          {/* Stats Grid — same gap at all breakpoints so gutters stay even */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="group flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-100/80 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-500">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`${stat.color} rounded-2xl p-3 shadow-sm ring-1 ring-black/5`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Content grid — gap matches stats row so center gutter lines up on lg */}
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {/* Recent Activities */}
            <div className="flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                  Recent activity
                </h3>
                <button
                  type="button"
                  className="shrink-0 rounded-lg py-1.5 pl-2 text-sm font-medium text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700"
                >
                  View all
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {recentActivities.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-xl border border-gray-100/80 bg-gray-50/80 p-4 transition-colors hover:border-gray-200 hover:bg-white sm:gap-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100/80">
                      <Plane className="h-5 w-5 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {activity.aircraft ?? "—"}
                          </p>
                          <p className="text-sm text-gray-600">
                            {activity.registration ?? "—"}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            activity.status === "Departed"
                              ? "bg-blue-100 text-blue-700"
                              : activity.status === "Maintenance"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {activity.status ?? "—"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.location ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.time ?? "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Alerts */}
            <div className="flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                  Alerts
                </h3>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100/80">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {maintenanceAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className="rounded-r-xl border-l-4 bg-gray-50/90 p-4 pr-4 shadow-sm ring-1 ring-gray-100/60 sm:p-4 sm:pr-5"
                    style={{
                      borderLeftColor:
                        alert.priority === "high"
                          ? "#ef4444"
                          : alert.priority === "medium"
                          ? "#f59e0b"
                          : "#10b981",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {alert.aircraft ?? "—"}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {alert.issue ?? "—"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs px-2.5 py-1 rounded-full ${
                          alert.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : alert.priority === "medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {(alert.priority ?? "low").toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fleet Performance */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 pb-7 shadow-sm ring-1 ring-gray-100/80 sm:pb-8">
            <h3 className="mb-6 text-lg font-semibold tracking-tight text-gray-900">
              Fleet performance
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-4">
              <div className="flex flex-col rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/80 p-5 pb-6 ring-1 ring-sky-100/60">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-gray-700">Flight Hours (MTD)</p>
                </div>
                <p className="text-2xl text-blue-700">{flightHoursMtd}</p>
                <p className="mt-2 text-xs text-green-600">
                  {flightHoursTrend}
                </p>
              </div>
              <div className="flex flex-col rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50/90 p-5 pb-6 ring-1 ring-emerald-100/60">
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-gray-700">Utilization Rate</p>
                </div>
                <p className="text-2xl text-green-700">{utilizationRate}</p>
                <p className="mt-2 text-xs text-green-600">
                  {utilizationTrend}
                </p>
              </div>
              <div className="flex flex-col rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50/80 p-5 pb-6 ring-1 ring-violet-100/60">
                <div className="mb-3 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-600" />
                  <p className="text-sm text-gray-700">On-Time Maintenance</p>
                </div>
                <p className="text-2xl text-purple-700">{onTimeMaintenance}</p>
                <p className="mt-2 text-xs text-green-600">
                  {onTimeMaintenanceTrend}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
