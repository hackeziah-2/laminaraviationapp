import {
  Search,
  Download,
  Plus,
  ExternalLink,
  X,
  Loader,
  Upload,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import {
  getCertificatesMonitoring,
  createCertificateMonitoring,
  updateCertificateMonitoring,
  deleteCertificateMonitoring,
  downloadCertificateFile,
  CertificateMonitoring as CertificateMonitoringType,
  type CertificateMonitoringCreate,
  type CertificateMonitoringUpdate,
} from "../api/certificateMonitoringApi";
import { getAircrafts } from "../api/aircraftApi";
import { Spinner } from "./ui/spinner";

const CERTIFICATE_TYPES = [
  "C OF A",
  "C OF R",
  "NTC",
  "PITOT STATIC",
  "TRANSPONDER",
  "ELT",
  "WEIGHT & BALANCE",
  "COMPASS SWING",
  "MARKING RESERVATION",
  "24 BIT BINARY CODE",
  "IBRD / CORPAS",
] as const;

export function AircraftStatutoryCertificates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortBy, setSortBy] = useState<"registration" | "makeModel" | "msn" | "expiryDate">("expiryDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [displayColumn, setDisplayColumn] = useState("C OF A EXPIRY");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [certificates, setCertificates] = useState<CertificateMonitoringType[]>([]);
  const [aircrafts, setAircrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAircrafts, setLoadingAircrafts] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<CertificateMonitoringType | null>(null);

  const [formData, setFormData] = useState({
    aircraftId: "",
    makeModel: "",
    msn: "",
    certificateType: "",
    expiryDate: "",
    webLink: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getCertificatesMonitoring(
        currentPage,
        itemsPerPage,
        searchDebounced
      );
      setCertificates(response.items);
      setTotalRecords(response.total);
      setTotalPages(response.pages);
    } catch (error: any) {
      console.error("Error fetching certificates:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.message ?? "Failed to load certificates.",
      });
      setCertificates([]);
      setTotalRecords(0);
      setTotalPages(0);
    } finally {
      setTimeout(() => setLoading(false), 360);
    }
  }, [currentPage, itemsPerPage, searchDebounced]);

  const fetchAircrafts = useCallback(async () => {
    setLoadingAircrafts(true);
    try {
      const response = await getAircrafts(1, 200, "", "");
      const data = response?.data ?? response;
      const list = data?.items ?? data?.data ?? (Array.isArray(data) ? data : []);
      setAircrafts(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching aircrafts:", error);
      setAircrafts([]);
    } finally {
      setLoadingAircrafts(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  useEffect(() => {
    fetchAircrafts();
  }, [fetchAircrafts]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    };
  }, [searchQuery]);

  const getCertId = (c: CertificateMonitoringType | null): number | null => {
    if (!c) return null;
    const id = c.id ?? (c as any).documentId ?? (c as any).document_id;
    return id != null && !isNaN(Number(id)) ? Number(id) : null;
  };

  const getFilePath = (c: CertificateMonitoringType | null): string | null => {
    if (!c) return null;
    const path = (c as any).filePath ?? c.uploadFile ?? (c as any).upload_file;
    return path && typeof path === "string" ? path : null;
  };

  const getRegistration = (c: CertificateMonitoringType): string => {
    const ac = c.aircraft;
    if (ac && typeof ac === "object" && (ac as any).registration)
      return (ac as any).registration;
    return (c as any).registration ?? "-";
  };

  const getMakeModel = (c: CertificateMonitoringType): string => {
    const ac = c.aircraft;
    if (ac && typeof ac === "object") {
      const type = (ac as any).aircraftType ?? (ac as any).manufacturer ?? (ac as any).model;
      if (type) return type;
      if ((ac as any).manufacturer && (ac as any).model)
        return `${(ac as any).manufacturer} ${(ac as any).model}`.trim();
    }
    return (c as any).makeModel ?? (c as any).make_model ?? c.certificateName ?? "-";
  };

  const getMsn = (c: CertificateMonitoringType): string => {
    const ac = c.aircraft;
    if (ac && typeof ac === "object" && (ac as any).msn) return (ac as any).msn;
    return (c as any).msn ?? c.msn ?? "-";
  };

  const formatExpiry = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const extractFilename = (filePath: string): string => {
    let p = filePath;
    if (p.includes("/")) p = p.split("/").pop() || p;
    p = p.split("?")[0];
    return p;
  };

  const handleDownloadFile = async (filePath: string | null | undefined, fileName?: string) => {
    if (!filePath) {
      Swal.fire({ icon: "error", title: "Download Failed", text: "File path is not available." });
      return;
    }
    try {
      const blob = await downloadCertificateFile(filePath);
      const blobUrl = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || extractFilename(filePath) || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Download Failed", text: error?.message ?? "Failed to download." });
    }
  };

  const filteredCertificates = useMemo(() => {
    let list = [...certificates];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          getRegistration(c).toLowerCase().includes(q) ||
          getMakeModel(c).toLowerCase().includes(q) ||
          getMsn(c).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const regA = getRegistration(a);
      const regB = getRegistration(b);
      const mmA = getMakeModel(a);
      const mmB = getMakeModel(b);
      const msnA = getMsn(a);
      const msnB = getMsn(b);
      const expA = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
      const expB = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
      let cmp = 0;
      if (sortBy === "registration") cmp = regA.localeCompare(regB);
      else if (sortBy === "makeModel") cmp = mmA.localeCompare(mmB);
      else if (sortBy === "msn") cmp = msnA.localeCompare(msnB);
      else cmp = expA - expB;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [certificates, searchQuery, sortBy, sortDir]);

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const handleAddCertificate = () => {
    setFormData({
      aircraftId: "",
      makeModel: "",
      msn: "",
      certificateType: "",
      expiryDate: "",
      webLink: "",
    });
    setUploadFile(null);
    setUploadFileName("");
    setEditingCertificate(null);
    setShowEditModal(false);
    setShowAddModal(true);
  };

  const handleEdit = (c: CertificateMonitoringType) => {
    const id = getCertId(c);
    if (!id) return;
    setEditingCertificate(c);
    const ac = c.aircraft;
    setFormData({
      aircraftId: c.aircraftId != null ? String(c.aircraftId) : (ac && (ac as any).id ? String((ac as any).id) : ""),
      makeModel: (c as any).makeModel ?? (c as any).make_model ?? (ac && (ac as any).aircraftType) ?? (ac && (ac as any).manufacturer) ? `${(ac as any).manufacturer ?? ""} ${(ac as any).model ?? ""}`.trim() : "",
      msn: (c as any).msn ?? (ac && (ac as any).msn) ?? "",
      certificateType: (c as any).certificateType ?? (c as any).certificate_type ?? c.certificateName ?? "",
      expiryDate: c.expiryDate ?? "",
      webLink: c.webLink ?? (c as any).web_link ?? "",
    });
    setUploadFile(null);
    setUploadFileName("");
    setShowAddModal(false);
    setShowEditModal(true);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCertificateMonitoring(id);
      Swal.fire({ icon: "success", title: "Deleted!", text: "The certificate has been deleted.", timer: 1500, showConfirmButton: false });
      fetchCertificates();
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error?.message ?? "Failed to delete." });
    }
  };

  const resetForm = () => {
    setFormData({ aircraftId: "", makeModel: "", msn: "", certificateType: "", expiryDate: "", webLink: "" });
    setUploadFile(null);
    setUploadFileName("");
    setEditingCertificate(null);
    setShowAddModal(false);
    setShowEditModal(false);
  };

  const handleSave = async () => {
    const certType = formData.certificateType?.trim();
    if (!certType) {
      Swal.fire({ icon: "error", title: "Validation Error", text: "Please select Certificate Type." });
      return;
    }
    const aircraftId = formData.aircraftId ? Number(formData.aircraftId) : undefined;
    if (!aircraftId && !editingCertificate) {
      Swal.fire({ icon: "error", title: "Validation Error", text: "Please select an Aircraft." });
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        document_name: certType,
        certificate_name: certType,
        certificate_type: certType,
        make_model: formData.makeModel?.trim() || null,
        msn: formData.msn?.trim() || null,
        aircraft_id: aircraftId ?? (editingCertificate?.aircraftId ?? (editingCertificate?.aircraft as any)?.id) ?? null,
        expiry_date: formData.expiryDate || null,
        web_link: formData.webLink?.trim() || null,
        status: "Active",
      };
      if (editingCertificate && getFilePath(editingCertificate) && !uploadFile) {
        payload.file_path = getFilePath(editingCertificate);
      }
      const formDataObj = new FormData();
      formDataObj.append("json_data", JSON.stringify(payload));
      if (uploadFile) formDataObj.append("upload_file", uploadFile);

      if (editingCertificate) {
        const certId = getCertId(editingCertificate);
        if (!certId) throw new Error("Invalid certificate ID");
        await updateCertificateMonitoring(certId, formDataObj as CertificateMonitoringUpdate);
        Swal.fire({ icon: "success", title: "Success!", text: "Certificate updated successfully.", timer: 1500, showConfirmButton: false });
      } else {
        await createCertificateMonitoring(formDataObj as CertificateMonitoringCreate);
        Swal.fire({ icon: "success", title: "Success!", text: "Certificate created successfully.", timer: 1500, showConfirmButton: false });
      }
      resetForm();
      await fetchCertificates();
    } catch (error: any) {
      Swal.fire({ icon: "error", title: "Error", text: error?.message ?? "Failed to save." });
    } finally {
      setTimeout(() => setIsSaving(false), 360);
    }
  };

  const handleFileChange = (file: File | null) => {
    setUploadFile(file);
    setUploadFileName(file ? file.name : "");
  };

  const isModalOpen = showAddModal || showEditModal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Aircraft Statutory Certificates</h2>
          <p className="text-gray-600 mt-1">Certificate expiry tracking and document management.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            type="button"
            onClick={handleAddCertificate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Certificate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1.5">Search Aircraft</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by registration, model, or MSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={loading}
                className="w-full h-10 pl-10 pr-9 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {loading && <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 whitespace-nowrap">Display Column</label>
            <select
              value={displayColumn}
              onChange={(e) => setDisplayColumn(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="C OF A EXPIRY">C OF A EXPIRY</option>
              {CERTIFICATE_TYPES.filter((t) => t !== "C OF A").map((t) => (
                <option key={t} value={t}>{t} EXPIRY</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button type="button" onClick={() => toggleSort("registration")} className="flex items-center gap-1 hover:text-blue-600 focus:outline-none">
                        REGISTRATION
                        {sortBy === "registration" && (sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />)}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button type="button" onClick={() => toggleSort("makeModel")} className="flex items-center gap-1 hover:text-blue-600 focus:outline-none">
                        MAKE/MODEL
                        {sortBy === "makeModel" && (sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />)}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button type="button" onClick={() => toggleSort("msn")} className="flex items-center gap-1 hover:text-blue-600 focus:outline-none">
                        MSN
                        {sortBy === "msn" && (sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />)}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <button type="button" onClick={() => toggleSort("expiryDate")} className="flex items-center gap-1 hover:text-blue-600 focus:outline-none">
                        C OF A EXPIRY
                        {sortBy === "expiryDate" && (sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />)}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">FILE</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCertificates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                        No certificates found
                      </td>
                    </tr>
                  ) : (
                    filteredCertificates.map((cert, index) => {
                      const certId = getCertId(cert);
                      const filePath = getFilePath(cert);
                      return (
                        <tr key={certId ?? `cert-${index}`} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getRegistration(cert)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getMakeModel(cert)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getMsn(cert)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatExpiry(cert.expiryDate)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {filePath ? (
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(filePath)}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                              >
                                [LINK] <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEdit(cert)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Edit"
                              >
                                Edit
                              </button>
                              {certId && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(certId)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing 1 to {Math.min(itemsPerPage, filteredCertificates.length)} of {filteredCertificates.length} aircraft
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/15 backdrop-blur-[4px]" onClick={resetForm} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCertificate ? "Edit Certificate" : "Add New Certificate"}
              </h2>
              <button type="button" onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Aircraft Registry <span className="text-red-500">*</span></label>
                <select
                  value={formData.aircraftId}
                  onChange={(e) => setFormData({ ...formData, aircraftId: e.target.value })}
                  disabled={loadingAircrafts}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Aircraft</option>
                  {aircrafts.map((ac) => (
                    <option key={ac.id} value={ac.id}>
                      {ac.registration} {ac.aircraftType ? `(${ac.aircraftType})` : ac.manufacturer && ac.model ? `(${ac.manufacturer} ${ac.model})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Make/Model <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.makeModel}
                  onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
                  placeholder="e.g., Cessna 172"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">MSN <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.msn}
                  onChange={(e) => setFormData({ ...formData, msn: e.target.value })}
                  placeholder="Enter MSN"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Certificate Type <span className="text-red-500">*</span></label>
                <select
                  value={formData.certificateType}
                  onChange={(e) => setFormData({ ...formData, certificateType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  {CERTIFICATE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Expiry Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  placeholder="mm/dd/yyyy"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Web Link <span className="text-gray-500 font-normal">(optional)</span></label>
                <input
                  type="url"
                  value={formData.webLink}
                  onChange={(e) => setFormData({ ...formData, webLink: e.target.value })}
                  placeholder="Enter Web Link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">Upload Document <span className="text-gray-500 font-normal">(optional)</span></label>
                {uploadFile || uploadFileName ? (
                  <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                    <span className="flex-1 text-sm truncate">{uploadFileName}</span>
                    <button type="button" onClick={() => handleFileChange(null)} className="text-red-600 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      id="statutory-file-upload"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label htmlFor="statutory-file-upload" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600 mb-1">Choose file or drag here</span>
                      <span className="text-xs text-gray-500">Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              {isSaving && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-b-lg">
                  <Spinner />
                </div>
              )}
              <button type="button" onClick={resetForm} disabled={isSaving} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {isSaving && <Loader className="w-4 h-4 animate-spin" />}
                Save Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
