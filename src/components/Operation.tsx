import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Printer,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  FileText,
  Search,
  Pencil,
  Eye,
} from "lucide-react";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { EditTechnicalLogbookEntryModal } from "./EditTechnicalLogbookEntryModal";
import { ViewTechnicalLogbookEntryModal } from "./ViewTechnicalLogbookEntryModal";
import {
  getAircraftTechnicalLogs,
  deleteAircraftTechnicalLog,
  AircraftTechnicalLog,
} from "../api/aircraftTechnicalLogApi";
import { getAircraftById } from "../api/aircraftApi";
import apiClient from "../api/index";
import Swal from "sweetalert2";
import { Spinner } from "./ui/spinner";
import { Aircraft } from "../types/Aircraft";
import {
  toCamel,
  formatTimeZulu,
  computeTotalBlockTime,
} from "../utility/utils";
import { getAllAccounts, Account } from "../api/accountApi";

type GroupByOption =
  | "allColumns"
  | "fuelAndOilData"
  | "maintenancePlanning"
  | "reliabilityMonitoring";

const STICKY_SEQ_CLASS =
  "px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[140px] w-[140px]";
const STICKY_SEQ_CELL_CLASS =
  "px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-gray-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium";

export function Operation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const aircraftId = parseInt(id || "1");

  const handleBack = () => {
    navigate("/profile");
  };

  const handleViewReliability = (recordId: number) => {
    navigate(`/profile/${id}/operation/reliability/${recordId}`);
  };

  /** Download file via GET /api/v1/{folder}/download/{filename} */
  const handleDownloadFile = async (
    folder: string,
    filename: string,
    displayName?: string
  ) => {
    if (!filename || !filename.trim()) return;
    let filePath = filename.trim().replace(/^\/+/, "");
    filePath = filePath.replace(/^api\/v1\//, "");
    const endpoint = `${folder}/download/${filePath}`;
    try {
      const response = await apiClient.get(endpoint, {
        responseType: "blob",
        headers: { Accept: "application/octet-stream" },
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = displayName || filePath.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error:", err);
      alert(
        err?.response?.data?.detail ||
          err?.message ||
          "Failed to download file."
      );
    }
  };

  /** Infer MIME from filename when server returns octet-stream (so JPG/PDF are viewable) */
  const getMimeFromFilename = (path: string): string | null => {
    const ext = (path.split("/").pop() || path).split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "gif") return "image/gif";
    if (ext === "webp") return "image/webp";
    return null;
  };

  /** View file in popup modal */
  const [showFileViewModal, setShowFileViewModal] = useState(false);
  const [fileViewBlobUrl, setFileViewBlobUrl] = useState<string | null>(null);
  const [fileViewMimeType, setFileViewMimeType] = useState<string | null>(null);
  const [fileViewLoading, setFileViewLoading] = useState(false);
  const [fileViewError, setFileViewError] = useState<string | null>(null);

  const handleViewFile = async (folder: string, filename: string) => {
    if (!filename || !filename.trim()) return;
    setFileViewLoading(true);
    setFileViewError(null);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    let filePath = filename.trim().replace(/^\/+/, "");
    filePath = filePath.replace(/^api\/v1\//, "");
    const endpoint = `${folder}/download/${filePath}`;
    try {
      const response = await apiClient.get(endpoint, {
        responseType: "blob",
        headers: { Accept: "application/octet-stream" },
      });
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const serverType =
        blob.type || (response as any).headers?.["content-type"] || null;
      const isOctetStream =
        !serverType || serverType === "application/octet-stream";
      const mimeType = isOctetStream
        ? getMimeFromFilename(filePath)
        : serverType;
      const isImage =
        mimeType &&
        (mimeType.startsWith("image/") ||
          mimeType === "image/jpeg" ||
          mimeType === "image/jpg");
      if (isImage) {
        setFileViewBlobUrl(url);
        setFileViewMimeType(mimeType);
        setShowFileViewModal(true);
      } else {
        const result = await Swal.fire({
          icon: "info",
          title: "Cannot view file",
          text: "This File cannot be viewed. Please download the file to see it.",
          showCancelButton: true,
          confirmButtonText: "Yes",
          cancelButtonText: "No",
        });
        if (result.isConfirmed) {
          const downloadName = filePath.split("/").pop() || "download";
          const link = document.createElement("a");
          link.href = url;
          link.download = downloadName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error("View file error:", err);
      setFileViewError(
        err?.response?.data?.detail || err?.message || "Failed to open file."
      );
    } finally {
      setFileViewLoading(false);
    }
  };

  const closeFileViewModal = () => {
    if (fileViewBlobUrl) {
      window.URL.revokeObjectURL(fileViewBlobUrl);
    }
    setShowFileViewModal(false);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setFileViewError(null);
  };

  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEntry, setSelectedEntry] =
    useState<AircraftTechnicalLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [fleetTimeRecords, setFleetTimeRecords] = useState<
    AircraftTechnicalLog[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [accountsMap, setAccountsMap] = useState<Map<number, Account>>(
    new Map()
  );
  const [groupBy, setGroupBy] = useState<GroupByOption>("allColumns");
  const [sequenceSort, setSequenceSort] = useState<"asc" | "desc">("asc");

  // Helpers for airframe/engine/propeller from nested or flat API (ATL fields)
  const getAirframeDisplay = (r: AircraftTechnicalLog) => {
    const nested = (r as any).airframe;
    if (
      nested &&
      (nested.hrsTime != null ||
        nested.run != null ||
        nested.aptt != null ||
        nested.aftt != null)
    ) {
      const run =
        nested.hrsTime ??
        nested.run ??
        r.airframeRunTime ??
        r.airframeTotalTime ??
        "-";
      const aftt = nested.aptt ?? nested.aftt ?? r.airframeAftt ?? "-";
      return `${run} / ${aftt}`;
    }
    const run =
      r.airframeRunTime ?? r.airframeTotalTime ?? (r as any).airframeRun ?? "-";
    const aftt = r.airframeAftt ?? (r as any).airframeTotalTime ?? "-";
    return `${run} / ${aftt}`;
  };
  const getEngineDisplay = (r: AircraftTechnicalLog) => {
    const nested = (r as any).engine;
    if (nested) {
      const run =
        nested.hrsTime ??
        nested.run ??
        r.engineRunTime ??
        r.engineTotalTime ??
        "-";
      const tsn = nested.tsn ?? r.engineTsn ?? "-";
      const tso = nested.tso ?? r.engineTso ?? "-";
      const tbo = nested.tbo ?? r.engineTbo ?? "-";
      return `RUN ${run} / TSN ${tsn} / TSO ${tso} / TBO ${tbo}`;
    }
    const run =
      r.engineRunTime ?? r.engineTotalTime ?? (r as any).engineRun ?? "-";
    const tsn = r.engineTsn ?? "-";
    const tso = r.engineTso ?? "-";
    const tbo = r.engineTbo ?? "-";
    return `RUN ${run} / TSN ${tsn} / TSO ${tso} / TBO ${tbo}`;
  };
  const getPropellerDisplay = (r: AircraftTechnicalLog) => {
    const nested = (r as any).propeller;
    if (nested) {
      const run =
        nested.hrsTime ??
        nested.run ??
        r.propellerRunTime ??
        r.propellerTotalTime ??
        "-";
      const tsn = nested.tsn ?? r.propellerTsn ?? "-";
      const tso = nested.tso ?? r.propellerTso ?? "-";
      const tbo = nested.tbo ?? r.propellerTbo ?? "-";
      return `RUN ${run} / TSN ${tsn} / TSO ${tso} / TBO ${tbo}`;
    }
    const run =
      r.propellerRunTime ??
      r.propellerTotalTime ??
      (r as any).propellerRun ??
      "-";
    const tsn = r.propellerTsn ?? "-";
    const tso = r.propellerTso ?? "-";
    const tbo = r.propellerTbo ?? "-";
    return `RUN ${run} / TSN ${tsn} / TSO ${tso} / TBO ${tbo}`;
  };

  // Fetch aircraft information
  useEffect(() => {
    const fetchAircraft = async () => {
      if (!aircraftId) return;
      try {
        const response = await getAircraftById(aircraftId);
        setAircraft(toCamel(response.data));
      } catch (err) {
        console.error("Error fetching aircraft:", err);
      }
    };
    fetchAircraft();
  }, [aircraftId]);

  // Fetch all accounts for lookup
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const accountsList = await getAllAccounts();
        // Create a map for quick lookup
        const map = new Map<number, Account>();
        accountsList.forEach((account) => {
          map.set(account.id, account);
        });
        setAccountsMap(map);
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    };
    fetchAccounts();
  }, []);

  // Fetch ATL records from API
  useEffect(() => {
    const fetchRecords = async () => {
      if (!aircraftId) return;

      setLoading(true);
      setError(null);
      try {
        const sortParam =
          sequenceSort === "asc" ? "sequence_no" : "-sequence_no";
        const response = await getAircraftTechnicalLogs(
          currentPage,
          itemsPerPage,
          searchQuery,
          aircraftId,
          sortParam
        );
        setFleetTimeRecords(response.items);
        setTotalRecords(response.total);
        setTotalPages(response.pages);
      } catch (err: any) {
        console.error("Error fetching ATL records:", err);
        setError("Failed to load fleet time records");
        setFleetTimeRecords([]);
      } finally {
        setTimeout(() => setLoading(false), 360);
      }
    };

    fetchRecords();
  }, [
    aircraftId,
    currentPage,
    itemsPerPage,
    searchQuery,
    refreshKey,
    sequenceSort,
  ]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paginatedRecords = fleetTimeRecords;

  const handleAddToReliability = (record: AircraftTechnicalLog) => {
    // This would typically send data to backend to create reliability record
    console.log("Adding record to reliability tracking:", record);
    alert(
      `Record #${record.sequenceNo ?? record.id} added to reliability tracking`
    );
  };

  const handleSeeReliability = (record: AircraftTechnicalLog) => {
    handleViewReliability(record.id);
  };

  const handleDeleteAtl = async (record: AircraftTechnicalLog) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete ATL Entry",
      html: `Are you sure you want to delete entry <strong>${
        record.sequenceNo ?? record.id
      }</strong>? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAircraftTechnicalLog(record.id);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "ATL entry has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      const msg =
        e?.response?.data?.detail ?? e?.message ?? "Failed to delete entry.";
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: msg,
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h2 className="text-gray-900 text-lg sm:text-xl">
              Operation Management
            </h2>
          </div>
        </div>
      </div>

      {/* Fleet Time Monitoring */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Fleet Time Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <div>
              <h3 className="text-gray-900 text-base sm:text-lg">
                Fleet Time Monitoring:{" "}
                <b>{aircraft?.registration || "Loading..."}</b>
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Model:{" "}
                {aircraft
                  ? `${aircraft.model || ""}`
                  : "Loading aircraft details..."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                onClick={() => setShowAddRecordModal(true)}
                className="px-3 sm:px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Record</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Current Tach</p>
              <p className="text-gray-900 text-2xl">
                {fleetTimeRecords.length > 0 &&
                fleetTimeRecords[0].tachometerEnd
                  ? `${fleetTimeRecords[0].tachometerEnd.toFixed(1)} Hrs`
                  : "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Total Flight Records</p>
              <p className="text-gray-900 text-2xl">{totalRecords} records</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Last Updated</p>
              <p className="text-gray-900 text-sm">
                {fleetTimeRecords.length > 0 && fleetTimeRecords[0].updatedAt
                  ? new Date(fleetTimeRecords[0].updatedAt).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )
                  : "-"}
              </p>
            </div>
          </div>

          {/* Fleet Time Records Section Title */}
          <div className="bg-blue-600 rounded px-5 py-3">
            <h4 className="text-white text-sm font-medium">
              Fleet Time Records
            </h4>
          </div>

          {/* Search Section + Group by */}
          <div>
            <h5 className="text-gray-700 text-sm font-medium mb-3">
              Search Entries
            </h5>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search by sequence number, tach time..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 bg-white text-sm text-gray-900 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="group-by"
                  className="text-gray-700 text-sm font-medium whitespace-nowrap"
                >
                  Group by
                </label>
                <select
                  id="group-by"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
                  className="px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 bg-white text-sm text-gray-900 min-w-[200px]"
                >
                  <option value="allColumns">All Columns</option>
                  <option value="fuelAndOilData">Fuel and Oil Data</option>
                  <option value="maintenancePlanning">
                    Maintenance Planning
                  </option>
                  <option value="reliabilityMonitoring">
                    Reliability Monitoring
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Fleet Time Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Spinner />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <p className="text-sm text-red-600 mb-4">{error}</p>
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      // Trigger refetch
                      const fetchRecords = async () => {
                        if (!aircraftId) return;
                        setLoading(true);
                        setError(null);
                        try {
                          const response = await getAircraftTechnicalLogs(
                            currentPage,
                            itemsPerPage,
                            searchQuery,
                            aircraftId
                          );
                          setFleetTimeRecords(response.items);
                          setTotalRecords(response.total);
                          setTotalPages(response.pages);
                        } catch (err: any) {
                          console.error("Error fetching ATL records:", err);
                          setError("Failed to load fleet time records");
                          setFleetTimeRecords([]);
                        } finally {
                          setTimeout(() => setLoading(false), 360);
                        }
                      };
                      fetchRecords();
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                {groupBy === "allColumns" && (
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <table className="min-w-full border-collapse table-fixed">
                        <thead>
                          <tr>
                            <th
                              rowSpan={2}
                              className={`${STICKY_SEQ_CLASS} cursor-pointer select-none hover:bg-gray-300 transition-colors`}
                              onClick={() => {
                                setSequenceSort((s) =>
                                  s === "asc" ? "desc" : "asc"
                                );
                                setCurrentPage(1);
                              }}
                              title={
                                sequenceSort === "asc"
                                  ? "Sort descending"
                                  : "Sort ascending"
                              }
                            >
                              <span className="flex items-center gap-1">
                                <b>SEQUENCE NO</b>
                                {sequenceSort === "asc" ? (
                                  <ChevronUp className="w-4 h-4 inline" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 inline" />
                                )}
                              </span>
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              NATURE OF
                              <br />
                              FLIGHT
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              NEXT INSP.
                              <br />
                              DATE
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              TACH TIME
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              OFF BLOCKS/ORIGIN
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ON BLOCKS/DESTINATION
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              Total Flight hours
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              NO. OF
                              <br />
                              LAND-
                              <br />
                              INGS
                            </th>
                            <th
                              colSpan={3}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              HOBBS METER
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              TACHOMETER
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              AIRFRAME
                            </th>
                            <th
                              colSpan={4}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ENGINE
                            </th>
                            <th
                              colSpan={4}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              PROPELLER
                            </th>
                            <th
                              colSpan={6}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              FUEL
                            </th>
                            <th
                              colSpan={3}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              OIL
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              REMARKS
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              REMARK PERSON
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ACTION/S
                              <br />
                              TAKEN
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ACTION TAKEN
                              <br />
                              PERSON
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              PARTS REMOVED
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              PARTS INSTALLED
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              NOMENCLATURE
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              ATA
                              <br />
                              CHAPTER
                            </th>
                            <th
                              colSpan={3}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              RETURN TO SERVICE
                            </th>
                            <th
                              colSpan={3}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"
                            >
                              PILOT'S ACCEPTANCE
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap"></th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-900 bg-gray-200 whitespace-nowrap"></th>
                          </tr>
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DATE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TIME (ZULU)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DATE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TIME (ZULU)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              START
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              END
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TOTAL
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TACH START
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TACH END
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              HRS
                              <br />
                              RUN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              AFTT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              HRS
                              <br />
                              RUN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TSN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TSO
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TBO
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              HRS
                              <br />
                              RUN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TSN
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TSO
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TBO
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              UPLIFT QTY
                              <br />
                              LEFT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              RIGHT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              PRIOR DEP.
                              <br />
                              LEFT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              RIGHT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              AFTER ON-BLKS
                              <br />
                              LEFT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              RIGHT
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              UPLIFT
                              <br />
                              QTY
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              PRIOR DEP.
                              <br />
                              QRE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              AFTER
                              <br />
                              ON-BLKS
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              P/N
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              S/N
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              P/N
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              S/N
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              NAME
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DATE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TIME (ZULU)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              NAME
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DATE
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              TIME (ZULU)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              WHITE ATL
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                              DFP
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {paginatedRecords.length === 0 ? (
                            <tr>
                              <td
                                colSpan={50}
                                className="px-6 py-12 text-center text-gray-500"
                              >
                                {searchQuery
                                  ? `No records found matching "${searchQuery}"`
                                  : "No records available"}
                              </td>
                            </tr>
                          ) : (
                            paginatedRecords.map((record) => (
                              <tr
                                key={record.id}
                                className="hover:bg-gray-50/50 transition-colors"
                              >
                                <td className={STICKY_SEQ_CELL_CLASS}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {record.sequenceNo || "-"}
                                    </span>
                                    <div className="flex items-center gap-1 text-blue-600 mt-1">
                                      <button
                                        onClick={() => {
                                          setSelectedEntry(record);
                                          setShowViewModal(true);
                                        }}
                                        className="hover:text-blue-700 hover:underline transition-colors text-xs"
                                        title="View"
                                      >
                                        View
                                      </button>
                                      <span className="text-gray-400">|</span>
                                      <button
                                        onClick={() => {
                                          setSelectedEntry(record);
                                          setShowEditModal(true);
                                        }}
                                        className="hover:text-blue-700 hover:underline transition-colors text-xs"
                                        title="Edit"
                                      >
                                        Edit
                                      </button>
                                      <span className="text-gray-400">|</span>
                                      <button
                                        onClick={() => handleDeleteAtl(record)}
                                        className="text-red-600 hover:underline text-xs"
                                        title="Delete"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.natureOfFlight || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.nextInspectionDue || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.tachTimeDue
                                    ? record.tachTimeDue.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.originDate
                                    ? new Date(record.originDate)
                                        .toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                        .replace(/ /g, "-")
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {formatTimeZulu(record.originTime)}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.destinationDate
                                    ? new Date(record.destinationDate)
                                        .toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                        })
                                        .replace(/ /g, "-")
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {formatTimeZulu(record.destinationTime)}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {computeTotalBlockTime(
                                    record.originTime,
                                    record.destinationTime
                                  )}
                                </td>

                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.numberOfLandings || "-"}
                                </td>

                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.hobbsMeterStart
                                    ? record.hobbsMeterStart.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.hobbsMeterEnd
                                    ? record.hobbsMeterEnd.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.hobbsMeterTotal
                                    ? record.hobbsMeterTotal.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.tachometerStart
                                    ? record.tachometerStart.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.tachometerEnd
                                    ? record.tachometerEnd.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.tachometerTotal
                                    ? record.tachometerTotal.toFixed(1)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.airframeRunTime != null
                                    ? String(record.airframeRunTime)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.airframeAftt != null
                                    ? String(record.airframeAftt)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.engineRunTime != null
                                    ? String(record.engineRunTime)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.engineTsn ?? "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.engineTso != null
                                    ? String(record.engineTso)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.engineTbo != null
                                    ? String(record.engineTbo)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.propellerRunTime != null
                                    ? String(record.propellerRunTime)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.propellerTsn != null
                                    ? String(record.propellerTsn)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.propellerTso != null
                                    ? String(record.propellerTso)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                                  {record.propellerTbo != null
                                    ? String(record.propellerTbo)
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftUpliftQty || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightUpliftQty || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftPriorDeparture || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightPriorDeparture || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyLeftAfterOnBlks || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.fuelQtyRightAfterOnBlks || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyUpliftQty || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyPriorDeparture || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.oilQtyAfterOnBlks || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.remarks || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.maintenanceFk &&
                                  accountsMap.has(record.maintenanceFk)
                                    ? `${
                                        accountsMap.get(record.maintenanceFk)!
                                          .fullName
                                      }-${
                                        accountsMap.get(record.maintenanceFk)!
                                          .licenseNo
                                      }`
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.actionsTaken || "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.maintenanceFk &&
                                  accountsMap.has(record.maintenanceFk)
                                    ? `${
                                        accountsMap.get(record.maintenanceFk)!
                                          .fullName
                                      }-${
                                        accountsMap.get(record.maintenanceFk)!
                                          .licenseNo
                                      }`
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.componentParts &&
                                  record.componentParts.length > 0
                                    ? (record.componentParts[0] as any)
                                        .removedPartNo || "-"
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.componentParts &&
                                  record.componentParts.length > 0
                                    ? (record.componentParts[0] as any)
                                        .removedSerialNo || "-"
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.componentParts &&
                                  record.componentParts.length > 0
                                    ? (record.componentParts[0] as any)
                                        .installedPartNo || "-"
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.componentParts &&
                                  record.componentParts.length > 0
                                    ? (record.componentParts[0] as any)
                                        .installedSerialNo || "-"
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.componentParts &&
                                  record.componentParts.length > 0
                                    ? record.componentParts[0].nomenclature ||
                                      "-"
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.componentParts &&
                                  record.componentParts.length > 0
                                    ? record.componentParts[0].ataChapter ||
                                      (record.componentParts[0] as any)
                                        .ata_chapter ||
                                      "-"
                                    : "-"}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.rtsSignedBy &&
                                  accountsMap.has(record.rtsSignedBy) ? (
                                    <>
                                      {
                                        accountsMap.get(record.rtsSignedBy)!
                                          .fullName
                                      }
                                      <br />
                                      {
                                        accountsMap.get(record.rtsSignedBy)!
                                          .licenseNo
                                      }
                                    </>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {record.rtsDate || "-"}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {formatTimeZulu(record.rtsTime)}
                                </td>
                                <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                                  {record.pilotAcceptedBy &&
                                  accountsMap.has(record.pilotAcceptedBy) ? (
                                    <>
                                      {
                                        accountsMap.get(record.pilotAcceptedBy)!
                                          .fullName
                                      }
                                      <br />
                                      {
                                        accountsMap.get(record.pilotAcceptedBy)!
                                          .licenseNo
                                      }
                                    </>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {record.pilotAcceptDate || "-"}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {formatTimeZulu(record.pilotAcceptTime)}
                                </td>
                                <td className="px-3 py-3 text-sm border-r border-gray-200 bg-white">
                                  {record.whiteAtl &&
                                  record.whiteAtl.trim() !== "" ? (
                                    <div className="flex flex-col gap-1">
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline text-left"
                                        onClick={() =>
                                          handleDownloadFile(
                                            "white_atl",
                                            record.whiteAtl!,
                                            record.whiteAtl!.split("/").pop() ||
                                              "white_atl"
                                          )
                                        }
                                      >
                                        <Download className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs">
                                          Download
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline text-left"
                                        onClick={() =>
                                          handleViewFile(
                                            "white_atl",
                                            record.whiteAtl!
                                          )
                                        }
                                      >
                                        <Eye className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs">View</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-900">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-sm bg-white">
                                  {record.dfp && record.dfp.trim() !== "" ? (
                                    <div className="flex flex-col gap-1">
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline text-left"
                                        onClick={() =>
                                          handleDownloadFile(
                                            "dfp",
                                            record.dfp!,
                                            record.dfp!.split("/").pop() ||
                                              "dfp"
                                          )
                                        }
                                      >
                                        <Download className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs">
                                          Download
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline text-left"
                                        onClick={() =>
                                          handleViewFile("dfp", record.dfp!)
                                        }
                                      >
                                        <Eye className="w-4 h-4 flex-shrink-0" />
                                        <span className="text-xs">View</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-900">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Fuel and Oil Data */}
                {groupBy === "fuelAndOilData" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className={STICKY_SEQ_CLASS}>ATL SEQ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NATURE OF FLIGHT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            OFF BLOCKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ON BLOCKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            TOTAL FLIGHT TIME
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            FUEL UPLIFT QTY (L) / (R)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            OIL UPLIFT QTY
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            REMARKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NAME AND LICENSE
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="px-5 py-8 text-center text-gray-500 text-sm"
                            >
                              No records
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className={STICKY_SEQ_CELL_CLASS}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {record.sequenceNo || "-"}
                                  </span>
                                  <div className="flex items-center gap-1 text-blue-600 mt-1">
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowViewModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      View
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowEditModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => handleDeleteAtl(record)}
                                      className="text-red-600 hover:underline text-xs"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.natureOfFlight || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.originDate
                                  ? new Date(record.originDate)
                                      .toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                      .replace(/ /g, "-")
                                  : "-"}
                                {record.originTime
                                  ? ` ${formatTimeZulu(record.originTime)}`
                                  : ""}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.destinationDate
                                  ? new Date(record.destinationDate)
                                      .toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                      .replace(/ /g, "-")
                                  : "-"}
                                {record.destinationTime
                                  ? ` ${formatTimeZulu(record.destinationTime)}`
                                  : ""}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {computeTotalBlockTime(
                                  record.originTime,
                                  record.destinationTime
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.fuelQtyLeftUpliftQty ?? "-"} /{" "}
                                {record.fuelQtyRightUpliftQty ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.oilQtyUpliftQty ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.remarks || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {record.maintenanceFk &&
                                accountsMap.has(record.maintenanceFk)
                                  ? `${
                                      accountsMap.get(record.maintenanceFk)!
                                        .fullName
                                    } - ${
                                      accountsMap.get(record.maintenanceFk)!
                                        .licenseNo
                                    }`
                                  : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Maintenance Planning */}
                {groupBy === "maintenancePlanning" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className={STICKY_SEQ_CLASS}>ATL SEQ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NATURE OF FLIGHT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            OFF BLOCKS / ON BLOCKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AIRFRAME (RUN / AFTT)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ENGINE (RUN / TSN / TSO / TBO)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PROPELLER (RUN / TSN / TSO / TBO)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-5 py-8 text-center text-gray-500 text-sm"
                            >
                              No records
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className={STICKY_SEQ_CELL_CLASS}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {record.sequenceNo || "-"}
                                  </span>
                                  <div className="flex items-center gap-1 text-blue-600 mt-1">
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowViewModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      View
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowEditModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => handleDeleteAtl(record)}
                                      className="text-red-600 hover:underline text-xs"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.natureOfFlight || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.originDate
                                  ? new Date(record.originDate)
                                      .toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                      .replace(/ /g, "-")
                                  : "-"}{" "}
                                /{" "}
                                {record.destinationDate
                                  ? new Date(record.destinationDate)
                                      .toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                      .replace(/ /g, "-")
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {getAirframeDisplay(record)}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {getEngineDisplay(record)}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {getPropellerDisplay(record)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Reliability Monitoring */}
                {groupBy === "reliabilityMonitoring" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className={STICKY_SEQ_CLASS}>ATL SEQ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NATURE OF FLIGHT
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            AIRFRAME (RUN / AFTT)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            TOTAL FLIGHT TIME
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            NO. OF LANDINGS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            REMARKS
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ACTION TAKEN
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PARTS REMOVED (P/N & S/N)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PARTS INSTALLED (P/N & S/N)
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            PART DESCRIPTION
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 whitespace-nowrap">
                            ATA CHAPTER
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={11}
                              className="px-5 py-8 text-center text-gray-500 text-sm"
                            >
                              No records
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className={STICKY_SEQ_CELL_CLASS}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {record.sequenceNo || "-"}
                                  </span>
                                  <div className="flex items-center gap-1 text-blue-600 mt-1">
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowViewModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      View
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(record);
                                        setShowEditModal(true);
                                      }}
                                      className="hover:underline text-xs"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button
                                      onClick={() => handleDeleteAtl(record)}
                                      className="text-red-600 hover:underline text-xs"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.natureOfFlight || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {getAirframeDisplay(record)}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {computeTotalBlockTime(
                                  record.originTime,
                                  record.destinationTime
                                )}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.numberOfLandings ?? "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.remarks || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.actionsTaken || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.componentParts &&
                                record.componentParts.length > 0
                                  ? `${
                                      (record.componentParts[0] as any)
                                        .removedPartNo ?? "-"
                                    } / ${
                                      (record.componentParts[0] as any)
                                        .removedSerialNo ?? "-"
                                    }`
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.componentParts &&
                                record.componentParts.length > 0
                                  ? `${
                                      (record.componentParts[0] as any)
                                        .installedPartNo ?? "-"
                                    } / ${
                                      (record.componentParts[0] as any)
                                        .installedSerialNo ?? "-"
                                    }`
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-sm border-r border-gray-200">
                                {record.componentParts &&
                                record.componentParts.length > 0
                                  ? record.componentParts[0].nomenclature || "-"
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-sm">
                                {record.componentParts &&
                                record.componentParts.length > 0
                                  ? record.componentParts[0].ataChapter ||
                                    (record.componentParts[0] as any)
                                      .ata_chapter ||
                                    "-"
                                  : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing{" "}
                {totalRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalRecords)} of{" "}
                {totalRecords} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded text-sm transition-colors ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Modal – CREATE */}
      <AddTechnicalLogbookEntryModal
        isOpen={showAddRecordModal}
        onClose={() => setShowAddRecordModal(false)}
        aircraftId={aircraftId}
        onSuccess={() => {
          setShowAddRecordModal(false);
          // Refresh the records list
          const fetchRecords = async () => {
            if (!aircraftId) return;
            setLoading(true);
            setError(null);
            try {
              const response = await getAircraftTechnicalLogs(
                currentPage,
                itemsPerPage,
                searchQuery,
                aircraftId
              );
              setFleetTimeRecords(response.items);
              setTotalRecords(response.total);
              setTotalPages(response.pages);
            } catch (err: any) {
              console.error("Error fetching ATL records:", err);
              setError("Failed to load fleet time records");
              setFleetTimeRecords([]);
            } finally {
              setTimeout(() => setLoading(false), 360);
            }
          };
          fetchRecords();
        }}
      />

      {/* Edit Entry Modal – READ + UPDATE */}
      {selectedEntry && (
        <EditTechnicalLogbookEntryModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEntry(null);
          }}
          entryId={selectedEntry.id}
          aircraftId={aircraftId}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedEntry(null);
            // Refresh the records list
            const fetchRecords = async () => {
              if (!aircraftId) return;
              setLoading(true);
              setError(null);
              try {
                const response = await getAircraftTechnicalLogs(
                  currentPage,
                  itemsPerPage,
                  searchQuery,
                  aircraftId
                );
                setFleetTimeRecords(response.items);
                setTotalRecords(response.total);
                setTotalPages(response.pages);
              } catch (err: any) {
                console.error("Error fetching ATL records:", err);
                setError("Failed to load fleet time records");
                setFleetTimeRecords([]);
              } finally {
                setTimeout(() => setLoading(false), 360);
              }
            };
            fetchRecords();
          }}
        />
      )}

      {/* View Entry Modal – READ */}
      {selectedEntry && (
        <ViewTechnicalLogbookEntryModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedEntry(null);
          }}
          entry={{
            id: selectedEntry.id,
            line: 0,
            seqNo: selectedEntry.sequenceNo || "",
            date:
              selectedEntry.originDate || selectedEntry.destinationDate || "",
            acReg: selectedEntry.aircraft?.registration || "",
            route: `${selectedEntry.originStation || ""} → ${
              selectedEntry.destinationStation || ""
            }`,
            fltTime: `${(
              selectedEntry.hobbsMeterTotal ||
              selectedEntry.tachometerTotal ||
              0
            ).toFixed(2)}h`,
            pilot: selectedEntry.remarks?.split("\n")[0] || "N/A",
            status: "Serviceable",
          }}
          fullEntry={selectedEntry}
        />
      )}

      {/* File View Modal – view uploaded file (WHITE ATL / DFP) */}
      {showFileViewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={closeFileViewModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-900">
                View file
              </span>
              <button
                type="button"
                onClick={closeFileViewModal}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 min-h-[320px] flex items-center justify-center bg-gray-50">
              {fileViewLoading && (
                <div className="flex flex-col items-center gap-2 text-gray-500">
                  <Spinner />
                  <span className="text-sm">Loading file…</span>
                </div>
              )}
              {fileViewError && !fileViewLoading && (
                <div className="text-center text-red-600 text-sm">
                  {fileViewError}
                </div>
              )}
              {fileViewBlobUrl && !fileViewLoading && !fileViewError && (
                <>
                  {/* JPG, JPEG, PNG, GIF, WebP – image preview */}
                  {(fileViewMimeType?.startsWith("image/") ||
                    fileViewMimeType === "image/jpeg" ||
                    fileViewMimeType === "image/jpg") && (
                    <img
                      src={fileViewBlobUrl}
                      alt="File preview"
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  )}
                  {/* PDF – iframe preview */}
                  {(fileViewMimeType === "application/pdf" ||
                    fileViewMimeType?.includes("pdf")) && (
                    <iframe
                      src={fileViewBlobUrl}
                      title="File preview"
                      className="w-full h-[70vh] border-0 rounded"
                    />
                  )}
                  {fileViewBlobUrl &&
                    !fileViewMimeType?.startsWith("image/") &&
                    fileViewMimeType !== "image/jpeg" &&
                    fileViewMimeType !== "image/jpg" &&
                    fileViewMimeType !== "application/pdf" &&
                    !fileViewMimeType?.includes("pdf") && (
                      <div className="text-center text-gray-600 text-sm">
                        <p className="mb-2">
                          Preview not available for this file type.
                        </p>
                        <a
                          href={fileViewBlobUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Open in new tab / Download
                        </a>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
