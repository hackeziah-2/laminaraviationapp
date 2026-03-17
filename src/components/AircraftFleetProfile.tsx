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
  ChevronUp,
  ChevronDown,
  Upload,
  Loader,
} from "lucide-react";
import Swal from "sweetalert2";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "./ui/spinner";
import { useAircrafts } from "../hooks/useAircrafts";
import { AircraftForm } from "../types/Aircraft";
import {
  createAircraft,
  createReportAircraft,
  createReportPDFAircraft,
  importAircraftExcel,
  deleteAircraft,
} from "../api/aircraftApi";
import { dateToday, snakeAllKeys } from "../utility/utils";

export function AircraftFleetProfile() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddAircraftModal, setShowAddAircraftModal] = useState(false);

  const [engineARCFile, setEngineARCFile] = useState<File | null>(null);
  const [propellerARCFile, setPropellerARCFile] = useState<File | null>(null);

  type SortItem = {
    field: string;
    direction: "asc" | "desc";
  };

  const [sorts, setSorts] = useState<SortItem[]>([
    { field: "created_at", direction: "desc" },
  ]);

  const toggleSort = (field: string, multi = false) => {
    setCurrentPage(1);

    setSorts((prev) => {
      const existingIndex = prev.findIndex((s) => s.field === field);

      // Not sorted yet
      if (existingIndex === -1) {
        return multi
          ? [...prev, { field, direction: "asc" }]
          : [{ field, direction: "asc" }];
      }

      const existing = prev[existingIndex];

      // ASC → DESC
      if (existing.direction === "asc") {
        return prev.map((s, i) =>
          i === existingIndex ? { ...s, direction: "desc" } : s
        );
      }

      // DESC → remove
      const next = prev.filter((s) => s.field !== field);

      // if (next.length === 0 && !multi) {
      //   return [{ field: "created_at", direction: "desc" }];
      // }

      return next;
    });
  };

  const sortParam =
    sorts.length > 0
      ? sorts
          .map((s) => (s.direction === "desc" ? `-${s.field}` : s.field))
          .join(",")
      : "";

  const renderSortIcon = (field: string) => {
    const index = sorts.findIndex((s) => s.field === field);
    if (index === -1) return null;

    const item = sorts[index];

    return (
      <span className="flex items-center gap-0.5">
        {item.direction === "asc" ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <span className="text-[10px] text-gray-400">{index + 1}</span>
      </span>
    );
  };

  const { aircrafts, loading, error, totalItems, page, totalPage, refresh } =
    useAircrafts(
      currentPage,
      itemsPerPage,
      searchDebounced,
      filterStatus,
      sortParam
    );

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    };
  }, [searchTerm]);

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importLoading, setImportLoading] = useState(false);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      await importAircraftExcel(file);
      Swal.fire({
        icon: "success",
        title: "Import Successful!",
        text: "Aircraft data has been imported from the Excel file.",
        showConfirmButton: false,
        timer: 2000,
      });
      refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? "Import failed. Please try again.";
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text: msg,
        confirmButtonText: "OK",
      });
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  };

  const handleViewAircraft = (aircraftId: number, view: string = "detail") => {
    switch (view) {
      case "detail":
        navigate(`/profile/${aircraftId}`);
        break;
      case "logbook":
        navigate(`/profile/${aircraftId}/logbook`);
        break;
      case "maintenance":
        navigate(`/profile/${aircraftId}/maintenance-ldnd`);
        break;
      case "operation":
        navigate(`/profile/${aircraftId}/operation`);
        break;
      case "document_on_board":
        navigate(`/profile/${aircraftId}/document_on_board`);
        break;
      default:
        navigate(`/profile/${aircraftId}`);
    }
  };

  const totalPages = totalPage;
  const paginatedAircraft = aircrafts;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Page reset is handled in debounce effect
  };

  const handleFilterChange = (value: string) => {
    setFilterStatus(value);
    setCurrentPage(1);
  };

  const handleDeleteAircraft = async (ac: { id: number; registration?: string }) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Aircraft",
      html: `Are you sure you want to delete aircraft <strong>${ac.registration ?? ac.id}</strong>? This action cannot be undone.`,
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteAircraft(ac.id);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Aircraft has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      refresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; message?: string } }; message?: string };
      const msg = e?.response?.data?.detail ?? e?.response?.data?.message ?? e?.message ?? "Failed to delete aircraft.";
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: msg,
      });
    }
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
    model: "",
    msn: "",
    base: "",
    ownership: "",
    status: "Active",

    // Aircraft Information
    modelYear: "",

    // Airframe Information
    airframeServiceManual: "",
    airframeIpc: "",

    // Engine Information
    engineModel: "",
    engineSerialNumber: "",
    engineLifeTimeLimit: "",
    engineTsn: "",
    engineTso: "",

    //  Propeller Information
    propellerModel: "",
    propellerSerialNumber: "",
    propellerLifeTimeLimit: "",
    propellerTsn: "",
    propellerTso: "",

    engineArc: null,
    propellerArc: null,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

  // validate form
  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!form.registration.trim())
      newErrors.registration = "Registration is required";
    if (!form.model.trim()) newErrors.model = "Model is required";
    if (!form.msn.trim()) newErrors.msn = "MSN is required";
    if (!form.base.trim()) newErrors.base = "Base location is required";
    if (form.engineLifeTimeLimit.trim() === "" || form.engineLifeTimeLimit == null)
      newErrors.engineLifeTimeLimit = "Engine Life Time Limit (life_time_limit_engine) is required";
    if (form.propellerLifeTimeLimit.trim() === "" || form.propellerLifeTimeLimit == null)
      newErrors.propellerLifeTimeLimit = "Propeller Life Time Limit (life_time_limit_propeller) is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  JSON.stringify(form);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    const formData = new FormData();
    const payload = snakeAllKeys({
      ...form,
      engineLifeTimeLimit:
        form.engineLifeTimeLimit === ""
          ? null
          : parseFloat(form.engineLifeTimeLimit),
      propellerLifeTimeLimit:
        form.propellerLifeTimeLimit === ""
          ? null
          : parseFloat(form.propellerLifeTimeLimit),
      modelYear:
        form.modelYear === "" ? null : (form.modelYear ? parseInt(form.modelYear, 10) : null),
      engineTsn: form.engineTsn === "" ? null : (form.engineTsn ? parseFloat(form.engineTsn) : null),
      engineTso: form.engineTso === "" ? null : (form.engineTso ? parseFloat(form.engineTso) : null),
      propellerTsn: form.propellerTsn === "" ? null : (form.propellerTsn ? parseFloat(form.propellerTsn) : null),
      propellerTso: form.propellerTso === "" ? null : (form.propellerTso ? parseFloat(form.propellerTso) : null),
    });

    // Append JSON data as string
    formData.append("json_data", JSON.stringify(payload));
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
        timer: 550,
      });

      setForm({
        registration: "",
        manufacturer: "",
        reportDescription: "",
        model: "",
        msn: "",
        base: "",
        ownership: "",
        status: "Active",
        modelYear: "",
        airframeServiceManual: "",
        airframeIpc: "",
        engineModel: "",
        engineSerialNumber: "",
        engineLifeTimeLimit: "",
        engineTsn: "",
        engineTso: "",
        propellerModel: "",
        propellerSerialNumber: "",
        propellerLifeTimeLimit: "",
        propellerTsn: "",
        propellerTso: "",
        engineArc: null,
        propellerArc: null,
      });

      setEngineARCFile(null);
      setPropellerARCFile(null);
      setShowAddAircraftModal(false);
      setErrors({});

      setTimeout(() => {
        refresh();
      }, 360);
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
    } finally {
    }
  };

  const handleGenerateExcel = async () => {
    // setLoading(true);
    try {
      // Call backend to generate report
      const blob = await createReportAircraft(aircrafts);

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `aircraft_report_${dateToday}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Failed to generate report:", err);
      alert(err.message || "Error generating report");
    } finally {
      // setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const pdfBlob = await createReportPDFAircraft(aircrafts);

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `aircraft_report_${dateToday}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
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
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Printer className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Print PDF</span>
          </button>
          <button
            onClick={handleGenerateExcel}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Export EXCEL</span>
          </button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportExcel}
          />
          <button
            type="button"
            onClick={() => importFileInputRef.current?.click()}
            disabled={importLoading}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importLoading ? (
              <Loader className="w-4 h-4 text-gray-600 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-gray-700 hidden sm:inline">Import</span>
          </button>
          <button
            onClick={() => setShowAddAircraftModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
              placeholder="Search by registration, model, or location"
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
                    {/* <th className=""></th> */}

                    <th
                      onClick={(e) => toggleSort("registration", e.shiftKey)}
                      className="cursor-pointer select-none px-6 py-3"
                    >
                      <div className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                        <b>AC REG</b>
                        {renderSortIcon("registration")}
                      </div>
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
                    <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.isArray(paginatedAircraft) && paginatedAircraft.length > 0 ? (
                    paginatedAircraft.map((ac) => (
                      <tr
                        key={ac?.id ?? Math.random()}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-3.5 text-gray-900">
                          {ac?.registration ?? "-"}
                        </td>
                        <td className="px-6 py-3.5 text-gray-900">
                          {ac?.model ?? "-"}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">{ac?.msn ?? "-"}</td>
                        <td className="px-6 py-3.5 text-gray-900">{ac?.base ?? "-"}</td>

                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getStatusColor(
                              ac?.status ?? ""
                            )}`}
                          >
                            {ac?.status ?? "-"}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value && ac?.id != null) {
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
                              <option value="operation">
                                Fleet Time Monitoring
                              </option>
                              <option value="maintenance">Maintenance</option>
                              <option value="logbook">
                                Maintenance Logbook
                              </option>
                              <option value="document_on_board">
                                Documents On Board
                              </option>
                            </select>
                            <button
                              onClick={() => { if (ac?.id != null) handleDeleteAircraft(ac); }}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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
                  disabled={page <= 1}
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, Math.max(1, totalPages)))
                  }
                  disabled={totalPages === 0 || page >= totalPages}
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
      <div className="text-gray-600 text-sm">
        Showing {totalItems > 0 ? (page - 1) * itemsPerPage + 1 : 0} to{" "}
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

                {/* MSN & Model Year */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Model Year
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={form.modelYear}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                          handleChange("modelYear", v);
                        }}
                        placeholder="e.g., 2020"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
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
                        type="text"
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
                        type="text"
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
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Engine Life Time Limit <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.engineLifeTimeLimit}
                        onChange={(e) =>
                          handleChange("engineLifeTimeLimit", e.target.value)
                        }
                        placeholder="e.g., 12000.50"
                        className={`w-full px-3.5 py-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm ${errors.engineLifeTimeLimit ? "border-red-500" : "border-gray-200"}`}
                      />
                      {errors.engineLifeTimeLimit && (
                        <p className="text-red-500 text-xs mt-1">{errors.engineLifeTimeLimit}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Engine TSN
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.engineTsn}
                        onChange={(e) =>
                          handleChange("engineTsn", e.target.value)
                        }
                        placeholder="Time Since New"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Engine TSO
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.engineTso}
                        onChange={(e) =>
                          handleChange("engineTso", e.target.value)
                        }
                        placeholder="Time Since Overhaul"
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
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Propeller Life Time Limit <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.propellerLifeTimeLimit}
                        onChange={(e) =>
                          handleChange("propellerLifeTimeLimit", e.target.value)
                        }
                        placeholder="e.g., 8000.00"
                        className={`w-full px-3.5 py-2.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm ${errors.propellerLifeTimeLimit ? "border-red-500" : "border-gray-200"}`}
                      />
                      {errors.propellerLifeTimeLimit && (
                        <p className="text-red-500 text-xs mt-1">{errors.propellerLifeTimeLimit}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Propeller TSN
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.propellerTsn}
                        onChange={(e) =>
                          handleChange("propellerTsn", e.target.value)
                        }
                        placeholder="Time Since New"
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-2">
                        Propeller TSO
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.propellerTso}
                        onChange={(e) =>
                          handleChange("propellerTso", e.target.value)
                        }
                        placeholder="Time Since Overhaul"
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
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
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
