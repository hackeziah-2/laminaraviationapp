import { X, FileText, Download, Eye, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  AircraftTechnicalLog,
  getAircraftTechnicalLogById,
} from "../api/aircraftTechnicalLogApi";
import { normalizeStoredFilePath } from "../api/fileUploadApi";
import { Spinner } from "./ui/spinner";
import {
  formatTimeZuluMilitary,
  computeTotalBlockTimeFromUtc,
  formatDisplayDate,
  formatOptionalNumber2dp,
} from "../utility/utils";

function isExternalUrl(value: string | undefined | null): boolean {
  return /^https?:\/\//i.test((value ?? "").trim());
}

function atlStoredFilePath(value: string | undefined | null): string {
  const v = (value ?? "").trim();
  if (!v || isExternalUrl(v)) return "";
  return v;
}

function getMimeFromFilename(path: string): string | null {
  const ext = (path.split("/").pop() || path).split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return null;
}

function isImageFilePath(path: string): boolean {
  const mime = getMimeFromFilename(path);
  return !!(mime && mime.startsWith("image/"));
}

interface LogbookEntry {
  id: number;
  line: number;
  seqNo: string;
  date: string;
  acReg: string;
  route: string;
  fltTime: string;
  pilot: string;
  status: "Serviceable" | "Under Maintenance";
}

interface ViewTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LogbookEntry | null;
  fullEntry?: AircraftTechnicalLog | null; // AircraftTechnicalLog - if provided will use this instead of mock data
}

