import { useState } from "react";
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
} from "lucide-react";

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

  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [whiteAtlFile, setWhiteAtlFile] = useState<File | null>(null);
  const [dfpFile, setDfpFile] = useState<File | null>(null);

  // Mock data for fleet time records
  const fleetTimeRecords: FleetTimeRecord[] = Array.from(
    { length: 11 },
    (_, i) => ({
      id: 24756 + i,
      seqNo: `${24756 + i}`,
      natureOfFlight: i % 3 === 0 ? "EOR" : i % 3 === 1 ? "ME" : "VE",
      date: "18-Sep-25",
      tachStart: 7890.4,
      tachEnd: 7890.5,
      airframe: {
        hrsTime: 0.1,
        aptt: 7891.1,
        hrsTimeEnd: 0.1,
      },
      engine: {
        hrsTime: 0,
        tsn: 1544.9,
        tso: 455.1,
        tbo: 0,
        hrsTimeEnd: 0.1,
      },
      propeller: {
        hrsTime: 0,
        tsn: 4807.4,
        tso: 1544.9,
        tbo: 455.1,
      },
      whiteAtl: i % 3 === 0 ? "WHITE_ATL_2024_001.pdf" : null,
      dfp: i % 3 === 1 ? "DFP_2024_001.pdf" : null,
      // Some records have reliability data, some don't
      reliability:
        i % 2 === 0
          ? {
              dispatchReliability: 98.5 - i * 0.3,
              mtbf: 450 + i * 10,
              unscheduledMaintenance: 3.2 + i * 0.2,
              aogEvents: Math.floor(i / 2),
            }
          : undefined,
    })
  );

  const totalPages = Math.ceil(fleetTimeRecords.length / itemsPerPage);
  const paginatedRecords = fleetTimeRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            <p className="text-gray-500 mt-1 text-sm">
              Aircraft ID: {aircraftId}
            </p>
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
                RP-C12 - Fleet Time Monitoring
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Cessna 172S | S/N: 172S-8958
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
              <p className="text-gray-900 text-2xl">7343.3 Hrs</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Total Flight Records</p>
              <p className="text-gray-900 text-2xl">
                {fleetTimeRecords.length} records
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-gray-500 text-sm mb-2">Last Updated</p>
              <p className="text-gray-900 text-sm">Nov 14, 2024</p>
            </div>
          </div>

          {/* Flight Time Records Header */}
          <div>
            <h4 className="text-gray-900 mb-4">Flight Time Records</h4>
          </div>

          {/* Fleet Time Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      className="px-3 py-3 text-left text-xs text-gray-900 border-r border-gray-300 bg-gray-50"
                    >
                      SEQ NO.
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-3 text-left text-xs text-gray-900 border-r border-gray-300 bg-gray-50"
                    >
                      NATURE OF
                      <br />
                      FLIGHT
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-3 text-left text-xs text-gray-900 border-r border-gray-300 bg-gray-50"
                    >
                      DATE
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-3 text-left text-xs text-gray-900 border-r border-gray-300 bg-gray-50"
                    >
                      TACH
                      <br />
                      START
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-3 text-left text-xs text-gray-900 border-r border-amber-300 bg-gray-50"
                    >
                      TACH
                      <br />
                      END
                    </th>
                    <th
                      colSpan={3}
                      className="px-3 py-2 text-center text-xs text-gray-900 border-r border-blue-300 bg-amber-100"
                    >
                      AIRFRAME
                    </th>
                    <th
                      colSpan={5}
                      className="px-3 py-2 text-center text-xs text-gray-900 border-r border-cyan-300 bg-blue-400 text-white"
                    >
                      ENGINE
                    </th>
                    <th
                      colSpan={4}
                      className="px-3 py-2 text-center text-xs text-gray-900 border-r border-gray-300 bg-cyan-400"
                    >
                      PROPELLER
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-3 text-left text-xs text-gray-900 border-r border-gray-300 bg-gray-50"
                    >
                      WHITE ATL.
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-3 text-left text-xs text-gray-900 border-r border-gray-300 bg-gray-50"
                    >
                      DFP
                    </th>
                    <th
                      rowSpan={2}
                      className="px-3 py-3 text-left text-xs text-gray-900 bg-gray-50"
                    >
                      RELIABILITY
                    </th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-amber-300 bg-amber-100">
                      MIN
                      <br />
                      RUN
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-amber-300 bg-amber-100">
                      AFTT
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-blue-300 bg-amber-100">
                      MIN
                      <br />
                      RUN
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-blue-300 bg-blue-400 text-white">
                      MIN
                      <br />
                      RUN
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-blue-300 bg-blue-400 text-white">
                      TSN
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-blue-300 bg-blue-400 text-white">
                      TSO
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-blue-300 bg-blue-400 text-white">
                      TBO
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-cyan-300 bg-blue-400 text-white">
                      MIN
                      <br />
                      RUN
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-cyan-300 bg-cyan-400">
                      MIN
                      <br />
                      RUN
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-cyan-300 bg-cyan-400">
                      TSN
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-cyan-300 bg-cyan-400">
                      TSO
                    </th>
                    <th className="px-3 py-2 text-left text-xs text-gray-900 border-r border-gray-300 bg-cyan-400">
                      TBO
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200">
                        {record.seqNo}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200">
                        {record.natureOfFlight}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200">
                        {record.date}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200">
                        {record.tachStart}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200">
                        {record.tachEnd}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-amber-50">
                        {record.airframe.hrsTime}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-amber-50">
                        {record.airframe.aptt}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-amber-50">
                        {record.airframe.hrsTimeEnd}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-blue-50">
                        {record.engine.hrsTime}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-blue-50">
                        {record.engine.tsn}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-blue-50">
                        {record.engine.tso}
                      </td>
                      <td className="px-3 py-3 text-red-600 text-sm border-r border-gray-200 bg-blue-50">
                        {record.engine.tbo}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-blue-50">
                        {record.engine.hrsTimeEnd}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-cyan-50">
                        {record.propeller.hrsTime}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-cyan-50">
                        {record.propeller.tsn}
                      </td>
                      <td className="px-3 py-3 text-gray-900 text-sm border-r border-gray-200 bg-cyan-50">
                        {record.propeller.tso}
                      </td>
                      <td className="px-3 py-3 text-red-600 text-sm border-r border-gray-200 bg-cyan-50">
                        {record.propeller.tbo}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {record.whiteAtl ? (
                          <a
                            href="#"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              alert("File download would start here");
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="text-xs">View</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        {record.dfp ? (
                          <a
                            href="#"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              alert("File download would start here");
                            }}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="text-xs">View</span>
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {record.reliability ? (
                          <button
                            onClick={() => handleSeeReliability(record)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-xs transition-colors"
                          >
                            See Reliability
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAddToReliability(record)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs transition-colors"
                          >
                            Add to Reliability
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing 1-{Math.min(itemsPerPage, fleetTimeRecords.length)} of{" "}
                {fleetTimeRecords.length} records
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === page
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                  className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Record Modal */}
      {showAddRecordModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-modal-overlay">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-modal-content">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-gray-900 text-base sm:text-lg">
                  Add Flight Time Record
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  Enter flight time and component hours
                </p>
              </div>
              <button
                onClick={() => setShowAddRecordModal(false)}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 space-y-4 sm:space-y-5 lg:space-y-6 bg-gray-50">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-gray-900 text-sm sm:text-base">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Sequence Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 24756"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-gray-600 text-sm mb-2">
                      Nature of Flight <span className="text-red-500">*</span>
                    </label>
                    <select className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 appearance-none cursor-pointer shadow-sm">
                      <option value="">Select nature of flight</option>
                      <option value="EOR">EOR</option>
                      <option value="ME">ME</option>
                      <option value="VE">VE</option>
                      <option value="Training">Training</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Charter">Charter</option>
                      <option value="Ferry">Ferry</option>
                      <option value="Test">Test Flight</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-[2.6rem] w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Tach Information */}
              <div className="space-y-4">
                <h4 className="text-gray-900 text-sm sm:text-base">
                  Tachometer Reading
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Tach Start
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 7890.4"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Tach End
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 7890.5"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Flight Hours
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Auto-calculated"
                      disabled
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Airframe Information */}
              <div className="border-l-[3px] border-yellow-400 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                <h4 className="text-gray-900 text-sm sm:text-base">
                  Airframe Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Hours Time
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      APTT
                      <span className="text-gray-400 text-xs ml-1.5">
                        (Airframe Potential Total Time)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Hours Time End
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Engine Information */}
              <div className="border-l-[3px] border-blue-400 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                <h4 className="text-gray-900 text-sm sm:text-base">
                  Engine Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Hours Time
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      TSN
                      <span className="text-gray-400 text-xs ml-1.5">
                        (Time Since New)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      TSO
                      <span className="text-gray-400 text-xs ml-1.5">
                        (Time Since Overhaul)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      TBO
                      <span className="text-gray-400 text-xs ml-1.5">
                        (Time Between Overhaul)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Hours Time End
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Propeller Information */}
              <div className="border-l-[3px] border-green-400 bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                <h4 className="text-gray-900 text-sm sm:text-base">
                  Propeller Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Hours Time
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      TSN
                      <span className="text-gray-400 text-xs ml-1.5">
                        (Time Since New)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      TSO
                      <span className="text-gray-400 text-xs ml-1.5">
                        (Time Since Overhaul)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      TBO
                      <span className="text-gray-400 text-xs ml-1.5">
                        (Time Between Overhaul)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Documents */}
              <div className="bg-white rounded-lg px-4 sm:px-5 lg:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 shadow-sm">
                <h4 className="text-gray-900 text-sm sm:text-base">
                  Additional Documents
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      WHITE ATL (Attachment)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="white-atl-file"
                        onChange={(e) =>
                          setWhiteAtlFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="white-atl-file"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span
                          className={
                            whiteAtlFile ? "text-gray-900" : "text-gray-400"
                          }
                        >
                          {whiteAtlFile
                            ? whiteAtlFile.name
                            : "Choose file (optional)"}
                        </span>
                        <Upload className="w-4 h-4 text-gray-400" />
                      </label>
                    </div>
                    {whiteAtlFile && (
                      <button
                        onClick={() => setWhiteAtlFile(null)}
                        className="text-xs text-red-600 hover:text-red-700 mt-1"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      DFP (Attachment)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="dfp-file"
                        onChange={(e) =>
                          setDfpFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="dfp-file"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span
                          className={
                            dfpFile ? "text-gray-900" : "text-gray-400"
                          }
                        >
                          {dfpFile ? dfpFile.name : "Choose file (optional)"}
                        </span>
                        <Upload className="w-4 h-4 text-gray-400" />
                      </label>
                    </div>
                    {dfpFile && (
                      <button
                        onClick={() => setDfpFile(null)}
                        className="text-xs text-red-600 hover:text-red-700 mt-1"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0 bg-white">
              <p className="text-gray-400 text-sm">
                <span className="text-red-500">*</span> Required fields
              </p>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setShowAddRecordModal(false)}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 text-sm"
                >
                  Cancel
                </button>
                <button className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm text-sm">
                  Save Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
