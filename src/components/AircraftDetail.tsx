import {
  ArrowLeft,
  History,
  Printer,
  Download,
  Pencil,
  FileText,
  Save,
  X,
  Upload,
  Eye,
} from "lucide-react";
import Swal from "sweetalert2";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAircraftById, updateAircraft } from "../api/aircraftApi";
import apiClient from "../api/index";
import { Spinner } from "./ui/spinner";
import { Aircraft } from "../types/Aircraft";
import { snakeAllKeys } from "../utility/utils";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { isMechanicRole } from "../utility/atlEditRbac";

/** Aircraft Details: treat null/empty/invalid as 0 for engine/prop hour fields. */
function numOrZero(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function withEnginePropNumericDefaults(a: Aircraft): Aircraft {
  return {
    ...a,
    airframeAftt: a.airframeAftt == null ? null : numOrZero(a.airframeAftt),
    engineLifeTimeLimit: numOrZero(a.engineLifeTimeLimit),
    engineTsn: numOrNull(a.engineTsn),
    engineTso: numOrZero(a.engineTso),
    propellerTsn: numOrNull(a.propellerTsn),
    propellerTso: numOrZero(a.propellerTso),
  };
}

/** Controlled number input: show 0 when state is null, undefined, or "" (see numOrZero for display/save). */
function numberInputValue(v: unknown): number | string {
  if (v === "" || v == null) return 0;
  return v as number | string;
}

export function AircraftDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canAccess, canUpdate, user } = useUserPermissions();
  /** Mechanic role cannot navigate to Aircraft Details history (same RBAC as Operation export gate). */
  const canViewAircraftHistory = !isMechanicRole(user?.role);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editAircraft, setEditedAircraft] = useState<Aircraft | null>(null);
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [loading, setLoading] = useState(false);

  const [engineARCFile, setEngineARCFile] = useState<File | null>(null);
  const [propellerARCFile, setPropellerARCFile] = useState<File | null>(null);

  const [engineARCFileName, setEngineARCFileName] = useState<string>("");
  const [propellerARCFileName, setPropellerARCFileName] = useState<string>("");

  const handleEngineARCFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEngineARCFile(file);
    setEngineARCFileName(String(file?.name));
  };

  const handlePropellerARCFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPropellerARCFile(file);
    setPropellerARCFileName(String(file?.name));
  };

  /** Strip app/, app/uploads/, uploads/, leading slashes and api/v1 so we never display or send path prefix */
  const stripArcPathPrefix = (path: string): string => {
    if (!path || typeof path !== "string") return "";
    let p = path.trim().replace(/^\/+/, "");
    p = p.replace(/^api\/v1\//, "");
    p = p.replace(/^app\/uploads\//, "");
    p = p.replace(/^\/app\/uploads\//, "");
    p = p.replace(/^app\//, "");
    p = p.replace(/^uploads\//, "");
    return p.trim();
  };

  useEffect(() => {
    if (!id) return;
    getAircraftById(Number(id))
      .then((res) => {
        const data = res.data;
        const mappedAircraft: Aircraft = {
          id: data.id,
          registration: data.registration,
          model: data.model,
          msn: data.msn,
          base: data.base,
          ownership: data.ownership,
          status: data.status,
          manufacturer: data.manufacturer,
          reportDescription: data.report_description,
          modelYear: data.model_year != null ? Number(data.model_year) : null,
          airframeAftt:
            data.airframe_aftt != null ? Number(data.airframe_aftt) : null,
          airframeServiceManual: data.airframe_service_manual,
          airframeIpc: data.airframe_ipc,

          engineModel: data.engine_model,
          engineSerialNumber: data.engine_serial_number,
          engineLifeTimeLimit: numOrZero(
            data.engine_life_time_limit ?? data.life_time_limit_engine
          ),
          engineArc:
            data?.engine_arc && String(data.engine_arc).trim()
              ? stripArcPathPrefix(String(data.engine_arc))
              : "",
          engineTsn: numOrNull(data.engine_tsn),
          engineTso: numOrZero(data.engine_tso),
          propellerModel: data.propeller_model,
          propellerSerialNumber: data.propeller_serial_number,
          propellerLifeTimeLimit: Number(
            data.propeller_life_time_limit ??
              data.life_time_limit_propeller ??
              0
          ),
          propellerArc:
            data?.propeller_arc && String(data.propeller_arc).trim()
              ? stripArcPathPrefix(String(data.propeller_arc))
              : "",
          propellerTsn: numOrNull(data.propeller_tsn),
          propellerTso: numOrZero(data.propeller_tso),
        };
        setEngineARCFileName(
          data?.engine_arc && String(data.engine_arc).trim()
            ? stripArcPathPrefix(String(data.engine_arc))
            : ""
        );
        setPropellerARCFileName(
          data?.propeller_arc && String(data.propeller_arc).trim()
            ? stripArcPathPrefix(String(data.propeller_arc))
            : ""
        );
        setAircraft(mappedAircraft);
      })
      .finally(() =>
        setTimeout(() => {
          setLoading(true);
        }, 360)
      );
  }, [id]);

  const handleEditClick = () => {
    if (!aircraft) return;
    setEditedAircraft({ ...aircraft }); // clone to avoid mutating original
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    const toOptionalFloat = (value: unknown): number | null => {
      if (value === null || value === undefined || value === "") return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    const toFloatOrZero = (value: unknown): number => {
      if (value === null || value === undefined || value === "") return 0;
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    // Required: life_time_limit_propeller must be set (engine life limit defaults to 0 when empty)
    const propellerLimit = toOptionalFloat(
      editAircraft?.propellerLifeTimeLimit
    );
    if (propellerLimit == null) {
      Swal.fire({
        icon: "warning",
        title: "Required field",
        text: "Propeller Life Time Limit (life_time_limit_propeller) is required. Please set it before saving.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const updatedData = {
      registration: editAircraft?.registration,
      manufacturer: editAircraft?.manufacturer,
      report_description: editAircraft?.reportDescription,
      model: editAircraft?.model,
      msn: editAircraft?.msn,
      base: editAircraft?.base,
      ownership: editAircraft?.ownership,
      status: editAircraft?.status,

      model_year: toOptionalFloat(
        editAircraft?.modelYear as number | string | null | undefined
      ),

      airframe_aftt: toOptionalFloat(
        editAircraft?.airframeAftt as number | string | null | undefined
      ),
      airframe_service_manual: editAircraft?.airframeServiceManual,
      airframe_ipc: editAircraft?.airframeIpc,

      engine_model: editAircraft?.engineModel,
      engine_serial_number: editAircraft?.engineSerialNumber,
      engine_life_time_limit: toFloatOrZero(editAircraft?.engineLifeTimeLimit),
      engine_tsn: toOptionalFloat(
        editAircraft?.engineTsn as number | string | null | undefined
      ),
      engine_tso: toFloatOrZero(
        editAircraft?.engineTso as number | string | null | undefined
      ),
      // engine_arc: editAircraft?.engineArc,

      propeller_model: editAircraft?.propellerModel,
      propeller_serial_number: editAircraft?.propellerSerialNumber,
      propeller_life_time_limit: toOptionalFloat(
        editAircraft?.propellerLifeTimeLimit
      ),
      propeller_tsn: toOptionalFloat(
        editAircraft?.propellerTsn as number | string | null | undefined
      ),
      propeller_tso: toFloatOrZero(
        editAircraft?.propellerTso as number | string | null | undefined
      ),
      // propeller_arc: editAircraft?.propellerArc,
    };

    const formData = new FormData();

    // Append JSON data as string
    formData.append("json_data", JSON.stringify(snakeAllKeys(updatedData)));
    // Append files only when user selected a new file (File object)
    if (engineARCFile instanceof File) {
      formData.append("engine_arc_file", engineARCFile);
    }
    if (propellerARCFile instanceof File) {
      formData.append("propeller_arc_file", propellerARCFile);
    }

    try {
      const response = await updateAircraft(Number(id), formData);
      const updatedAircraft: Aircraft = withEnginePropNumericDefaults(
        response as Aircraft
      );

      setEditedAircraft(updatedAircraft);
      setAircraft(updatedAircraft);
      setIsEditMode(false);
      setEngineARCFile(null);
      setPropellerARCFile(null);
      const enginePath =
        (updatedAircraft as any).engineArc ??
        (updatedAircraft as any).engine_arc ??
        "";
      const propellerPath =
        (updatedAircraft as any).propellerArc ??
        (updatedAircraft as any).propeller_arc ??
        "";
      setEngineARCFileName(
        enginePath ? stripArcPathPrefix(String(enginePath)) : ""
      );
      setPropellerARCFileName(
        propellerPath ? stripArcPathPrefix(String(propellerPath)) : ""
      );

      Swal.fire({
        icon: "success",
        title: "Aircraft Updated!",
        text: "The aircraft details have been successfully updated.",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save changes.",
      });
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setEditedAircraft((prev) => {
      if (!prev) return prev; // still null, do nothing
      return {
        ...prev,
        [key]: value,
      };
    });
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  const handleBack = () => {
    navigate("/profile");
  };

  const handleHistoryClick = () => {
    if (!id) return;
    navigate(`/profile/${id}/history`);
  };

  const handleEngineCancel = () => {
    setEngineARCFile(null);
    setEngineARCFileName("");
  };

  const handlePropellerCancel = () => {
    setPropellerARCFile(null);
    setPropellerARCFileName("");
  };

  /** Normalize path for download/view: strip app/, app/uploads/, uploads/, leading slashes, api/v1 */
  const normalizeArcPath = (path: string): string => {
    return stripArcPathPrefix(path);
  };

  /** Download – same logic as ATL list view: GET {folder}/download/{filePath} */
  const handleDownloadArc = async (
    folder: "engine_arc" | "propeller_arc",
    filename: string,
    displayName?: string
  ) => {
    if (!filename || !filename.trim()) return;
    try {
      const { downloadModuleFile } = await import("../api/fileUploadApi");
      const blob = await downloadModuleFile(folder, filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        displayName || normalizeArcPath(filename).split("/").pop() || folder;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Download error:", err);
      Swal.fire({
        icon: "error",
        title: "Download failed",
        text:
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to download file.",
      });
    }
  };

  /** MIME from filename for view */
  const getMimeFromFilename = (path: string): string | null => {
    const ext = (path.split("/").pop() || path).split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "application/pdf";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "gif") return "image/gif";
    if (ext === "webp") return "image/webp";
    return null;
  };

  /** True if file path is an image (show View icon); otherwise show Download icon */
  const isArcImage = (path: string): boolean => {
    const ext = (path.split("/").pop() || path).split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp"].includes(ext ?? "");
  };

  const [showFileViewModal, setShowFileViewModal] = useState(false);
  const [fileViewBlobUrl, setFileViewBlobUrl] = useState<string | null>(null);
  const [fileViewMimeType, setFileViewMimeType] = useState<string | null>(null);
  const [fileViewLoading, setFileViewLoading] = useState(false);
  const [fileViewError, setFileViewError] = useState<string | null>(null);

  /** View in modal – same logic as ATL list view: open modal, GET {folder}/download/{filePath}, show image/PDF or fallback */
  const handleViewArc = async (
    folder: "engine_arc" | "propeller_arc",
    filename: string
  ) => {
    if (!filename || !filename.trim()) return;
    setFileViewLoading(true);
    setFileViewError(null);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setShowFileViewModal(true);
    try {
      const { downloadModuleFile } = await import("../api/fileUploadApi");
      const blob = await downloadModuleFile(folder, filename);
      const url = window.URL.createObjectURL(blob);
      const serverType =
        blob.type || (blob as Blob & { type?: string }).type || null;
      const isOctetStream =
        !serverType || serverType === "application/octet-stream";
      const mimeType = isOctetStream
        ? getMimeFromFilename(normalizeArcPath(filename))
        : serverType;
      setFileViewBlobUrl(url);
      setFileViewMimeType(mimeType ?? null);
      setFileViewError(null);
    } catch (err: any) {
      console.error("View file error:", err);
      setFileViewError(
        err?.response?.data?.detail || err?.message || "Failed to open file."
      );
      setFileViewBlobUrl(null);
      setFileViewMimeType(null);
    } finally {
      setFileViewLoading(false);
    }
  };

  const closeFileViewModal = () => {
    if (fileViewBlobUrl) window.URL.revokeObjectURL(fileViewBlobUrl);
    setShowFileViewModal(false);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setFileViewError(null);
  };

  if (!aircraft) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-gray-900">Aircraft Not Found</h2>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          The aircraft you're looking for could not be found.
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-50 text-green-700 border border-green-200";
      case "Maintenance":
        return "bg-yellow-50 text-yellow-700 border border-yellow-200";
      case "Inactive":
        return "bg-blue-50 text-blue-700 border border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border border-gray-200";
    }
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-gray-900 text-lg sm:text-xl">
                Aircraft Details
              </h2>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getStatusColor(
                  aircraft.status
                )}`}
              >
                {aircraft.status}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isEditMode ? (
              <>
                {canAccess("profile") && canViewAircraftHistory && (
                  <button
                    onClick={handleHistoryClick}
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm"
                  >
                    <History className="w-4 h-4" />
                    <span>History</span>
                  </button>
                )}
                {canUpdate("profile") && (
                  <button
                    onClick={handleEditClick}
                    className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit Aircraft</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                {canUpdate("profile") && (
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {loading ? (
          <>
            {/* Aircraft Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">
                Aircraft Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Model</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.model ?? ""}
                      onChange={(e) =>
                        handleInputChange("model", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.model ? aircraft.model : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Registration Number
                  </p>

                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.registration ?? ""}
                      onChange={(e) =>
                        handleInputChange("registration", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.registration ? aircraft.registration : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">MSN</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.msn ?? ""}
                      onChange={(e) => handleInputChange("msn", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.msn ? aircraft.msn : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Base Location</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.base ?? ""}
                      onChange={(e) =>
                        handleInputChange("base", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.base ? aircraft.base : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Ownership Type</p>
                  {isEditMode ? (
                    <select
                      value={editAircraft?.ownership ?? ""}
                      onChange={(e) =>
                        handleInputChange("ownership", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Owned">Owned</option>
                      <option value="Leased">Leased</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.ownership || "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Status</p>
                  {isEditMode ? (
                    <select
                      value={editAircraft?.status ?? ""}
                      onChange={(e) =>
                        handleInputChange("status", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{aircraft.status || "N/A"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Model Year</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={editAircraft?.modelYear ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                        handleInputChange("modelYear", v);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. 2020"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.modelYear != null ? aircraft.modelYear : "N/A"}
                    </p>
                  )}
                </div>
                {/* <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Engine Life Time Limit <span className="text-red-500">*</span>
                  </p>
                  {isEditMode ? (
                    <input
                      type="number"
                      min={0}
                      value={editAircraft?.engineLifeTimeLimit ?? ""}
                      onChange={(e) =>
                        handleInputChange("engineLifeTimeLimit", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.engineLifeTimeLimit != null
                        ? aircraft.engineLifeTimeLimit
                        : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Propeller Life Time Limit <span className="text-red-500">*</span>
                  </p>
                  {isEditMode ? (
                    <input
                      type="number"
                      min={0}
                      value={editAircraft?.propellerLifeTimeLimit ?? ""}
                      onChange={(e) =>
                        handleInputChange(
                          "propellerLifeTimeLimit",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.propellerLifeTimeLimit != null
                        ? aircraft.propellerLifeTimeLimit
                        : "N/A"}
                    </p>
                  )}
                </div> */}
              </div>
            </div>

            {/* Airframe Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">
                Airframe Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Airframe AFTT</p>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={numberInputValue(editAircraft?.airframeAftt)}
                      onChange={(e) =>
                        handleInputChange("airframeAftt", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.airframeAftt != null
                        ? numOrZero(aircraft.airframeAftt)
                        : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Service Manual Year
                  </p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.airframeServiceManual ?? ""}
                      onChange={(e) =>
                        handleInputChange(
                          "airframeServiceManual",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.airframeServiceManual
                        ? aircraft.airframeServiceManual
                        : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">IPC Year</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.airframeIpc ?? ""}
                      onChange={(e) =>
                        handleInputChange("airframeIpc", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.airframeIpc ? aircraft.airframeIpc : "N/A"}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Engine Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">
                Engine Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Engine Model</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.engineModel ?? ""}
                      onChange={(e) =>
                        handleInputChange("engineModel", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.engineModel ? aircraft.engineModel : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Engine Serial Number
                  </p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.engineSerialNumber ?? ""}
                      onChange={(e) =>
                        handleInputChange("engineSerialNumber", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.engineSerialNumber
                        ? aircraft.engineSerialNumber
                        : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Engine Life Time Limit
                  </p>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={numberInputValue(
                        editAircraft?.engineLifeTimeLimit
                      )}
                      onChange={(e) =>
                        handleInputChange("engineLifeTimeLimit", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {numOrZero(aircraft.engineLifeTimeLimit)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Engine TSN</p>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAircraft?.engineTsn ?? ""}
                      onChange={(e) =>
                        handleInputChange("engineTsn", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Time Since New"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.engineTsn == null || aircraft.engineTsn === ""
                        ? "N/A"
                        : numOrZero(aircraft.engineTsn)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Engine TSO</p>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={numberInputValue(editAircraft?.engineTso)}
                      onChange={(e) =>
                        handleInputChange("engineTso", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Time Since Overhaul"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {numOrZero(aircraft.engineTso)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Engine ARC</p>
                  <div>
                    {isEditMode ? (
                      <>
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
                                engineARCFile
                                  ? "text-gray-900"
                                  : "text-gray-400"
                              }
                            >
                              {engineARCFileName
                                ? engineARCFileName
                                : "Choose file or N/A"}
                            </span>
                            <Upload className="w-4 h-4 text-gray-400" />
                          </label>
                        </div>
                        {engineARCFileName && (
                          <button
                            onClick={handleEngineCancel}
                            className="text-xs text-red-600 hover:text-red-700 mt-1"
                          >
                            Remove file
                          </button>
                        )}
                      </>
                    ) : aircraft.engineArc?.trim() ? (
                      <div className="flex flex-col gap-1">
                        {isArcImage(aircraft.engineArc) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleViewArc("engine_arc", aircraft.engineArc!)
                            }
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                          >
                            <Eye className="w-4 h-4 flex-shrink-0" />
                            View
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadArc(
                                "engine_arc",
                                aircraft.engineArc!,
                                aircraft.engineArc!.split("/").pop() ||
                                  "engine_arc"
                              )
                            }
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                          >
                            <Download className="w-4 h-4 flex-shrink-0" />
                            Download
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">N/A</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Propeller Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">
                Propeller Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Propeller Model
                  </p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.propellerModel ?? ""}
                      onChange={(e) =>
                        handleInputChange("propellerModel", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.propellerModel
                        ? aircraft.propellerModel
                        : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Propeller Serial Number
                  </p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.propellerSerialNumber ?? ""}
                      onChange={(e) =>
                        handleInputChange(
                          "propellerSerialNumber",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.propellerSerialNumber
                        ? aircraft.propellerSerialNumber
                        : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">
                    Propeller Life Time Limit
                  </p>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAircraft?.propellerLifeTimeLimit ?? 0}
                      onChange={(e) =>
                        handleInputChange(
                          "propellerLifeTimeLimit",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.propellerLifeTimeLimit ||
                      aircraft.propellerLifeTimeLimit === 0
                        ? aircraft.propellerLifeTimeLimit
                        : "N/A"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Propeller TSN</p>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAircraft?.propellerTsn ?? ""}
                      onChange={(e) =>
                        handleInputChange("propellerTsn", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Time Since New"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.propellerTsn == null ||
                      aircraft.propellerTsn === ""
                        ? "N/A"
                        : numOrZero(aircraft.propellerTsn)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Propeller TSO</p>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={numberInputValue(editAircraft?.propellerTso)}
                      onChange={(e) =>
                        handleInputChange("propellerTso", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Time Since Overhaul"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {numOrZero(aircraft.propellerTso)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Propeller ARC</p>
                  <div>
                    {isEditMode ? (
                      <>
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
                                propellerARCFile
                                  ? "text-gray-900"
                                  : "text-gray-400"
                              }
                            >
                              {propellerARCFileName
                                ? propellerARCFileName
                                : "Choose file or N/A"}
                            </span>
                            <Upload className="w-4 h-4 text-gray-400" />
                          </label>
                        </div>
                        {propellerARCFileName && (
                          <button
                            onClick={handlePropellerCancel}
                            className="text-xs text-red-600 hover:text-red-700 mt-1"
                          >
                            Remove file
                          </button>
                        )}
                      </>
                    ) : aircraft.propellerArc?.trim() ? (
                      <div className="flex flex-col gap-1">
                        {isArcImage(aircraft.propellerArc) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleViewArc(
                                "propeller_arc",
                                aircraft.propellerArc!
                              )
                            }
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                          >
                            <Eye className="w-4 h-4 flex-shrink-0" />
                            View
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadArc(
                                "propeller_arc",
                                aircraft.propellerArc!,
                                aircraft.propellerArc!.split("/").pop() ||
                                  "propeller_arc"
                              )
                            }
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
                          >
                            <Download className="w-4 h-4 flex-shrink-0" />
                            Download
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-900">0</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <Spinner />
        )}
      </div>

      {/* File View Modal – Engine ARC / Propeller ARC */}
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
                  {(fileViewMimeType?.startsWith("image/") ||
                    fileViewMimeType === "image/jpeg" ||
                    fileViewMimeType === "image/jpg") && (
                    <img
                      src={fileViewBlobUrl}
                      alt="File preview"
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  )}
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
    </>
  );
}