export function ViewTechnicalLogbookEntryModal({
  isOpen,
  onClose,
  entry,
  fullEntry,
}: ViewTechnicalLogbookEntryModalProps) {
  const [fetchedEntry, setFetchedEntry] = useState<AircraftTechnicalLog | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFileViewModal, setShowFileViewModal] = useState(false);
  const [fileViewBlobUrl, setFileViewBlobUrl] = useState<string | null>(null);
  const [fileViewMimeType, setFileViewMimeType] = useState<string | null>(null);
  const [fileViewLoading, setFileViewLoading] = useState(false);
  const [fileViewError, setFileViewError] = useState<string | null>(null);

  // Fetch entry details by ID when modal opens
  useEffect(() => {
    if (isOpen && entry?.id) {
      const fetchEntryDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await getAircraftTechnicalLogById(entry.id);
          setFetchedEntry(data);
        } catch (err) {
          console.error("Error fetching entry details:", err);
          setError("Failed to load entry details");
        } finally {
          setTimeout(() => setLoading(false), 360);
        }
      };

      fetchEntryDetails();
    } else {
      // Reset state when modal closes
      setFetchedEntry(null);
      setError(null);
      setTimeout(() => setLoading(false), 360);
    }
  }, [isOpen, entry?.id]);

  if (!isOpen || !entry) return null;

  const closeFileViewModal = () => {
    if (fileViewBlobUrl) window.URL.revokeObjectURL(fileViewBlobUrl);
    setShowFileViewModal(false);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setFileViewError(null);
  };

  const handleDownloadAtlFile = async (
    folder: "white_atl" | "dfp",
    filePath: string,
    displayName?: string
  ) => {
    const normalized = normalizeStoredFilePath(filePath);
    if (!normalized) return;
    try {
      const { downloadModuleFile } = await import("../api/fileUploadApi");
      const blob = await downloadModuleFile(folder, normalized);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        displayName || normalized.split("/").pop() || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ||
        (err as Error)?.message ||
        "Failed to download file.";
      await Swal.fire({
        icon: "error",
        title: "Download failed",
        text: message,
      });
    }
  };

  const handleViewAtlFile = async (
    folder: "white_atl" | "dfp",
    filePath: string
  ) => {
    const normalized = normalizeStoredFilePath(filePath);
    if (!normalized) return;
    setFileViewLoading(true);
    setFileViewError(null);
    setFileViewBlobUrl(null);
    setFileViewMimeType(null);
    setShowFileViewModal(true);
    try {
      const { downloadModuleFile } = await import("../api/fileUploadApi");
      const blob = await downloadModuleFile(folder, normalized);
      const url = window.URL.createObjectURL(blob);
      const serverType = blob.type || null;
      const isOctetStream =
        !serverType || serverType === "application/octet-stream";
      const mimeType = isOctetStream
        ? getMimeFromFilename(normalized)
        : serverType;
      setFileViewBlobUrl(url);
      setFileViewMimeType(mimeType ?? null);
      setFileViewError(null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } }; message?: string })
          ?.response?.data?.detail ||
        (err as Error)?.message ||
        "Failed to open file.";
      setFileViewError(message);
      setFileViewBlobUrl(null);
      setFileViewMimeType(null);
    } finally {
      setFileViewLoading(false);
    }
  };

  const renderAtlFileActions = (
    folder: "white_atl" | "dfp",
    filePath: string
  ) => (
    <div className="flex flex-col gap-1 mt-1">
      {isImageFilePath(filePath) && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
          onClick={() => handleViewAtlFile(folder, filePath)}
        >
          <Eye className="w-4 h-4 flex-shrink-0" />
          View
        </button>
      )}
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors text-left text-sm"
        onClick={() =>
          handleDownloadAtlFile(
            folder,
            filePath,
            filePath.split("/").pop() || folder
          )
        }
      >
        <Download className="w-4 h-4 flex-shrink-0" />
        Download
      </button>
    </div>
  );

  const renderWebLink = (url: string) => {
    const href = url.startsWith("http") ? url : `https://${url}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline text-sm"
      >
        Link
      </a>
    );
  };

  // Helper function to display N/A for empty values
  const displayValue = (value: string | undefined | null | number): string => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "string" && value.trim() === "") ||
      (typeof value === "number" && isNaN(value))
    ) {
      return "N/A";
    }
    return String(value);
  };

  const formatDate = (dateStr: string | undefined) =>
    formatDisplayDate(dateStr, { fallback: "N/A" });

  // Format time for view as military time (24-hour, HHMM, e.g. 1430, 2317)
  const formatTimeZulu = (timeStr: string | undefined) => {
    const result = formatTimeZuluMilitary(timeStr);
    return result === "-" ? "N/A" : result;
  };

  // Format airframe/engine/propeller time (number or string) for display
  const formatComponentTime = (
    value: number | string | undefined | null
  ): string => {
    if (value == null || value === "") return "-";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (Number.isNaN(num)) return "-";
    return String(num);
  };

  // Format nature of flight: VOID shows "VOID"; empty/n/a shows "-" (n/a is not equal to void)
  const formatNatureOfFlight = (nature: string | undefined) => {
    if (!nature || nature.trim() === "") return "-";
    if (nature === "VOID") return "VOID";
    const mapping: Record<string, string> = {
      TR: "TR - Training Flight",
      PSF: "PSF - Post Flight Inspection",
      PRF: "PRF - Pre Flight Inspection",
      EGR: "EGR - Engine Run-up",
      ME: "ME - Maintenance Entry",
      TR_WITH_PIREM: "TR W/ PIREM - Training Flight with Pilot Remarks",
      VOID: "VOID",
      VE: "VE - Vehicle",
      EOR: "EOR - End of Run",
      ATL_REPL: "ATL REPL",
      OTHER: "OTHER",
    };
    return mapping[nature] || nature || "-";
  };

  // Use fetchedEntry (from API) first, then fullEntry (from prop), otherwise use entry data with defaults
  const entryData = fetchedEntry || fullEntry;
  // Format work status for display (e.g. FOR_REVIEW -> "FOR REVIEW")
  const formatWorkStatus = (status: string | undefined): string => {
    if (!status || status.trim() === "") return "N/A";
    return status.replace(/_/g, " ");
  };

  const detailData = entryData
    ? {
        seqNo: displayValue(entryData.sequenceNo || entry.seqNo),
        workStatus: formatWorkStatus(entryData.workStatus),
        acReg: displayValue(entryData.aircraft?.registration || entry.acReg),
        natureOfFlight: formatNatureOfFlight(entryData.natureOfFlight),
        // Off-blocks/Origin
        offBlocksDate: formatDate(entryData.originDate),
        offBlocksTime: entryData.originTime
          ? formatTimeZulu(entryData.originTime)
          : "N/A",
        offBlocksStation: displayValue(entryData.originStation),
        // On-blocks/Destination
        onBlocksDate: formatDate(entryData.destinationDate),
        onBlocksTime: entryData.destinationTime
          ? formatTimeZulu(entryData.destinationTime)
          : "N/A",
        onBlocksStation: displayValue(entryData.destinationStation),
        totalFlightTime: computeTotalBlockTimeFromUtc(
          entryData.originDate,
          entryData.originTime,
          entryData.destinationDate,
          entryData.destinationTime
        ),
        numberOfLandings: displayValue(entryData.numberOfLandings),
        // Fuel
        fuelQtyLeftUpliftQty: displayValue(entryData.fuelQtyLeftUpliftQty),
        fuelQtyRightUpliftQty: displayValue(entryData.fuelQtyRightUpliftQty),
        fuelQtyLeftPriorDeparture: displayValue(
          entryData.fuelQtyLeftPriorDeparture
        ),
        fuelQtyRightPriorDeparture: displayValue(
          entryData.fuelQtyRightPriorDeparture
        ),
        fuelQtyLeftAfterOnBlks: displayValue(entryData.fuelQtyLeftAfterOnBlks),
        fuelQtyRightAfterOnBlks: displayValue(
          entryData.fuelQtyRightAfterOnBlks
        ),
        // Oil
        oilQtyUpliftQty: displayValue(entryData.oilQtyUpliftQty),
        oilQtyPriorDeparture: displayValue(entryData.oilQtyPriorDeparture),
        oilQtyAfterOnBlks: displayValue(entryData.oilQtyAfterOnBlks),
        // Tachometer & Hobbs (tachometerTotal = end - start; hobbsMeterTotal = end - start)
        tachometerStart: displayValue(entryData.tachometerStart),
        tachometerEnd: displayValue(entryData.tachometerEnd),
        tachometerTotal: formatOptionalNumber2dp(
          entryData.tachometerStart != null && entryData.tachometerEnd != null
            ? entryData.tachometerEnd - entryData.tachometerStart
            : entryData.tachometerTotal,
          "N/A"
        ),
        hobbsMeterStart: displayValue(entryData.hobbsMeterStart),
        hobbsMeterEnd: displayValue(entryData.hobbsMeterEnd),
        hobbsMeterTotal: formatOptionalNumber2dp(
          entryData.hobbsMeterStart != null && entryData.hobbsMeterEnd != null
            ? entryData.hobbsMeterEnd - entryData.hobbsMeterStart
            : entryData.hobbsMeterTotal,
          "N/A"
        ),
        // Inspection & Service
        nextInspectionDue: displayValue(entryData.nextInspectionDue),
        returnToServiceHrs: displayValue(entryData.tachTimeDue),
        // Remarks
        pilotReport: displayValue(entryData.remarks?.split("\n")[0]),
        maintenanceEntry: displayValue(
          entryData.remarks?.split("\n").slice(1).join("\n")
        ),
        actionsTaken: displayValue(entryData.actionsTaken),
        // Signatures
        pilotName: displayValue(entry.pilot),
        pilotAcceptDate: entryData.pilotAcceptDate
          ? formatDate(entryData.pilotAcceptDate)
          : "N/A",
        pilotAcceptTime: entryData.pilotAcceptTime
          ? formatTimeZulu(entryData.pilotAcceptTime)
          : "N/A",
        rtsName: "N/A", // Will need to fetch from account API using rtsSignedBy
        rtsDate: entryData.rtsDate ? formatDate(entryData.rtsDate) : "N/A",
        rtsTime: entryData.rtsTime ? formatTimeZulu(entryData.rtsTime) : "N/A",
        dateTime:
          entryData.destinationDate && entryData.destinationTime
            ? `${formatDate(entryData.destinationDate)} ${formatTimeZulu(
                entryData.destinationTime
              )}`
            : displayValue(entry.date),
        // Airframe, Engine & Propeller times (PREV / FLIGHT / TOTAL)
        airframePrevTime: formatComponentTime(
          (entryData as any).airframePrevTime
        ),
        airframeFlightTime: formatComponentTime(
          (entryData as any).airframeFlightTime
        ),
        airframeTotalTime: formatComponentTime(
          entryData.airframeTotalTime ?? (entryData as any).airframeTotalTime
        ),
        enginePrevTime: formatComponentTime((entryData as any).enginePrevTime),
        engineFlightTime: formatComponentTime(
          (entryData as any).engineFlightTime
        ),
        engineTotalTime: formatComponentTime(
          entryData.engineTotalTime ?? (entryData as any).engineTotalTime
        ),
        propellerPrevTime: formatComponentTime(
          (entryData as any).propellerPrevTime
        ),
        propellerFlightTime: formatComponentTime(
          (entryData as any).propellerFlightTime
        ),
        propellerTotalTime: formatComponentTime(
          entryData.propellerTotalTime ?? (entryData as any).propellerTotalTime
        ),
        airframeRunTime: formatComponentTime(entryData.airframeRunTime),
        airframeAftt: formatComponentTime(entryData.airframeAftt),
        engineRunTime: formatComponentTime(entryData.engineRunTime),
        engineTsn: entryData.engineTsn ?? "-",
        engineTso: formatComponentTime(entryData.engineTso),
        engineTbo: formatComponentTime(entryData.engineTbo),
        propellerRunTime: formatComponentTime(entryData.propellerRunTime),
        propellerTsn:
          entryData.propellerTsn != null ? String(entryData.propellerTsn) : "-",
        propellerTso: formatComponentTime(entryData.propellerTso),
        propellerTbo: formatComponentTime(entryData.propellerTbo),
        lifeTimeLimitEngine: formatComponentTime(entryData.lifeTimeLimitEngine),
        lifeTimeLimitPropeller: formatComponentTime(
          entryData.lifeTimeLimitPropeller
        ),
        whiteAtlFile: atlStoredFilePath(entryData.whiteAtl),
        whiteAtlWebLink: (entryData.whiteAtlWebLink?.trim() ||
          (isExternalUrl(entryData.whiteAtl) ? entryData.whiteAtl?.trim() : "")) as string,
        dfpFile: atlStoredFilePath(entryData.dfp),
        dfpWebLink: (entryData.dfpWebLink?.trim() ||
          (isExternalUrl(entryData.dfp) ? entryData.dfp?.trim() : "")) as string,
      }
    : {
        // Fallback to mock data if fullEntry is not provided
        seqNo: entry.seqNo,
        acReg: entry.acReg,
        natureOfFlight: "Training Flight",
        offBlocksDate: entry.date,
        offBlocksTime: "08:30",
        offBlocksStation: "RP-LB",
        onBlocksDate: entry.date,
        onBlocksTime: "10:45",
        onBlocksStation: "RP-CL",
        totalFlightTime: entry.fltTime,
        numberOfLandings: "1",
        fuelQtyLeftUpliftQty: "6",
        fuelQtyRightUpliftQty: "7",
        fuelQtyLeftPriorDeparture: "19",
        fuelQtyRightPriorDeparture: "19",
        fuelQtyLeftAfterOnBlks: "8",
        fuelQtyRightAfterOnBlks: "7",
        oilQtyUpliftQty: "-",
        oilQtyPriorDeparture: "6.6",
        oilQtyAfterOnBlks: "6.5",
        tachometerStart: "2163.0",
        tachometerEnd: "2164.2",
        tachometerTotal: "1.2",
        hobbsMeterStart: "4890.8",
        hobbsMeterEnd: "4893.0",
        hobbsMeterTotal: "2.2",
        nextInspectionDue: "120 HRS",
        returnToServiceHrs: "2164.2",
        pilotReport:
          "Aircraft performed normally throughout the flight. All systems operational. No discrepancies noted.",
        maintenanceEntry:
          "100-hour inspection completed. All systems checked and found serviceable.",
        actionsTaken:
          "Routine pre-flight inspection completed. Oil level checked and topped off.",
        pilotName: entry.pilot,
        pilotAcceptDate: "01 JAN 2024",
        pilotAcceptTime: "08:30Z",
        rtsName: "Vandervorf, Kayla",
        rtsDate: "01 JAN 2024",
        rtsTime: "10:45Z",
        dateTime: `${entry.date} 10:45`,
        airframePrevTime: "-",
        airframeFlightTime: "-",
        airframeTotalTime: "1427.11",
        enginePrevTime: "-",
        engineFlightTime: "-",
        engineTotalTime: "373.1",
        propellerPrevTime: "-",
        propellerFlightTime: "-",
        propellerTotalTime: "760.9",
        whiteAtlFile: "",
        whiteAtlWebLink: "",
        dfpFile: "",
        dfpWebLink: "",
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay with blur */}
      <div
        className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-gray-900">Aircraft Technical Logbook</h2>
            <p className="text-sm text-gray-600">
              Entry Details - {detailData.seqNo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <Spinner />
                <p className="text-sm text-gray-600">
                  Loading entry details...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={() => {
                    if (entry?.id) {
                      const fetchEntryDetails = async () => {
                        setLoading(true);
                        setError(null);
                        try {
                          const data = await getAircraftTechnicalLogById(
                            entry.id
                          );
                          setFetchedEntry(data);
                        } catch (err) {
                          console.error("Error fetching entry details:", err);
                          setError("Failed to load entry details");
                        } finally {
                          setTimeout(() => setLoading(false), 360);
                        }
                      };
                      fetchEntryDetails();
                    }
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Status Badge */}
              {/* <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  entry.status === "Serviceable"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {entry.status}
              </span>
            </div> */}

              {/* Sequence No. | Work Status | A/C Registration (aligned with Edit) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Sequence No.
                  </label>
                  <p className="text-gray-900">
                    {displayValue(detailData.seqNo)}
                  </p>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Work Status
                  </label>
                  <p className="text-gray-900">{detailData.workStatus}</p>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    A/C Registration
                  </label>
                  <p className="text-gray-900">
                    {displayValue(detailData.acReg)}
                  </p>
                </div>
              </div>

              {/* Nature of Flight */}
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Nature of Flight
                </label>
                <p className="text-gray-900">
                  {displayValue(detailData.natureOfFlight)}
                </p>
              </div>

              {/* Off-Blocks/Origin & On-Blocks/Destination */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Off-Blocks/Origin */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Off-Blocks / Origin</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">
                        Station (STN)
                      </label>
                      <p className="text-gray-900">
                        {displayValue(detailData.offBlocksStation)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">
                          Date (UTC)
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.offBlocksDate)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">
                          Time (UTC)
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.offBlocksTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* On-Blocks/Destination */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">
                    On-Blocks / Destination
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">
                        Station (STN)
                      </label>
                      <p className="text-gray-900">
                        {displayValue(detailData.onBlocksStation)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">
                          Date (UTC)
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.onBlocksDate)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">
                          Time (UTC)
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.onBlocksTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Route */}
              <div className="mb-4">
                <label className="block text-gray-600 text-sm mb-1">
                  Route
                </label>
                <p className="text-gray-900">{displayValue(entry.route)}</p>
              </div>

              {/* Total Flight hours (Destination - Origin, else 0) & Number of Landings */}
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 border-r border-gray-300">
                        Total Flight hours
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900">
                        Number of Landings
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-r border-gray-300 text-gray-900">
                        {displayValue(detailData.totalFlightTime)}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {displayValue(detailData.numberOfLandings)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Fuel & Oil Section - Table Format */}
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300"></th>
                      <th
                        colSpan={3}
                        className="px-4 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300"
                      >
                        FUEL QTY. (GALS)
                      </th>
                      <th
                        colSpan={3}
                        className="px-4 py-2 text-center text-xs font-semibold text-gray-900"
                      >
                        OIL QTY. (QTS)
                      </th>
                    </tr>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300"></th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        UPLIFT QTY.
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        PRIOR DEPARTURE
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        AFTER ON-BLKS
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        UPLIFT QTY.
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 border-r border-gray-300">
                        PRIOR DEPARTURE
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900">
                        AFTER ON-BLKS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {/* Row label - LEFT first (aviation convention) */}
                      <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-white">
                        LEFT
                      </td>
                      {/* FUEL - UPLIFT QTY LEFT */}
                      <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-300">
                        {displayValue(detailData.fuelQtyLeftUpliftQty)}
                      </td>
                      {/* FUEL - PRIOR DEPARTURE LEFT */}
                      <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-300">
                        {displayValue(detailData.fuelQtyLeftPriorDeparture)}
                      </td>
                      {/* FUEL - AFTER ON-BLKS LEFT */}
                      <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-300">
                        {displayValue(detailData.fuelQtyLeftAfterOnBlks)}
                      </td>
                      {/* OIL - Empty cells for alignment */}
                      <td className="px-3 py-2 border-r border-gray-300"></td>
                      <td className="px-3 py-2 border-r border-gray-300"></td>
                      <td className="px-3 py-2"></td>
                    </tr>
                    <tr>
                      {/* Row label - RIGHT */}
                      <td className="px-3 py-2 text-center text-xs font-medium text-gray-900 border-r border-gray-300 bg-white">
                        RIGHT
                      </td>
                      {/* FUEL - UPLIFT QTY RIGHT */}
                      <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-300">
                        {displayValue(detailData.fuelQtyRightUpliftQty)}
                      </td>
                      {/* FUEL - PRIOR DEPARTURE RIGHT */}
                      <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-300">
                        {displayValue(detailData.fuelQtyRightPriorDeparture)}
                      </td>
                      {/* FUEL - AFTER ON-BLKS RIGHT */}
                      <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-300">
                        {displayValue(detailData.fuelQtyRightAfterOnBlks)}
                      </td>
                      {/* OIL - UPLIFT QTY */}
                      <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-300">
                        {displayValue(detailData.oilQtyUpliftQty)}
                      </td>
                      {/* OIL - PRIOR DEPARTURE */}
                      <td className="px-3 py-2 text-center text-gray-900 border-r border-gray-300">
                        {displayValue(detailData.oilQtyPriorDeparture)}
                      </td>
                      {/* OIL - AFTER ON-BLKS */}
                      <td className="px-3 py-2 text-center text-gray-900">
                        {displayValue(detailData.oilQtyAfterOnBlks)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tachometer & Hobbs Meter */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tachometer */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Tachometer</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-600 text-xs mb-1">
                          Start
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.tachometerStart)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-gray-600 text-xs mb-1">
                          End
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.tachometerEnd)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">
                        Tachometer Total
                      </label>
                      <p className="text-gray-900">
                        {detailData.tachometerTotal}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hobbs Meter */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Hobbs Meter</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-gray-600 text-xs mb-1">
                          Start
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.hobbsMeterStart)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-gray-600 text-xs mb-1">
                          End
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.hobbsMeterEnd)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">
                        Hobbs Meter Total
                      </label>
                      <p className="text-gray-900">
                        {detailData.hobbsMeterTotal}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspection & Service */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Next Inspection Due
                  </label>
                  <p className="text-gray-900">
                    {displayValue(detailData.nextInspectionDue)}
                  </p>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    Return to Service (HRS)
                  </label>
                  <p className="text-gray-900">
                    {displayValue(detailData.returnToServiceHrs)}
                  </p>
                </div>
              </div>

              {/* Remarks Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-2">
                    Pilot Report
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-900 text-sm leading-relaxed">
                      {displayValue(detailData.pilotReport)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-2">
                    Maintenance Entry
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-900 text-sm leading-relaxed">
                      {displayValue(detailData.maintenanceEntry)}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-2">
                    Actions Taken
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-900 text-sm leading-relaxed">
                      {displayValue(detailData.actionsTaken)}
                    </p>
                  </div>
                </div>
              </div>

              {/* AIRFRAME, ENGINE & PROPELLER TIMES - 3×3 grid (PREV / FLIGHT / TOTAL) */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 font-medium mb-3">
                  AIRFRAME, ENGINE & PROPELLER TIMES
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700 border-b border-r border-gray-300 w-28">
                          {" "}
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 border-b border-r border-gray-300">
                          AIRFRAME
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 border-b border-r border-gray-300">
                          ENGINE
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700 border-b border-gray-300">
                          PROPELLER
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 border-r border-gray-200 bg-gray-50">
                          PREV. TIME
                        </td>
                        <td className="px-4 py-2 border-r border-gray-200">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.airframePrevTime ?? "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-gray-200">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.enginePrevTime ?? "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.propellerPrevTime ?? "-"}
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 border-r border-gray-200 bg-gray-50">
                          FLIGHT TIME
                        </td>
                        <td className="px-4 py-2 border-r border-gray-200">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.airframeFlightTime ?? "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-gray-200">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.engineFlightTime ?? "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.propellerFlightTime ?? "-"}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 border-r border-gray-200 bg-gray-50">
                          TOTAL TIME
                        </td>
                        <td className="px-4 py-2 border-r border-gray-200">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.airframeTotalTime ?? "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-gray-200">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.engineTotalTime ?? "-"}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 min-h-[2.25rem] flex items-center">
                            {detailData.propellerTotalTime ?? "-"}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ATL component times: RUN TIME / AFTT / TSN / TSO / TBO — connected to ATL endpoint */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr>
                        <th
                          colSpan={2}
                          className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-gray-200"
                        >
                          AIRFRAME
                        </th>
                        <th
                          colSpan={4}
                          className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-gray-200"
                        >
                          ENGINE
                        </th>
                        <th
                          colSpan={4}
                          className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-gray-200"
                        >
                          PROPELLER
                        </th>
                      </tr>
                      <tr>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          RUN TIME
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          AFTT
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          RUN TIME
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TSN
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TSO
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TBO
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          RUN TIME
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TSN
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TSO
                        </th>
                        <th className="border border-gray-300 px-2 py-1.5 text-center text-xs font-medium text-gray-700 bg-gray-100">
                          TBO
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-300">
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.airframeRunTime ?? "0"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.airframeAftt ?? "-"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.engineRunTime ?? "0"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.engineTsn ?? "0"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.engineTso ?? "-"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.engineTbo ?? "-"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.propellerRunTime ?? "0"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.propellerTsn ?? "-"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.propellerTso ?? "-"}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 bg-white text-center text-sm text-gray-900">
                          {detailData.propellerTbo ?? "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Component Parts Section */}
              {entryData?.componentParts &&
                Array.isArray(entryData.componentParts) &&
                entryData.componentParts.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-gray-900 mb-3">Component Parts</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-200">
                            <th
                              rowSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border border-gray-300"
                            >
                              QTY
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border border-gray-300"
                            >
                              UNIT
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border border-gray-300"
                            >
                              PARTS REMOVED
                            </th>
                            <th
                              colSpan={2}
                              className="px-3 py-2 text-center text-xs font-medium text-gray-900 border border-gray-300"
                            >
                              PARTS INSTALLED
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-900 border border-gray-300"
                            >
                              NOMENCLATURE
                            </th>
                            <th
                              rowSpan={2}
                              className="px-3 py-2 text-left text-xs font-medium text-gray-900 border border-gray-300"
                            >
                              ATA CHAPTER
                            </th>
                          </tr>
                          <tr className="bg-gray-200">
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border border-gray-300">
                              P/N
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border border-gray-300">
                              S/N
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border border-gray-300">
                              P/N
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-900 border border-gray-300">
                              S/N
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {entryData.componentParts.map((part: any, index) => (
                            <tr
                              key={part.id || index}
                              className="bg-white hover:bg-gray-50"
                            >
                              <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300 text-center">
                                {displayValue(part.qty)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300 text-center">
                                {part.unit || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300">
                                {part.removedPartNo || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300">
                                {part.removedSerialNo || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300">
                                {part.installedPartNo || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300">
                                {part.installedSerialNo || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300">
                                {part.nomenclature || "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 border border-gray-300">
                                {part.ataChapter || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Signatures Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pilot Signature */}
                {(detailData.pilotName ||
                  detailData.pilotAcceptDate ||
                  detailData.pilotAcceptTime) && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-gray-900 mb-3">Pilot's Acceptance</h3>
                    <div className="space-y-3">
                      {detailData.pilotName &&
                        detailData.pilotName !== "N/A" && (
                          <div>
                            <label className="block text-gray-600 text-sm mb-1">
                              Name
                            </label>
                            <p className="text-gray-900">
                              {displayValue(detailData.pilotName)}
                            </p>
                          </div>
                        )}
                      {detailData.pilotAcceptDate &&
                        detailData.pilotAcceptDate !== "N/A" && (
                          <div>
                            <label className="block text-gray-600 text-sm mb-1">
                              Date
                            </label>
                            <p className="text-gray-900">
                              {displayValue(detailData.pilotAcceptDate)}
                            </p>
                          </div>
                        )}
                      {detailData.pilotAcceptTime &&
                        detailData.pilotAcceptTime !== "N/A" && (
                          <div>
                            <label className="block text-gray-600 text-sm mb-1">
                              Time (Zulu)
                            </label>
                            <p className="text-gray-900 font-mono">
                              {displayValue(detailData.pilotAcceptTime)}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                )}

                {/* Return to Service */}
                {(detailData.rtsName ||
                  detailData.rtsDate ||
                  detailData.rtsTime) && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="text-gray-900 mb-3">Return to Service</h3>
                    <div className="space-y-3">
                      {detailData.rtsName && detailData.rtsName !== "N/A" && (
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Name
                          </label>
                          <p className="text-gray-900">
                            {displayValue(detailData.rtsName)}
                          </p>
                        </div>
                      )}
                      {detailData.rtsDate && detailData.rtsDate !== "N/A" && (
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Date
                          </label>
                          <p className="text-gray-900">
                            {displayValue(detailData.rtsDate)}
                          </p>
                        </div>
                      )}
                      {detailData.rtsTime && detailData.rtsTime !== "N/A" && (
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Time (Zulu)
                          </label>
                          <p className="text-gray-900 font-mono">
                            {displayValue(detailData.rtsTime)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* White ATL / DFP */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    White ATL
                  </label>
                  {detailData.whiteAtlFile ? (
                    renderAtlFileActions("white_atl", detailData.whiteAtlFile)
                  ) : (
                    <p className="text-gray-400">N/A</p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    DFP
                  </label>
                  {detailData.dfpFile ? (
                    renderAtlFileActions("dfp", detailData.dfpFile)
                  ) : (
                    <p className="text-gray-400">N/A</p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    White ATL Weblink
                  </label>
                  {detailData.whiteAtlWebLink ? (
                    renderWebLink(detailData.whiteAtlWebLink)
                  ) : (
                    <p className="text-gray-400">N/A</p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">
                    DFP Weblink
                  </label>
                  {detailData.dfpWebLink ? (
                    renderWebLink(detailData.dfpWebLink)
                  ) : (
                    <p className="text-gray-400">N/A</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* File preview (images) */}
      {showFileViewModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
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
                  <Loader2 className="w-8 h-8 animate-spin" />
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
                  {fileViewMimeType?.startsWith("image/") && (
                    <img
                      src={fileViewBlobUrl}
                      alt="File preview"
                      className="max-w-full max-h-[70vh] object-contain"
                    />
                  )}
                  {!fileViewMimeType?.startsWith("image/") && (
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
