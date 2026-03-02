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
  { aircraft: "Boeing 737-800", registration: "N12345", status: "Departed", location: "JFK → LAX", time: "2 hours ago" },
  { aircraft: "Airbus A320", registration: "N67890", status: "Maintenance", location: "Hangar B", time: "5 hours ago" },
  { aircraft: "Boeing 787-9", registration: "N24680", status: "Arrived", location: "SFO", time: "8 hours ago" },
];

const DEFAULT_ALERTS: DashboardMaintenanceAlert[] = [
  { aircraft: "N98765 - Airbus A321", issue: "Scheduled maintenance due in 3 days", priority: "medium" },
  { aircraft: "N13579 - Boeing 777-300", issue: "Engine inspection required", priority: "high" },
  { aircraft: "N86420 - Airbus A330", issue: "Tire replacement scheduled", priority: "low" },
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
        if (!cancelled) setError(err?.response?.data?.detail ?? err?.message ?? "Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const s = data?.stats;
  const stats = [
    { ...DEFAULT_STATS[0], value: String(s?.totalAircraft ?? data?.totalAircraft ?? DEFAULT_STATS[0].value) },
    { ...DEFAULT_STATS[1], value: String(s?.totalAircraftRunning ?? data?.totalAircraftRunning ?? DEFAULT_STATS[1].value) },
    { ...DEFAULT_STATS[2], value: String(s?.totalAircraftOngoingMaintenance ?? data?.totalAircraftOngoingMaintenance ?? DEFAULT_STATS[2].value) },
    { ...DEFAULT_STATS[3], value: String(s?.totalAircraftAog ?? data?.totalAircraftAog ?? DEFAULT_STATS[3].value) },
  ];

  const recentActivities = (data?.recentActivities?.length ? data.recentActivities : DEFAULT_ACTIVITIES) as Array<{
    aircraft: string;
    registration: string;
    status: string;
    location: string;
    time: string;
  }>;

  const maintenanceAlerts = (data?.maintenanceAlerts?.length ? data.maintenanceAlerts : DEFAULT_ALERTS) as Array<{
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
  const onTimeMaintenanceTrend = perf?.onTimeMaintenanceTrend ?? "↑ 3% vs last month";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-1">
          Real-time overview of your fleet operations
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          Loading dashboard…
        </div>
      )}

      {!loading && (
        <>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-3">{stat.label}</p>
                  <p className="text-3xl text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activities */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg text-gray-900">Recent Activities</h3>
            <button className="text-blue-600 text-sm hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plane className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{activity.aircraft ?? "—"}</p>
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
                  <p className="text-xs text-gray-400 mt-1">{activity.time ?? "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Alerts */}
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg text-gray-900">Maintenance Alerts</h3>
            <AlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-4">
            {maintenanceAlerts.map((alert, index) => (
              <div
                key={index}
                className="p-4 border-l-4 bg-gray-50 rounded-r-lg"
                style={{
                  borderLeftColor:
                    alert.priority === "high"
                      ? "#ef4444"
                      : alert.priority === "medium"
                      ? "#f59e0b"
                      : "#10b981",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.aircraft ?? "—"}</p>
                    <p className="text-sm text-gray-600 mt-1">{alert.issue ?? "—"}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
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

      {/* Fleet Performance Chart */}
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="text-lg text-gray-900 mb-5">
          Fleet Performance Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-700">Flight Hours (MTD)</p>
            </div>
            <p className="text-2xl text-blue-700">{flightHoursMtd}</p>
            <p className="text-xs text-green-600 mt-1">{flightHoursTrend}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-700">Utilization Rate</p>
            </div>
            <p className="text-2xl text-green-700">{utilizationRate}</p>
            <p className="text-xs text-green-600 mt-1">{utilizationTrend}</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-gray-700">On-Time Maintenance</p>
            </div>
            <p className="text-2xl text-purple-700">{onTimeMaintenance}</p>
            <p className="text-xs text-green-600 mt-1">{onTimeMaintenanceTrend}</p>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
