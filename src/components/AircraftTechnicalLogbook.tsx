import {
  Search,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Printer,
  Download,
  Plus,
  FileText,
  Clock,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { Spinner } from "../components/ui/spinner";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { EditTechnicalLogbookEntryModal } from "./EditTechnicalLogbookEntryModal";
import { ViewTechnicalLogbookEntryModal } from "./ViewTechnicalLogbookEntryModal";
import {
  getAircraftTechnicalLogs,
  getAircraftTechnicalLogById,
  createAircraftTechnicalLog,
  deleteAircraftTechnicalLog,
  AircraftTechnicalLog,
} from "../api/aircraftTechnicalLogApi";

interface LogbookEntry {
  id: number;
  // line: number;
  seqNo: string;
  date: string;
  acReg: string;
  route: string;
  origin: string;
  destination: string;
  fltTime: string;
  pilot: string;
  // status: "Serviceable" | "Under Maintenance";
}

export function AircraftTechnicalLogbook() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("-created_at"); // Default: newest first
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LogbookEntry | null>(null);
  const [selectedFullEntry, setSelectedFullEntry] =
    useState<AircraftTechnicalLog | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);

  // Map backend data to frontend format
  const mapToLogbookEntry = (
    apiEntry: AircraftTechnicalLog,
    index: number
  ): LogbookEntry => {
    // Format date from YYYY-MM-DD to MM/DD/YYYY
    const formatDate = (dateStr: string) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
        .getDate()
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`;
    };

    // Format route from stations
    const route = `${apiEntry.originStation || ""} → ${
      apiEntry.destinationStation || ""
    }`;

    // Format flight time from hobbs meter total or tachometer total
    const fltTime = `${(
      apiEntry.hobbsMeterTotal ||
      apiEntry.tachometerTotal ||
      0
    ).toFixed(2)}h`;

    // Determine status based on actions taken or remarks
    // If there are actions taken or remarks indicating maintenance, mark as "Under Maintenance"
    // const status: "Serviceable" | "Under Maintenance" =
    //   (apiEntry.actionsTaken && apiEntry.actionsTaken.trim() !== "") ||
    //   (apiEntry.remarks && apiEntry.remarks.trim() !== "" &&
    //    apiEntry.remarks.toLowerCase().includes("maintenance"))
    //     ? "Under Maintenance"
    //     : "Serviceable";

    // Extract pilot info from remarks or use "N/A"
    const pilotName = apiEntry.remarks
      ? apiEntry.remarks.split("\n")[0].substring(0, 30)
      : "N/A";

    return {
      id: apiEntry.id,
      seqNo: apiEntry.sequenceNo || "",
      date: formatDate(apiEntry.originDate || apiEntry.destinationDate || ""),
      acReg: apiEntry.aircraft?.registration || "",
      route: route,
      origin: apiEntry?.originStation || "",
      destination: apiEntry?.destinationStation || "",
      fltTime: fltTime,
      pilot: pilotName,
      // status: status,
    };
  };

  // Fetch entries from API
  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAircraftTechnicalLogs(
        currentPage,
        itemsPerPage,
        debouncedSearchTerm, // Use debounced search term
        undefined, // aircraftFk - optional, can filter by aircraft ID
        sortBy // Sort parameter
      );

      const mappedEntries = response.items.map((entry, index) =>
        mapToLogbookEntry(entry, index)
      );

      setEntries(mappedEntries);
      setTotalPages(response.pages);
      setTotalEntries(response.total);
    } catch (err: any) {
      // Check for network errors (backend not running)
      if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error" ||
        err.message?.includes("CONNECTION_REFUSED")
      ) {
        setError(
          "Unable to connect to the backend server. Please ensure the backend is running at http://localhost:8000"
        );
      } else {
        setError(
          err.response?.data?.detail || err.message || "Failed to fetch entries"
        );
      }
      setEntries([]);
      setTotalPages(0);
      setTotalEntries(0);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  };

  // Debounce search term
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 500); // 500ms delay

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  useEffect(() => {
    fetchEntries();
  }, [currentPage, itemsPerPage, debouncedSearchTerm, sortBy]);

  // Reset to page 1 when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy]);

  // Calculate statistics from current page entries
  const totalFlightHours = entries
    .reduce((sum, e) => {
      const hours = parseFloat(e.fltTime.replace("h", "")) || 0;
      return sum + hours;
    }, 0)
    .toFixed(1);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = entries;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Don't reset page here - let debounce handle it
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    // If already sorting by this column, toggle direction
    if (sortBy === column) {
      setSortBy(`-${column}`);
    } else if (sortBy === `-${column}`) {
      setSortBy(column);
    } else {
      // New column, default to descending
      setSortBy(`-${column}`);
    }
    setCurrentPage(1);
  };

  // Get sort indicator for a column
  const getSortIndicator = (column: string) => {
    const activeColumn = sortBy.replace("-", "");
    const isActive = activeColumn === column;
    const isDescending = sortBy.startsWith("-");

    if (!isActive) {
      return null;
    }

    return (
      <span className="flex items-center gap-0.5">
        {isDescending ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-[10px] text-gray-400">1</span>
      </span>
    );
  };

  // Handle view entry - fetch full details
  const handleViewEntry = async (entry: LogbookEntry) => {
    try {
      const fullEntry = await getAircraftTechnicalLogById(entry.id);
      setSelectedFullEntry(fullEntry);
      setSelectedEntry(entry);
      setIsViewModalOpen(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to fetch entry details"
      );
    }
  };

  // Handle edit entry – Edit modal fetches full details via READ
  const handleEditEntry = (entry: LogbookEntry) => {
    setSelectedEntry(entry);
    setIsEditModalOpen(true);
  };

  // Handle delete entry
  const handleDeleteEntry = async (entry: LogbookEntry) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Are you sure you want to delete entry with Sequence No ${entry.seqNo}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteAircraftTechnicalLog(entry.id);
      // Refresh the list
      await fetchEntries();
      // If we're on a page that becomes empty, go to previous page
      if (entries.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      // Show success message
      Swal.fire({
        title: "Deleted!",
        text: "Entry has been deleted successfully.",
        icon: "success",
        confirmButtonColor: "#1f2937",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire({
        title: "Error!",
        text:
          err.response?.data?.detail || err.message || "Failed to delete entry",
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // Handle create entry success
  const handleCreateSuccess = () => {
    setIsModalOpen(false);
    fetchEntries();
    setCurrentPage(1);
    Swal.fire({
      title: "Success!",
      text: "Entry has been created successfully.",
      icon: "success",
      confirmButtonColor: "#1f2937",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Handle update entry success
  const handleUpdateSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedEntry(null);
    setSelectedFullEntry(null);
    fetchEntries();
    Swal.fire({
      title: "Updated!",
      text: "Entry has been updated successfully.",
      icon: "success",
      confirmButtonColor: "#1f2937",
      timer: 2000,
      showConfirmButton: false,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            Aircraft Technical Logbook
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Comprehensive flight and maintenance records
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Printer className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Print</span>
          </button>
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Entry</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total Entries</span>
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-900 text-2xl sm:text-3xl">
            {totalEntries || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">Total Flight Hours</span>
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-900 text-2xl sm:text-3xl">
            {totalFlightHours}
          </p>
        </div>
      </div>

      {/* Blue Banner */}
      <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg">
        <span className="tracking-wide text-sm sm:text-base">
          Technical Logbook Entries
        </span>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2">Search Entries</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by sequence number, A/C REG, route, or station..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Table Info */}
          <div className="text-gray-600 text-sm">
            {error ? (
              <span className="text-red-600">Error: {error}</span>
            ) : (
              <>
                Showing {entries.length > 0 ? startIndex + 1 : 0} to{" "}
                {Math.min(startIndex + itemsPerPage, entries.length)} of{" "}
                {entries.length} entries
              </>
            )}
          </div>

          {/* Entries Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("sequence_no")}
                    >
                      <b>SEQUENCE NO</b>
                      {getSortIndicator("sequence_no")}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("aircraft_registration")}
                    >
                      <b>A/C REG</b>
                      {getSortIndicator("aircraft_registration")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      ORIGIN
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      DESTINATION
                    </th>

                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      FLT TIME
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("created_at")}
                    >
                      <b>CREATED AT</b>
                      {getSortIndicator("created_at")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {error ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-red-600"
                      >
                        Error loading entries: {error}
                      </td>
                    </tr>
                  ) : paginatedEntries.length > 0 ? (
                    paginatedEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-3.5 text-gray-900">
                          {entry.seqNo}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900">
                          {entry.acReg}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900">
                          {entry.origin}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900">
                          {entry.destination}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900">
                          {entry.fltTime}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {entry.date}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewEntry(entry)}
                              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditEntry(entry)}
                              className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry)}
                              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No entries found matching your search criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-700 text-sm">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  disabled={loading}
                  className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-6 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    ROUTE;
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={loading}
                      className={`min-w-[2rem] px-3 py-1.5 rounded transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={
                    currentPage === totalPages || totalPages === 0 || loading
                  }
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                >
                  <span>Next</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Entry Modal – CREATE */}
      <AddTechnicalLogbookEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Entry Modal – READ + UPDATE */}
      {selectedEntry && (
        <EditTechnicalLogbookEntryModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEntry(null);
            setSelectedFullEntry(null);
          }}
          onSuccess={handleUpdateSuccess}
          entryId={selectedEntry.id}
        />
      )}

      {/* View Entry Modal */}
      <ViewTechnicalLogbookEntryModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedEntry(null);
          setSelectedFullEntry(null);
        }}
        entry={selectedEntry}
        fullEntry={selectedFullEntry}
      />
    </div>
  );
}
