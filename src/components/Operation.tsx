import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Printer,
  Download,
  ChevronDown,
  X,
  Upload,
  FileText,
  Search,
  Pencil,
} from "lucide-react";
import { AddTechnicalLogbookEntryModal } from "./AddTechnicalLogbookEntryModal";
import { ViewTechnicalLogbookEntryModal } from "./ViewTechnicalLogbookEntryModal";
import {
  getAircraftTechnicalLogs,
  AircraftTechnicalLog,
} from "../api/aircraftTechnicalLogApi";
import { getAircraftById } from "../api/aircraftApi";
import apiClient from "../api/index";
import { Spinner } from "./ui/spinner";
import { Aircraft } from "../types/Aircraft";
import { toCamel, formatTimeZulu } from "../utility/utils";
import { getAllAccounts, Account } from "../api/accountApi";

interface FleetTimeRecord {
  id: number;
  seqNo: string;
  natureOfFlight: string;
  date: string;
  tachStart: number;
  tachEnd: number;
  airframe: {
    hrsTime: number;
    aptt: number;
    hrsTimeEnd: number;
  };
  engine: {
    hrsTime: number;
    tsn: number;
    tso: number;
    tbo: number;
    hrsTimeEnd: number;
  };
  propeller: {
    hrsTime: number;
    tsn: number;
    tso: number;
    tbo: number;
  };
  whiteAtl: string | null;
  dfp: string | null;
  pilotAcceptDate?: string | null;
  pilotAcceptTime?: string | null;
  reliability?: {
    dispatchReliability: number;
    mtbf: number;
    unscheduledMaintenance: number;
    aogEvents: number;
  };
}

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
      alert(err?.response?.data?.detail || err?.message || "Failed to download file.");
    }
  };

  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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

  type GroupBy = "all" | "fuelAndOil" | "maintenancePlanning" | "reliabilityMonitoring";
  const [groupBy, setGroupBy] = useState<GroupBy>("all");

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
  }, [aircraftId, currentPage, itemsPerPage, searchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paginatedRecords = fleetTimeRecords;

  const handleAddToReliability = (record: FleetTimeRecord) => {
    // This would typically send data to backend to create reliability record
    console.log("Adding record to reliability tracking:", record);
    alert(`Record #${record.seqNo} added to reliability tracking`);
  };

  const handleSeeReliability = (record: FleetTimeRecord) => {
    handleViewReliability(record.id);
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

          {/* Search and Group-by Section */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1">
              <h5 className="text-gray-700 text-sm font-medium mb-3">
                Search Entries
              </h5>
              <div className="relative">
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
            </div>
            <div className="sm:w-56">
              <label htmlFor="operation-group-by" className="block text-gray-700 text-sm font-medium mb-2">
                Group by
              </label>
              <select
                id="operation-group-by"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="all">All Columns</option>
                <option value="fuelAndOil">Fuel and Oil Data</option>
                <option value="maintenancePlanning">Maintenance Planning</option>
                <option value="reliabilityMonitoring">Reliability Monitoring</option>
              </select>
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
                {groupBy === "all" && (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th
                          rowSpan={2}
                          className="px-3 py-3 text-left text-xs font-medium text-gray-900 border-r border-gray-300 bg-gray-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[140px] w-[140px]"
                        >
                          <b>SEQUENCE NO</b>
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
                          TOTAL
                          <br />
                          BLOCK
                          <br />
                          TIME
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
                          colSpan={3}
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
                          colSpan={3}
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
                          PART DESCRIPTION
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
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-gray-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium">
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
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white whitespace-nowrap">
                              {record.natureOfFlight}
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
                              {record.hobbsMeterTotal
                                ? `${record.hobbsMeterTotal.toFixed(1)} hr`
                                : "-"}
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
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
                            </td>
                            <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-white">
                              -
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
                                ? record.componentParts[0].nomenclature || "-"
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
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline"
                                  onClick={() =>
                                    handleDownloadFile(
                                      "white_atl",
                                      record.whiteAtl!,
                                      record.whiteAtl!.split("/").pop() || "white_atl"
                                    )
                                  }
                                >
                                  <Download className="w-4 h-4" />
                                  <span className="text-xs">Download</span>
                                </button>
                              ) : (
                                <span className="text-gray-900">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-sm bg-white">
                              {record.dfp && record.dfp.trim() !== "" ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors underline"
                                  onClick={() =>
                                    handleDownloadFile(
                                      "dfp",
                                      record.dfp!,
                                      record.dfp!.split("/").pop() || "dfp"
                                    )
                                  }
                                >
                                  <Download className="w-4 h-4" />
                                  <span className="text-xs">Download</span>
                                </button>
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

                {/* Fuel and Oil Data view */}
                {groupBy === "fuelAndOil" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap sticky left-0 z-30 bg-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[140px] w-[140px]">ATL SEQ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">NATURE OF FLIGHT</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">OFF BLOCKS</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">ON BLOCKS</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">TOTAL FLIGHT TIME</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">FUEL UPLIFT QTY (L)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">FUEL UPLIFT QTY (R)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">OIL UPLIFT QTY</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">REMARKS</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-gray-300 whitespace-nowrap">NAME AND LICENSE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                              {searchQuery ? `No records found matching "${searchQuery}"` : "No records available"}
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 border-r border-gray-200 font-medium sticky left-0 z-20 bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <div className="flex flex-col">
                                  <span>{record.sequenceNo || "-"}</span>
                                  <div className="flex items-center gap-1 text-blue-600 mt-0.5 text-xs">
                                    <button type="button" onClick={() => { setSelectedEntry(record); setShowViewModal(true); }} className="hover:underline">View</button>
                                    <span className="text-gray-400">|</span>
                                    <button type="button" onClick={() => { setSelectedEntry(record); setShowEditModal(true); }} className="hover:underline">Edit</button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">{record.natureOfFlight || "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {record.originDate ? new Date(record.originDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-") : "-"} {formatTimeZulu(record.originTime)}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {record.destinationDate ? new Date(record.destinationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-") : "-"} {formatTimeZulu(record.destinationTime)}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {record.hobbsMeterTotal ? `${record.hobbsMeterTotal.toFixed(1)} hr` : record.tachometerTotal ? `${record.tachometerTotal.toFixed(1)} hr` : "-"}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200">{record.fuelQtyLeftUpliftQty ?? "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200">{record.fuelQtyRightUpliftQty ?? "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200">{record.oilQtyUpliftQty ?? "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200">{record.remarks || "-"}</td>
                              <td className="px-3 py-2">
                                {record.maintenanceFk && accountsMap.has(record.maintenanceFk)
                                  ? `${accountsMap.get(record.maintenanceFk)!.fullName} - ${accountsMap.get(record.maintenanceFk)!.licenseNo}` : "-"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Maintenance Planning view */}
                {groupBy === "maintenancePlanning" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap sticky left-0 z-30 bg-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[140px] w-[140px]">ATL SEQ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">NATURE OF FLIGHT</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">OFF BLOCKS</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">ON BLOCKS</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">AIRFRAME (RUN / AFTT)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">ENGINE (RUN / TSN / TSO / TBO)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-gray-300 whitespace-nowrap">PROPELLER (RUN / TSN / TSO / TBO)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                              {searchQuery ? `No records found matching "${searchQuery}"` : "No records available"}
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 border-r border-gray-200 font-medium sticky left-0 z-20 bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <div className="flex flex-col">
                                  <span>{record.sequenceNo || "-"}</span>
                                  <div className="flex items-center gap-1 text-blue-600 mt-0.5 text-xs">
                                    <button type="button" onClick={() => { setSelectedEntry(record); setShowViewModal(true); }} className="hover:underline">View</button>
                                    <span className="text-gray-400">|</span>
                                    <button type="button" onClick={() => { setSelectedEntry(record); setShowEditModal(true); }} className="hover:underline">Edit</button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">{record.natureOfFlight || "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {record.originDate ? new Date(record.originDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-") : "-"} {formatTimeZulu(record.originTime)}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {record.destinationDate ? new Date(record.destinationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-") : "-"} {formatTimeZulu(record.destinationTime)}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {(() => {
                                  const af = (record as any).airframe;
                                  const run = af?.hrsTime ?? (record as any).airframeRunTime;
                                  const aftt = af?.aptt ?? (record as any).airframeAftt ?? record.airframeTotalTime;
                                  return run != null || aftt != null ? `Run: ${run ?? "-"} / AFTT: ${aftt ?? "-"}` : "-";
                                })()}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {(() => {
                                  const eng = (record as any).engine;
                                  if (!eng && (record as any).engineTotalTime == null) return "-";
                                  return `Run: ${eng?.hrsTime ?? (record as any).engineRun ?? "-"} / TSN: ${eng?.tsn ?? "-"} / TSO: ${eng?.tso ?? "-"} / TBO: ${eng?.tbo ?? "-"}`;
                                })()}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                {(() => {
                                  const prop = (record as any).propeller;
                                  if (!prop && (record as any).propellerTotalTime == null) return "-";
                                  return `Run: ${prop?.hrsTime ?? (record as any).propellerRun ?? "-"} / TSN: ${prop?.tsn ?? "-"} / TSO: ${prop?.tso ?? "-"} / TBO: ${prop?.tbo ?? "-"}`;
                                })()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Reliability Monitoring view */}
                {groupBy === "reliabilityMonitoring" && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap sticky left-0 z-30 bg-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[140px] w-[140px]">ATL SEQ</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">NATURE OF FLIGHT</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">AIRFRAME (RUN / AFTT)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">TOTAL FLIGHT TIME</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">NO. OF LANDINGS</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">REMARKS</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">ACTION TAKEN</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">PARTS REMOVED (P/N & S/N)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">PARTS INSTALLED (P/N & S/N)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-r border-gray-300 whitespace-nowrap">PART DESCRIPTION</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 border-gray-300 whitespace-nowrap">ATA CHAPTER</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {paginatedRecords.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                              {searchQuery ? `No records found matching "${searchQuery}"` : "No records available"}
                            </td>
                          </tr>
                        ) : (
                          paginatedRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50/50">
                              <td className="px-3 py-2 border-r border-gray-200 font-medium sticky left-0 z-20 bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <div className="flex flex-col">
                                  <span>{record.sequenceNo || "-"}</span>
                                  <div className="flex items-center gap-1 text-blue-600 mt-0.5 text-xs">
                                    <button type="button" onClick={() => { setSelectedEntry(record); setShowViewModal(true); }} className="hover:underline">View</button>
                                    <span className="text-gray-400">|</span>
                                    <button type="button" onClick={() => { setSelectedEntry(record); setShowEditModal(true); }} className="hover:underline">Edit</button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">{record.natureOfFlight || "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {(() => {
                                  const af = (record as any).airframe;
                                  const run = af?.hrsTime ?? (record as any).airframeRunTime;
                                  const aftt = af?.aptt ?? (record as any).airframeAftt ?? record.airframeTotalTime;
                                  return run != null || aftt != null ? `Run: ${run ?? "-"} / AFTT: ${aftt ?? "-"}` : "-";
                                })()}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200 whitespace-nowrap">
                                {record.hobbsMeterTotal ? `${record.hobbsMeterTotal.toFixed(1)} hr` : record.tachometerTotal ? `${record.tachometerTotal.toFixed(1)} hr` : "-"}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200">{record.numberOfLandings ?? "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200">{record.remarks || "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200">{record.actionsTaken || "-"}</td>
                              <td className="px-3 py-2 border-r border-gray-200">
                                {record.componentParts?.length
                                  ? (record.componentParts[0] as any)?.removedPartNo || (record.componentParts[0] as any)?.removedSerialNo
                                    ? `${(record.componentParts[0] as any).removedPartNo ?? ""} / ${(record.componentParts[0] as any).removedSerialNo ?? ""}`.trim() || "-"
                                    : "-"
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200">
                                {record.componentParts?.length
                                  ? (record.componentParts[0] as any)?.installedPartNo || (record.componentParts[0] as any)?.installedSerialNo
                                    ? `${(record.componentParts[0] as any).installedPartNo ?? ""} / ${(record.componentParts[0] as any).installedSerialNo ?? ""}`.trim() || "-"
                                    : "-"
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 border-r border-gray-200">
                                {record.componentParts?.length ? record.componentParts[0].nomenclature || "-" : "-"}
                              </td>
                              <td className="px-3 py-2">
                                {record.componentParts?.length
                                  ? record.componentParts[0].ataChapter ?? (record.componentParts[0] as any).ata_chapter ?? "-" : "-"}
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

      {/* Add Record Modal */}
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

      {/* View Entry Modal */}
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

      {/* Edit Entry Modal */}
      <AddTechnicalLogbookEntryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEntry(null);
        }}
        editEntry={selectedEntry}
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
    </div>
  );
}
