import { X, FileText } from "lucide-react";
import { AircraftTechnicalLog } from "../api/aircraftTechnicalLogApi";

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
  if (!isOpen || !entry) return null;

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

  // Format date from YYYY-MM-DD to MM/DD/YYYY
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "N/A";
      return `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date
        .getDate()
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`;
    } catch {
      return "N/A";
    }
  };

  // Format nature of flight
  const formatNatureOfFlight = (nature: string | undefined) => {
    if (!nature) return "N/A";
    const mapping: Record<string, string> = {
      TR: "TR - Training Flight",
      PSF: "PSF - Post Flight Inspection",
      PRF: "PRF - Pre Flight Inspection",
      EGR: "EGR - Engine Run-up",
      ME: "ME - Maintenance Entry",
      "TR W/ PIREM": "TR W/ PIREM - Training Flight with Pilot Remarks",
      VOID: "VOID",
      VE: "VE - Vehicle",
      EOR: "EOR - End of Run",
      OTHER: "OTHER",
    };
    return mapping[nature] || nature || "N/A";
  };

  // Use fullEntry data if available, otherwise use entry data with defaults
  const detailData = fullEntry
    ? {
        seqNo: displayValue(fullEntry.sequenceNo || entry.seqNo),
        acReg: displayValue(fullEntry.aircraft?.registration || entry.acReg),
        natureOfFlight: formatNatureOfFlight(fullEntry.natureOfFlight),
        // Off-blocks/Origin
        offBlocksDate: formatDate(fullEntry.originDate),
        offBlocksTime: displayValue(fullEntry.originTime),
        offBlocksStation: displayValue(fullEntry.originStation),
        // On-blocks/Destination
        onBlocksDate: formatDate(fullEntry.destinationDate),
        onBlocksTime: displayValue(fullEntry.destinationTime),
        onBlocksStation: displayValue(fullEntry.destinationStation),
        totalFlightTime:
          fullEntry.hobbsMeterTotal || fullEntry.tachometerTotal
            ? `${fullEntry.hobbsMeterTotal || fullEntry.tachometerTotal || 0}h`
            : "N/A",
        numberOfLandings: displayValue(fullEntry.numberOfLandings),
        // Fuel
        fuelQtyLeft: displayValue(fullEntry.fuelQtyLeftPriorDeparture),
        fuelQtyRight: displayValue(fullEntry.fuelQtyRightPriorDeparture),
        upliftQtyLeft: displayValue(fullEntry.fuelQtyLeftUpliftQty),
        upliftQtyRight: displayValue(fullEntry.fuelQtyRightUpliftQty),
        // Oil
        oilQty: displayValue(fullEntry.oilQtyUpliftQty),
        // Tachometer & Hobbs
        tachometerStart: displayValue(fullEntry.tachometerStart),
        tachometerEnd: displayValue(fullEntry.tachometerEnd),
        tachometerTotal: displayValue(fullEntry.tachometerTotal),
        hobbsMeterStart: displayValue(fullEntry.hobbsMeterStart),
        hobbsMeterEnd: displayValue(fullEntry.hobbsMeterEnd),
        hobbsMeterTotal: displayValue(fullEntry.hobbsMeterTotal),
        // Inspection & Service
        nextInspectionDue: displayValue(fullEntry.nextInspectionDue),
        returnToServiceHrs: displayValue(fullEntry.tachTimeDue),
        // Remarks
        pilotReport: displayValue(fullEntry.remarks?.split("\n")[0]),
        maintenanceEntry: displayValue(
          fullEntry.remarks?.split("\n").slice(1).join("\n")
        ),
        actionsTaken: displayValue(fullEntry.actionsTaken),
        // Signatures
        pilotName: displayValue(entry.pilot),
        pilotLicense: "N/A",
        mechanicName: "N/A",
        mechanicLicense: "N/A",
        dateTime:
          fullEntry.destinationDate && fullEntry.destinationTime
            ? `${formatDate(fullEntry.destinationDate)} ${
                fullEntry.destinationTime
              }`
            : displayValue(entry.date),
        // Airframe & Component - These are not in the API response currently
        airframeTime: "N/A",
        engineTime: "N/A",
        propellerTime: "N/A",
        approvedOrg: "N/A",
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
        fuelQtyLeft: "28.5",
        fuelQtyRight: "28.5",
        upliftQtyLeft: "15.0",
        upliftQtyRight: "15.0",
        oilQty: "7.5",
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
        pilotLicense: "127409",
        mechanicName: "Vandervorf, Kayla",
        mechanicLicense: "160476-AMT",
        dateTime: `${entry.date} 10:45`,
        airframeTime: "1427.11",
        engineTime: "373.1",
        propellerTime: "760.9",
        approvedOrg: "",
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

            {/* Sequence Number & Aircraft Registration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <h3 className="text-gray-900 mb-3">On-Blocks / Destination</h3>
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

            {/* Route & Total Flight Time & Landings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Route
                </label>
                <p className="text-gray-900">{displayValue(entry.route)}</p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Total Flight Time
                </label>
                <p className="text-gray-900">
                  {displayValue(detailData.totalFlightTime)}
                </p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Number of Landings
                </label>
                <p className="text-gray-900">
                  {displayValue(detailData.numberOfLandings)}
                </p>
              </div>
            </div>

            {/* Fuel & Oil Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fuel Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Fuel Qty. (Gals)</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">
                      Left
                    </label>
                    <p className="text-gray-900">
                      {displayValue(detailData.fuelQtyLeft)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">
                      Right
                    </label>
                    <p className="text-gray-900">
                      {displayValue(detailData.fuelQtyRight)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Uplift Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Uplift Qty.</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">
                      Left
                    </label>
                    <p className="text-gray-900">
                      {displayValue(detailData.upliftQtyLeft)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">
                      Right
                    </label>
                    <p className="text-gray-900">
                      {displayValue(detailData.upliftQtyRight)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Oil Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Oil Qty. (QTS)</h3>
                <p className="text-gray-900">
                  {displayValue(detailData.oilQty)}
                </p>
              </div>
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
                      Total
                    </label>
                    <p className="text-gray-900">
                      {displayValue(detailData.tachometerTotal)}
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
                      Total
                    </label>
                    <p className="text-gray-900">
                      {displayValue(detailData.hobbsMeterTotal)}
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

            {/* Component Record */}
            {(detailData.airframeTime ||
              detailData.engineTime ||
              detailData.propellerTime) && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">Component Record</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {detailData.airframeTime &&
                    detailData.airframeTime !== "N/A" && (
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">
                          Airframe Time
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.airframeTime)}
                        </p>
                      </div>
                    )}
                  {detailData.engineTime && detailData.engineTime !== "N/A" && (
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">
                        Engine Time
                      </label>
                      <p className="text-gray-900">
                        {displayValue(detailData.engineTime)}
                      </p>
                    </div>
                  )}
                  {detailData.propellerTime &&
                    detailData.propellerTime !== "N/A" && (
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">
                          Propeller Time
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.propellerTime)}
                        </p>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Signatures Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pilot Signature */}
              {(detailData.pilotName || detailData.pilotLicense) && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">Pilot's Acceptance</h3>
                  <div className="space-y-3">
                    {detailData.pilotName && detailData.pilotName !== "N/A" && (
                      <div>
                        <label className="block text-gray-600 text-sm mb-1">
                          Name
                        </label>
                        <p className="text-gray-900">
                          {displayValue(detailData.pilotName)}
                        </p>
                      </div>
                    )}
                    {detailData.pilotLicense &&
                      detailData.pilotLicense !== "N/A" && (
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            License No.
                          </label>
                          <p className="text-gray-900">
                            {displayValue(detailData.pilotLicense)}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Mechanic Signature */}
              {(detailData.mechanicName || detailData.mechanicLicense) && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-gray-900 mb-3">PIC Name & Signature</h3>
                  <div className="space-y-3">
                    {detailData.mechanicName &&
                      detailData.mechanicName !== "N/A" && (
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            Name
                          </label>
                          <p className="text-gray-900">
                            {displayValue(detailData.mechanicName)}
                          </p>
                        </div>
                      )}
                    {detailData.mechanicLicense &&
                      detailData.mechanicLicense !== "N/A" && (
                        <div>
                          <label className="block text-gray-600 text-sm mb-1">
                            License No.
                          </label>
                          <p className="text-gray-900">
                            {displayValue(detailData.mechanicLicense)}
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* Date & Time / Approved Organization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Date & Time (UTC)
                </label>
                <p className="text-gray-900">
                  {displayValue(detailData.dateTime)}
                </p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Approved Maintenance Organization
                </label>
                <p className="text-gray-900">
                  {displayValue(detailData.approvedOrg)}
                </p>
              </div>
            </div>
          </div>
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
    </div>
  );
}
