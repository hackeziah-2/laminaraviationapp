import {
  ArrowLeft,
  Printer,
  Download,
  Pencil,
  FileText,
  Save,
  X,
} from "lucide-react";
import { type } from "os";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAircraftById, updateAircraft } from "../api/aircraftApi";
import { Spinner } from "./ui/spinner";
import { Aircraft } from "../types/Aircraft";

export function AircraftDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editAircraft, setEditedAircraft] = useState<Aircraft | null>(null);
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    getAircraftById(Number(id))
      .then((res) => {
        const data = res.data;
        const mappedAircraft: Aircraft = {
          id: data.id,
          registration: data.registration,
          type: data.type,
          model: data.model,
          msn: data.msn,
          base: data.base,
          ownership: data.ownership,
          status: data.status,
          manufacturer: data.manufacturer,
          reportDescription: data.report_description,
          airframeModel: data.airframe_model,
          airframeServiceManual: data.airframe_service_manual,
          airframeSerialNumber: data.engine_serial_number,
          airframeIpc: data.airframe_ipc,

          engineModel: data.engine_model,
          engineSerialNumber: data.engine_serial_number,
          engineArc: data?.engine_arc?.replace("uploads/", ""),
          propellerModel: data.propeller_model,
          propellerSerialNumber: data.propeller_serial_number,
          propellerArc: data?.propeller_arc?.replace("uploads/", ""),
        };

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
    const updatedData = {
      registration: editAircraft?.registration,
      manufacturer: editAircraft?.manufacturer,
      report_description: editAircraft?.reportDescription,
      type: editAircraft?.type,
      model: editAircraft?.model,
      msn: editAircraft?.msn,
      base: editAircraft?.base,
      ownership: editAircraft?.ownership,
      status: editAircraft?.status,

      airframe_model: editAircraft?.airframeModel,
      airframe_service_manual: editAircraft?.airframeServiceManual,
      airframe_serial_number: editAircraft?.airframeSerialNumber,
      airframe_ipc: editAircraft?.airframeIpc,

      engine_model: editAircraft?.engineModel,
      engine_serial_number: editAircraft?.engineSerialNumber,
      engine_arc: editAircraft?.engineArc,

      propeller_model: editAircraft?.propellerModel,
      propeller_serial_number: editAircraft?.propellerSerialNumber,
      propeller_arc: editAircraft?.propellerArc,
    };
    try {
      const response = await updateAircraft(Number(id), updatedData);
      const updatedAircraft: Aircraft = response;

      setEditedAircraft(updatedAircraft);
      setAircraft(updatedAircraft);
      console.log(updatedAircraft, "updatedAircraft");
      // setIsEditMode(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes.");
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
                <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-700 flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={handleEditClick}
                  className="px-3 sm:px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
                >
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Aircraft</span>
                </button>
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
                <button
                  onClick={handleSaveEdit}
                  className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
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
                  <p className="text-xs text-gray-500 mb-1.5">Aircraft Type</p>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editAircraft?.type ?? ""}
                      onChange={(e) =>
                        handleInputChange("type", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {aircraft.type ? aircraft.type : "N/A"}
                    </p>
                  )}
                </div>
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
              </div>
            </div>

            {/* Airframe Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-gray-900 mb-4 sm:mb-5 text-base sm:text-lg">
                Airframe Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-8 gap-y-4 sm:gap-y-5">
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
                  <p className="text-xs text-gray-500 mb-1.5">Engine ARC</p>
                  {aircraft.engineArc ? (
                    <a
                      href="#"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        // In a real app, this would trigger the file download
                        alert("File download would start here");
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{aircraft.engineArc}</span>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <p className="text-gray-900">N/A</p>
                  )}
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
                  <p className="text-xs text-gray-500 mb-1.5">Propeller ARC</p>
                  {aircraft.propellerArc ? (
                    <a
                      href="#"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        // In a real app, this would trigger the file download
                        alert("File download would start here");
                      }}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{aircraft.propellerArc}</span>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <p className="text-gray-900">N/A</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <Spinner />
        )}
      </div>
    </>
  );
}
