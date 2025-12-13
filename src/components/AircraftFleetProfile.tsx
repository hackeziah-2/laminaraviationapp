import axios from "axios";

import {
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Plus,
  X,
  ChevronDown,
  Upload,
} from "lucide-react";
import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "../components/ui/spinner";
import { useAircrafts } from "../hooks/useAircrafts";
import { AircraftForm } from "../types/Aircraft";
import { createAircraft } from "../api/aircraftApi";
import { snakeAllKeys } from "../utility/utils";

export function AircraftFleetProfile() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddAircraftModal, setShowAddAircraftModal] = useState(false);

  const [engineARCFile, setEngineARCFile] = useState<File | null>(null);
  const [propellerARCFile, setPropellerARCFile] = useState<File | null>(null);

  const { aircrafts, loading, error, totalItems, page, totalPage } =
    useAircrafts(currentPage, itemsPerPage, searchTerm, filterStatus);

  const handleViewAircraft = (aircraftId: number, view: string = "detail") => {
    switch (view) {
      case "detail":
        navigate(`/profile/${aircraftId}`);
        break;
      case "logbook":
        navigate(`/profile/${aircraftId}/logbook`);
        break;
      case "maintenance":
        navigate(`/profile/${aircraftId}/maintenance`);
        break;
      case "operation":
        navigate(`/profile/${aircraftId}/operation`);
        break;
      default:
        navigate(`/profile/${aircraftId}`);
    }
  };

  const totalPages = totalPage;
  const paginatedAircraft = aircrafts;

  // Reset to page 1 when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-200";
      case "Maintenance":
        return "bg-amber-500/10 text-amber-700 border border-amber-200";
      case "Inactive":
        return "bg-blue-500/10 text-blue-700 border border-blue-200";
      default:
        return "bg-gray-500/10 text-gray-700 border border-gray-200";
    }
  };

  const [form, setForm] = useState<AircraftForm>({
    registration: "",
    manufacturer: "",
    reportDescription: "",
    type: "",
    model: "",
    msn: "",
    base: "",
    ownership: "",
    status: "Active",

    // Airframe Information
    airframe_model: "",
    airframeServiceManual: "",
    airframeSerialNumber: "",
    airframeIpc: "",

    // Engine Information
    engineModel: "",
    engineSerialNumber: "",

    //  Propeller Information
    propellerModel: "",
    propellerSerialNumber: "",

    engineArc: null,
    propellerArc: null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  // const [loading, setLoading] = useState(false);

  // handle text input change
  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleEngineARCFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEngineARCFile(file);
  };

  const handlePropellerARCFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPropellerARCFile(file);
  };
  const newErrors: { [key: string]: string } = {};

  // validate form
  const validate = (): boolean => {
    if (!form.registration.trim())
      newErrors.registration = "Registration is required";
    if (!form.type.trim()) newErrors.type = "Type is required";
    if (!form.model.trim()) newErrors.model = "Model is required";
    if (!form.msn.trim()) newErrors.msn = "MSN is required";
    if (!form.base.trim()) newErrors.base = "Base location is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  JSON.stringify(form);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    const formData = new FormData();

    // Append JSON data as string
    formData.append("json_data", JSON.stringify(snakeAllKeys(form)));
    // Append files if they exist

    if (engineARCFile) formData.append("engine_arc_file", engineARCFile);
    if (propellerARCFile)
      formData.append("propeller_arc_file", propellerARCFile);

    try {
      const response = await createAircraft(formData);

      Swal.fire({
        icon: "success",
        title: "Aircraft Created!",
        text: "The aircraft has been successfully added to your fleet.",
        showConfirmButton: false,
        timer: 2000,
      });

      setForm({
        registration: "",
        manufacturer: "",
        reportDescription: "",
        type: "",
        model: "",
        msn: "",
        base: "",
        ownership: "",
        status: "Active",
        airframe_model: "",
        airframeServiceManual: "",
        airframeSerialNumber: "",
        airframeIpc: "",
        engineModel: "",
        engineSerialNumber: "",
        propellerModel: "",
        propellerSerialNumber: "",
        engineArc: null,
        propellerArc: null,
      });

      setEngineARCFile(null);
      setPropellerARCFile(null);
      setShowAddAircraftModal(false);
      setErrors({});
    } catch (err: any) {
      // console.log();
      if (err.status == 400) {
        Swal.fire({
          icon: "warning",
          title: "Creation Failed",
          text: err.response.data.detail,
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Creation Failed",
          text: "System error. Please contact the admin.",
        });
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            Aircraft Fleet Profile
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Comprehensive aircraft fleet management and tracking
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
            onClick={() => setShowAddAircraftModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Aircraft</span>
          </button>
        </div>
      </div>

      {/* Blue Banner */}
      <div className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <span className="tracking-wide text-sm sm:text-base">
          AIRCRAFT FLEET PROFILE
        </span>
        <span className="text-sm">DATE: 14 NOV 25</span>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              Search Aircraft
            </label>
            <input
              type="text"
              placeholder="Search by registration, type, model, or location..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Aircraft</option>
              <option value="active">Active </option>
              <option value="inactive">Inactive </option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Header Info
      <div className="text-gray-600">
        Showing {filteredAircraft.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + itemsPerPage, filteredAircraft.length)} of {totalItems} aircraft
      </div> */}

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Aircraft Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      AC REG
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      Aircraft Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      MSN
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      Base Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedAircraft.length > 0 ? (
                    paginatedAircraft.map((ac) => (
                      <tr
                        key={ac.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-3.5 text-gray-900">
                          {ac.registration}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900">{ac.type}</td>
                        <td className="px-6 py-3.5 text-gray-900">
                          {ac.model}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">{ac.msn}</td>
                        <td className="px-6 py-3.5 text-gray-900">{ac.base}</td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getStatusColor(
                              ac.status
                            )}`}
                          >
                            {ac.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleViewAircraft(ac.id, e.target.value);
                                  e.target.value = ""; // Reset selection
                                }
                              }}
                              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-700 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                            >
                              <option value="">View</option>
                              <option value="detail">
                                General Information
                              </option>
                              <option value="logbook">
                                Maintenance Logbook
                              </option>
                              <option value="maintenance">Maintenance</option>
                              <option value="operation">Operation</option>
                            </select>
                            <button
                              className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
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
                        colSpan={7}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No aircraft found matching your search criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-700">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-6"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={page === 1}
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Dynamic page numbers */}
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum = page;
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
                  // onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  // disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="text-gray-600">
        Showing {(page - 1) * itemsPerPage + 1} to{" "}
        {Math.min(page * itemsPerPage, totalItems)} of {totalItems} aircraft
      </div>

      {/* Add Aircraft Modal */}
      {showAddAircraftModal && (
        <form onSubmit={handleSubmit}>
          <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-modal-overlay">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-modal-content">
              {/* Modal Header */}

              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-gray-900">Add New Aircraft</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Enter the aircraft details to add it to your fleet. All
                    fields are required.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddAircraftModal(false)}
                  className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6 bg-gray-50">
                {/* Aircraft Type & Model */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Registration Number (Required)
                      </label>
                      <input
                        type="text"
                        maxLength={24}
                        inputMode="numeric"
                        value={form.registration}
                        onChange={(e) =>
                          handleChange("registration", e.target.value)
                        }
                        placeholder="N12345 or RP-C1234"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />

                      {errors.registration && (
                        <p className="text-red-500 text-sm">
                          {errors.registration}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Model (Required)
                      </label>
                      <input
                        maxLength={15}
                        inputMode="numeric"
                        value={form.model}
                        onChange={(e) => handleChange("model", e.target.value)}
                        placeholder="e.g., 737-800, A320-200, 172"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                      {errors.model && (
                        <p className="text-red-500 text-sm">{errors.model}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* MSN & Registration Number */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Aircraft Type (Required)
                      </label>
                      <input
                        placeholder="e.g., Boeing, Airbus, Cessna"
                        value={form.type}
                        type="text"
                        maxLength={20}
                        inputMode="numeric"
                        onChange={(e) => handleChange("type", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                      {errors.type && (
                        <p className="text-red-500 text-sm">{errors.type}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        MSN (Required)
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        inputMode="numeric"
                        value={form.msn}
                        onChange={(e) => handleChange("msn", e.target.value)}
                        placeholder="MSN-12345"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                      {errors.msn && (
                        <p className="text-red-500 text-sm">{errors.msn}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Base Location & Ownership Type */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Base Location (Required)
                      </label>
                      <input
                        maxLength={24}
                        inputMode="numeric"
                        placeholder="RPLL, RPVM, LAX, etc."
                        value={form.base}
                        onChange={(e) => handleChange("base", e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                      {errors.base && (
                        <p className="text-red-500 text-sm">{errors.base}</p>
                      )}
                    </div>
                    <div className="relative">
                      <label className="block text-gray-600 text-sm mb-2">
                        Ownership Type
                      </label>
                      <select
                        value={form.ownership}
                        onChange={(e) =>
                          handleChange("ownership", e.target.value)
                        }
                        className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 appearance-none cursor-pointer shadow-sm"
                      >
                        <option value="">Owned</option>
                        <option value="leased">Leased</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-[2.6rem] w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Airframe Information */}
                <div className="bg-white rounded-lg px-6 py-5 space-y-5 shadow-sm">
                  <h4 className="text-gray-900">Airframe Information</h4>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Service Manual Year
                      </label>
                      <input
                        maxLength={24}
                        inputMode="numeric"
                        type="number"
                        value={form.airframeServiceManual}
                        onChange={(e) =>
                          handleChange("airframeServiceManual", e.target.value)
                        }
                        placeholder="e.g., 2020"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        IPC Year
                      </label>
                      <input
                        maxLength={20}
                        inputMode="numeric"
                        type="number"
                        value={form.airframeIpc}
                        onChange={(e) =>
                          handleChange("airframeIpc", e.target.value)
                        }
                        placeholder="e.g., 2021"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Engine Information */}
                <div className="bg-white rounded-lg px-6 py-5 space-y-5 shadow-sm">
                  <h4 className="text-gray-900">Engine Information</h4>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Engine Model
                      </label>
                      <input
                        type="text"
                        maxLength={24}
                        value={form.engineModel}
                        onChange={(e) =>
                          handleChange("engineModel", e.target.value)
                        }
                        placeholder="e.g., CFM56-7B27"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Engine Serial Number
                      </label>
                      <input
                        type="text"
                        maxLength={24}
                        value={form.engineSerialNumber}
                        onChange={(e) =>
                          handleChange("engineSerialNumber", e.target.value)
                        }
                        placeholder="e.g., ENG-123456"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Engine ARC (Attachment)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="engine-arc-file"
                        onChange={handleEngineARCFile}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="engine-arc-file"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span
                          className={
                            engineARCFile ? "text-gray-900" : "text-gray-400"
                          }
                        >
                          {engineARCFile
                            ? engineARCFile.name
                            : "Choose file or N/A"}
                        </span>
                        <Upload className="w-4 h-4 text-gray-400" />
                      </label>
                    </div>
                    {engineARCFile && (
                      <button
                        onClick={() => setEngineARCFile(null)}
                        className="text-xs text-red-600 hover:text-red-700 mt-1"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                </div>

                {/* Propeller Information */}
                <div className="bg-white rounded-lg px-6 py-5 space-y-5 shadow-sm">
                  <h4 className="text-gray-900">Propeller Information</h4>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Propeller Model
                      </label>
                      <input
                        type="text"
                        value={form.propellerModel}
                        onChange={(e) =>
                          handleChange("propellerModel", e.target.value)
                        }
                        placeholder="e.g., McCauley 1A38C359 or N/A"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Propeller Serial Number
                      </label>
                      <input
                        type="text"
                        value={form.propellerSerialNumber}
                        onChange={(e) =>
                          handleChange("propellerSerialNumber", e.target.value)
                        }
                        placeholder="e.g., PROP-987654 or N/A"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-2">
                      Propeller ARC (Attachment)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id="propeller-arc-file"
                        onChange={handlePropellerARCFile}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="propeller-arc-file"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span
                          className={
                            propellerARCFile ? "text-gray-900" : "text-gray-400"
                          }
                        >
                          {propellerARCFile
                            ? propellerARCFile.name
                            : "Choose file or N/A"}
                        </span>
                        <Upload className="w-4 h-4 text-gray-400" />
                      </label>
                    </div>
                    {propellerARCFile && (
                      <button
                        onClick={() => setPropellerARCFile(null)}
                        className="text-xs text-red-600 hover:text-red-700 mt-1"
                      >
                        Remove file
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-end flex-shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddAircraftModal(false)}
                    className="px-6 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    Add Aircraft
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
