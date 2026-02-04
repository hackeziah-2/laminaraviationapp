import React, { useState } from "react";
import {
  ArrowLeft,
  Printer,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { AddInspectionModal } from "./AddInspectionModal";

interface CPCPMonitoringProps {
  onBack?: () => void;
  msn: string;
  registration?: string;
  aftf?: string;
  tach?: string;
  date?: string;
  /** When true, hide the top header (back, print, export, add) for use inside Maintenance CPCP tab */
  embedded?: boolean;
}

interface InspectionItem {
  id: number;
  remaining: {
    months: number | string;
    days: number | string;
    tech: number | string;
    aftf: number | string;
  };
  inspectionCode: string;
  description: string;
  interval: {
    hours: number | string;
    months: number | string;
    tech: number | string;
    aftf: number | string;
  };
  lastDone: {
    date: string;
    tech: number | string;
    aftf: number | string;
  };
  nextDue: {
    date: string;
    tech: number | string;
    aftf: number | string;
  };
  reference: string;
  status: "green" | "yellow" | "red" | "white";
}

export function CPCPMonitoring({
  onBack,
  msn,
  registration = "RP-C12",
  aftf = "7895.4",
  tach = "7894.8",
  date = "20-Sep-25",
  embedded = false,
}: CPCPMonitoringProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sample inspection data
  const inspectionData: InspectionItem[] = [
    {
      id: 1,
      remaining: { months: "70.97", days: "214", tech: "95.7", aftf: "95.7" },
      inspectionCode: "IO 1",
      description: "Records Inspection",
      interval: { hours: "100", months: "12", tech: "7955.5", aftf: "7691.1" },
      lastDone: { date: "7-September-2024", tech: "7955.5", aftf: "7691.1" },
      nextDue: { date: "16-Sep-2026", tech: "7955.5", aftf: "7691.1" },
      reference: "ATL-2902323",
      status: "white",
    },
    {
      id: 2,
      remaining: { months: "2.25", days: "216", tech: "-", aftf: "-" },
      inspectionCode: "IO 2",
      description: "Baseline Program",
      interval: { hours: "-", months: "12", tech: "-", aftf: "7684.1" },
      lastDone: { date: "29-May-2024", tech: "-", aftf: "7684.1" },
      nextDue: { date: "29-May-2026", tech: "-", aftf: "-" },
      reference: "ATL-1882217",
      status: "white",
    },
    {
      id: 3,
      remaining: { months: "-", days: "-", tech: "-", aftf: "-" },
      inspectionCode: "IO 3",
      description: "Baseline Program",
      interval: { hours: "-", months: "24", tech: "-", aftf: "-" },
      lastDone: { date: "31-Jan-2025", tech: "-", aftf: "-" },
      nextDue: { date: "31-Jan-2027", tech: "-", aftf: "-" },
      reference: "ATL-4105621",
      status: "white",
    },
    {
      id: 4,
      remaining: { months: "-", days: "-", tech: "-", aftf: "-" },
      inspectionCode: "IO 4",
      description: "Baseline Program",
      interval: { hours: "-", months: "36", tech: "-", aftf: "6098.4" },
      lastDone: { date: "31-Jan-2025", tech: "-", aftf: "-" },
      nextDue: { date: "1-Jan-2028", tech: "-", aftf: "-" },
      reference: "ATL-1668644",
      status: "red",
    },
    {
      id: 5,
      remaining: { months: "-", days: "-", tech: "-", aftf: "-" },
      inspectionCode: "IO 5",
      description: "Baseline Program",
      interval: { hours: "-", months: "48", tech: "-", aftf: "6098.4" },
      lastDone: { date: "31-Jan-2025", tech: "-", aftf: "-" },
      nextDue: { date: "1-Jan-2029", tech: "-", aftf: "-" },
      reference: "ATL-0624098",
      status: "red",
    },
    {
      id: 6,
      remaining: { months: "-31.37", days: "905", tech: "-", aftf: "-" },
      inspectionCode: "IO 6",
      description: "Baseline Program",
      interval: { hours: "-", months: "60", tech: "-", aftf: "6098.4" },
      lastDone: { date: "31-Jan-2025", tech: "-", aftf: "-" },
      nextDue: { date: "1-Jan-2030", tech: "-", aftf: "-" },
      reference: "ATL-7712033",
      status: "green",
    },
    {
      id: 7,
      remaining: { months: "-", days: "-", tech: "1165.6", aftf: "1165.6" },
      inspectionCode: "IO 7",
      description:
        "Baseline Program (to find un/intentionally removed)\n1. Protective Finish - Damaged or Deteriorated\n2. Improper Bonding - Brackets and skin attachments inspection\n3. Protective Finish - Damage to protective finish elements inspection",
      interval: { hours: "1000", months: "-", tech: "-", aftf: "6098.4" },
      lastDone: { date: "31-Jan-2025", tech: "7055.0", aftf: "7055.0" },
      nextDue: { date: "1-Jan-2026", tech: "-", aftf: "-" },
      reference: "ATL-5591842",
      status: "white",
    },
    {
      id: 8,
      remaining: { months: "4.23", days: "128", tech: "169.6", aftf: "1892.6" },
      inspectionCode: "IO 8",
      description: "Wing Inspection - Detailed",
      interval: { hours: "500", months: "12", tech: "-", aftf: "7069.4" },
      lastDone: { date: "16-Mar-2025", tech: "7589.4", aftf: "7589.4" },
      nextDue: { date: "16-Mar-2026", tech: "8089.4", aftf: "8089.4" },
      reference: "ATL-1823291",
      status: "yellow",
    },
    {
      id: 9,
      remaining: { months: "7.67", days: "233", tech: "-", aftf: "-" },
      inspectionCode: "IO 9",
      description: "Fuselage Inspection",
      interval: { hours: "-", months: "24", tech: "-", aftf: "6359.4" },
      lastDone: { date: "20-Jun-2024", tech: "-", aftf: "-" },
      nextDue: { date: "20-Jun-2026", tech: "-", aftf: "-" },
      reference: "ATL-3015672",
      status: "white",
    },
    {
      id: 10,
      remaining: { months: "3.87", days: "117", tech: "169.6", aftf: "1892.6" },
      inspectionCode: "IO 10",
      description: "Landing Gear Inspection",
      interval: { hours: "200", months: "6", tech: "-", aftf: "7789.4" },
      lastDone: { date: "5-Sep-2025", tech: "7889.4", aftf: "7789.4" },
      nextDue: { date: "5-Mar-2026", tech: "8089.4", aftf: "8089.4" },
      reference: "ATL-2902323",
      status: "yellow",
    },
  ];

  const getRowBackgroundColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-emerald-50/70";
      case "yellow":
        return "bg-amber-50/70";
      case "orange":
        return "bg-orange-50/70";
      case "red":
        return "bg-red-50/70";
      default:
        return "bg-white";
    }
  };

  // Search: filter by inspection code, description, or ATL-SEC.NO (reference)
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return inspectionData;
    const q = searchQuery.toLowerCase().trim();
    return inspectionData.filter(
      (item) =>
        (item.inspectionCode || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q) ||
        (item.reference || "").toLowerCase().includes(q)
    );
  }, [searchQuery]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination logic
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = filteredData.slice(startIndex, endIndex);

  const contentPadding = embedded ? "p-0" : "p-6";

  return (
    <div className="h-full overflow-auto bg-gray-50/50">
      {/* Header - only when not embedded */}
      {!embedded && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to List
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={contentPadding}>
        <div className="space-y-6">
          {/* Title + Aircraft + Legend */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h1 className="text-base font-semibold text-gray-900 tracking-tight">
                CPCP Monitoring
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {registration}
                </span>
                <span>
                  MSN <span className="text-gray-900">{msn}</span>
                </span>
                <span>
                  AFTT <span className="text-gray-900">{aftf}</span>
                </span>
                <span>
                  TACH <span className="text-gray-900">{tach}</span>
                </span>
                <span>
                  DATE <span className="text-gray-900">{date}</span>
                </span>
              </div>
            </div>
            <div className="px-5 py-3 bg-gray-50/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-emerald-100 border border-emerald-200/80" />
                <span>&lt; 40% remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-amber-100 border border-amber-200/80" />
                <span>&lt; 20% remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-orange-100 border border-orange-200/80" />
                <span>&lt; 10% remaining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 rounded-sm bg-red-100 border border-red-200/80" />
                <span>Due</span>
              </div>
            </div>
          </div>

          {/* Search + Add Entry - same row as TCC */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Search Inspection
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by inspection code, description, or ATL-SEC.NO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap mt-6"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>

          {/* Inspections table card - blue header like TCC */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-700/30 bg-blue-600 text-white">
                    <th
                      colSpan={4}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      Remaining
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      Description
                    </th>
                    <th
                      colSpan={4}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      Interval
                    </th>
                    <th
                      colSpan={3}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      Last done
                    </th>
                    <th
                      colSpan={3}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95 border-r border-white/20"
                    >
                      Next due
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-white/95"
                    >
                      ATL-SEC.NO
                    </th>
                  </tr>
                  <tr className="border-b border-blue-700/30 bg-blue-600 text-white">
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      Months
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      Days
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      TACH
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90 border-r border-white/20">
                      AFTT
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      Hours
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      Months
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      TACH
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90 border-r border-white/20">
                      AFTT
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      TACH
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90 border-r border-white/20">
                      AFTT
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90">
                      TACH
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-white/90 border-r border-white/20">
                      AFTT
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`${getRowBackgroundColor(
                        item.status
                      )} transition-colors`}
                    >
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.remaining.months}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.remaining.days}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.remaining.tech}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                        {item.remaining.aftf}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 border-r border-gray-100 max-w-[280px]">
                        <div className="whitespace-pre-line text-gray-600 leading-snug">
                          {item.description}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.interval.hours}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.interval.months}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.interval.tech}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                        {item.interval.aftf}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.lastDone.date}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.lastDone.tech}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                        {item.lastDone.aftf}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.nextDue.date}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                        {item.nextDue.tech}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap border-r border-gray-100">
                        {item.nextDue.aftf}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-gray-600">
                        {item.reference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination - same pattern as Aircraft Fleet Profile */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm appearance-none bg-no-repeat bg-[length:12px] bg-[right_0.25rem_center] pr-6"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[2rem] px-3 py-1.5 rounded transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-gray-500">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="min-w-[2rem] px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-600 px-6 py-2">
              Showing {totalItems === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(endIndex, totalItems)} of {totalItems} inspections
            </div>
          </div>
        </div>
      </div>

      {/* Add Inspection Modal */}
      {showAddModal && (
        <AddInspectionModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => {
            console.log("New inspection data:", data);
            // Handle the inspection data submission here
          }}
        />
      )}
    </div>
  );
}
