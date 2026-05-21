import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Download,
  Plus,
  X,
  Filter,
  ChevronDown,
} from "lucide-react";
import { formatTimeZulu } from "../utility/utils";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { PageSizeSelect } from "./ui/DataTablePagination";

interface ReliabilityRecord {
  atlSeqNo: string;
  dateStarted: string;
  timeStarted: string;
  dateReleased: string;
  timeReleased: string;
  actionTaken: string;
  partsRemoved: {
    pn1: string;
    sn1: string;
    pn2: string;
  };
  partsInstalled: {
    sn: string;
    pn1: string;
    sn2: string;
  };
  remarks: string;
}

export function ReliabilityMonitoring() {
  const { id, recordId } = useParams<{ id: string; recordId: string }>();
  const navigate = useNavigate();
  const { canCreate } = useUserPermissions();
  const aircraftId = parseInt(id || "1");
  const recordIdNum = parseInt(recordId || "1");

  const handleBack = () => {
    navigate(`/profile/${id}/operation`);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterMonth, setFilterMonth] = useState("April");
  const [filterYear, setFilterYear] = useState("2023");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    atlSeqNo: "",
    workStartedDate: "",
    workStartedTime: "",
    workReleasedDate: "",
    workReleasedTime: "",
    actionTaken: "",
    part1PN: "",
    part1SN: "",
    part2PN: "",
    part2SN: "",
    installedPN: "",
    installedSN: "",
    remarks: "",
  });

  // Mock data - would come from API based on aircraftId and recordId
  const aircraftReg = "CESSNA 172R";
  const serialNumber = "17246830";
  const totalRecords = 10;
  const lastUpdate = "20-Sep-25";

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    console.log("Submitting form data:", formData);
    // Here you would send data to backend
    setShowAddModal(false);
    // Reset form
    setFormData({
      atlSeqNo: "",
      workStartedDate: "",
      workStartedTime: "",
      workReleasedDate: "",
      workReleasedTime: "",
      actionTaken: "",
      part1PN: "",
      part1SN: "",
      part2PN: "",
      part2SN: "",
      installedPN: "",
      installedSN: "",
      remarks: "",
    });
  };

  const reliabilityRecords: ReliabilityRecord[] = [
    {
      atlSeqNo: "24780",
      dateStarted: "20-Sep-25",
      timeStarted: "810",
      dateReleased: "20-Sep-25",
      timeReleased: "840",
      actionTaken: "BRAKE LINING BACK PLATE STUD WORN OUT",
      partsRemoved: {
        pn1: "66-10",
        sn1: "NON",
        pn2: "66-10",
      },
      partsInstalled: {
        sn: "51116-3B",
        pn1: "NON",
        sn2: "CESSNA STUD",
      },
      remarks: "BRAKE LINING (LH)",
    },
    {
      atlSeqNo: "24828",
      dateStarted: "5-Sep-25",
      timeStarted: "",
      dateReleased: "5-Sep-25",
      timeReleased: "",
      actionTaken: "1 PC WASHING COWL STUD",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "51116-3B",
        pn1: "NON",
        sn2: "CESSNA STUD",
      },
      remarks:
        "PERFORMED INSTALLATION OF UPPER COWL STUD DUE TO WEARING, OTHER STUD",
    },
    {
      atlSeqNo: "24769",
      dateStarted: "",
      timeStarted: "",
      dateReleased: "",
      timeReleased: "",
      actionTaken: "",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "",
        pn1: "",
        sn2: "",
      },
      remarks: "",
    },
    {
      atlSeqNo: "24760",
      dateStarted: "",
      timeStarted: "",
      dateReleased: "",
      timeReleased: "",
      actionTaken: "",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "",
        pn1: "",
        sn2: "",
      },
      remarks: "",
    },
    {
      atlSeqNo: "24761",
      dateStarted: "",
      timeStarted: "",
      dateReleased: "",
      timeReleased: "",
      actionTaken: "",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "",
        pn1: "",
        sn2: "",
      },

      remarks: "",
    },
    {
      atlSeqNo: "24762",
      dateStarted: "",
      timeStarted: "",
      dateReleased: "",
      timeReleased: "",
      actionTaken: "",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "",
        pn1: "",
        sn2: "",
      },
      remarks: "",
    },
    {
      atlSeqNo: "24763",
      dateStarted: "",
      timeStarted: "",
      dateReleased: "",
      timeReleased: "",
      actionTaken: "",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "",
        pn1: "",
        sn2: "",
      },
      remarks: "",
    },
    {
      atlSeqNo: "24764",
      dateStarted: "",
      timeStarted: "",
      dateReleased: "",
      timeReleased: "",
      actionTaken: "",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "",
        pn1: "",
        sn2: "",
      },
      remarks: "",
    },
    {
      atlSeqNo: "24765",
      dateStarted: "",
      timeStarted: "",
      dateReleased: "",
      timeReleased: "",
      actionTaken: "",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "",
        pn1: "",
        sn2: "",
      },
      remarks: "",
    },
    {
      atlSeqNo: "24766",
      dateStarted: "",
      timeStarted: "",
      dateReleased: "",
      timeReleased: "",
      actionTaken: "",
      partsRemoved: {
        pn1: "",
        sn1: "",
        pn2: "",
      },
      partsInstalled: {
        sn: "",
        pn1: "",
        sn2: "",
      },
      remarks: "",
    },
  ];

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to List</span>
          </button>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            {canCreate("operation") && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add New Record
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-gray-900">Reliability Monitoring</h1>
          <p className="text-gray-500 text-sm">
            {aircraftReg} | S/N: {serialNumber}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-500 text-sm mb-1">Aircraft</p>
            <p className="text-gray-900">{aircraftReg}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-500 text-sm mb-1">Total Records</p>
            <p className="text-gray-900">{totalRecords}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-500 text-sm mb-1">Last Update</p>
            <p className="text-gray-900">{lastUpdate}</p>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Table Header with Filters */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-900">Reliability Monitoring Records</h2>
            </div>

            {/* Filters Row */}
            <div className="flex items-center justify-between">
              {/* Left: Filters */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm">Filter:</span>
                </div>

                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-no-repeat bg-right"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundPosition: "right 8px center",
                  }}
                >
                  <option>January</option>
                  <option>February</option>
                  <option>March</option>
                  <option>April</option>
                  <option>May</option>
                  <option>June</option>
                  <option>July</option>
                  <option>August</option>
                  <option>September</option>
                  <option>October</option>
                  <option>November</option>
                  <option>December</option>
                </select>

                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-no-repeat bg-right"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundPosition: "right 8px center",
                  }}
                >
                  <option>2025</option>
                  <option>2024</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                </select>
              </div>

              <PageSizeSelect
                value={itemsPerPage}
                options={[10, 25, 50]}
                onChange={setItemsPerPage}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-300">
                  <th className="px-4 py-3.5 text-left text-gray-900 text-xs whitespace-nowrap border-r border-gray-200">
                    ATL. SEQ NO.
                  </th>
                  <th className="px-4 py-3.5 text-left text-gray-900 text-xs whitespace-nowrap border-r border-gray-200">
                    DATE STARTED
                  </th>
                  <th className="px-4 py-3.5 text-left text-gray-900 text-xs whitespace-nowrap border-r border-gray-200">
                    TIME STARTED
                  </th>
                  <th className="px-4 py-3.5 text-left text-gray-900 text-xs whitespace-nowrap border-r border-gray-200">
                    DATE RELEASED
                  </th>
                  <th className="px-4 py-3.5 text-left text-gray-900 text-xs whitespace-nowrap border-r border-gray-200">
                    TIME RELEASED
                  </th>
                  <th className="px-4 py-3.5 text-left text-gray-900 text-xs whitespace-nowrap border-r border-gray-200">
                    ACTION TAKEN
                  </th>
                  <th
                    className="px-4 py-3.5 text-center text-gray-900 text-xs border-r border-gray-300 bg-blue-50/50"
                    colSpan={3}
                  >
                    <div className="mb-1.5">PARTS REMOVED</div>
                    <div className="grid grid-cols-3 gap-px">
                      <div className="border-r border-gray-200 pr-2">P/N</div>
                      <div className="border-r border-gray-200 pr-2">S/N</div>
                      <div>P/N</div>
                    </div>
                  </th>
                  <th
                    className="px-4 py-3.5 text-center text-gray-900 text-xs border-r border-gray-300 bg-orange-50/50"
                    colSpan={3}
                  >
                    <div className="mb-1.5">PARTS INSTALLED</div>
                    <div className="grid grid-cols-3 gap-px">
                      <div className="border-r border-gray-200 pr-2">S/N</div>
                      <div className="border-r border-gray-200 pr-2">P/N</div>
                      <div>S/N</div>
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-gray-900 text-xs whitespace-nowrap">
                    REMARKS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {reliabilityRecords.map((record, index) => (
                  <tr
                    key={record.atlSeqNo}
                    className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      index < 2 ? "bg-green-50/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-900 text-sm border-r border-gray-100">
                      {record.atlSeqNo}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm border-r border-gray-100">
                      {record.dateStarted}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm border-r border-gray-100">
                      {formatTimeZulu(record.timeStarted)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm border-r border-gray-100">
                      {record.dateReleased}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm border-r border-gray-100">
                      {formatTimeZulu(record.timeReleased)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm border-r border-gray-100">
                      {record.actionTaken}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm text-center border-r border-gray-100 bg-blue-50/20">
                      {record.partsRemoved.pn1}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm text-center border-r border-gray-100 bg-blue-50/20">
                      {record.partsRemoved.sn1}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm text-center border-r border-gray-200 bg-blue-50/20">
                      {record.partsRemoved.pn2}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm text-center border-r border-gray-100 bg-orange-50/20">
                      {record.partsInstalled.sn}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm text-center border-r border-gray-100 bg-orange-50/20">
                      {record.partsInstalled.pn1}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm text-center border-r border-gray-200 bg-orange-50/20">
                      {record.partsInstalled.sn2}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm border-r border-gray-100">
                      {record.partDescription}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-sm">
                      {record.remarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add New Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-modal-overlay">
          <div className="bg-white rounded-lg w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-xl animate-modal-content">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between rounded-t-lg">
              <h3 className="text-gray-900 text-base">Add New Record</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-3.5">
              {/* ATL Sequence Number */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  ATL Sequence Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., 24780"
                  value={formData.atlSeqNo}
                  onChange={(e) =>
                    handleInputChange("atlSeqNo", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Work Started */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Work Started
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">
                      Date
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 20-Sep"
                      value={formData.workStartedDate}
                      onChange={(e) =>
                        handleInputChange("workStartedDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 810"
                      value={formData.workStartedTime}
                      onChange={(e) =>
                        handleInputChange("workStartedTime", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Work Released */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Work Released
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">
                      Date
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 20-Sep"
                      value={formData.workReleasedDate}
                      onChange={(e) =>
                        handleInputChange("workReleasedDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 840"
                      value={formData.workReleasedTime}
                      onChange={(e) =>
                        handleInputChange("workReleasedTime", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Action Taken */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Action Taken
                </label>
                <textarea
                  placeholder="e.g., BRAKE LINING BACK PLATE STUD WORN OUT"
                  value={formData.actionTaken}
                  onChange={(e) =>
                    handleInputChange("actionTaken", e.target.value)
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Parts Removed */}
              <div>
                <label className="block text-blue-600 text-sm mb-1.5">
                  Parts Removed
                </label>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      Part 1
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-gray-500 text-xs mb-1">
                          P/N
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 66-10"
                          value={formData.part1PN}
                          onChange={(e) =>
                            handleInputChange("part1PN", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 text-xs mb-1">
                          S/N
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., NSN"
                          value={formData.part1SN}
                          onChange={(e) =>
                            handleInputChange("part1SN", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1.5">
                      Part 2
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-gray-500 text-xs mb-1">
                          P/N
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., 66-10"
                          value={formData.part2PN}
                          onChange={(e) =>
                            handleInputChange("part2PN", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-500 text-xs mb-1">
                          S/N
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., NSN"
                          value={formData.part2SN}
                          onChange={(e) =>
                            handleInputChange("part2SN", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Parts Installed */}
              <div>
                <label className="block text-orange-600 text-sm mb-1.5">
                  Parts Installed
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">
                      P/N
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 51116-3B"
                      value={formData.installedPN}
                      onChange={(e) =>
                        handleInputChange("installedPN", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">
                      S/N
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., NSN"
                      value={formData.installedSN}
                      onChange={(e) =>
                        handleInputChange("installedSN", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g., BRAKE LINING (LH)"
                  value={formData.remarks}
                  onChange={(e) => handleInputChange("remarks", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2.5 rounded-b-lg">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              {canCreate("operation") && (
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 text-white bg-gray-900 rounded hover:bg-gray-800 transition-colors text-sm"
                >
                  Add Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
