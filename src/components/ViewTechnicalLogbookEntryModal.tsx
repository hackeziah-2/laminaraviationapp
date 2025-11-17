import { X, FileText } from 'lucide-react';

interface LogbookEntry {
  id: number;
  line: number;
  reqNo: string;
  date: string;
  acReg: string;
  route: string;
  fltTime: string;
  pilot: string;
  status: 'Serviceable' | 'Under Maintenance';
}

interface ViewTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LogbookEntry | null;
}

export function ViewTechnicalLogbookEntryModal({ isOpen, onClose, entry }: ViewTechnicalLogbookEntryModalProps) {
  if (!isOpen || !entry) return null;

  // Mock detailed data - in a real app, this would be fetched based on entry.id
  const detailData = {
    seqNo: entry.reqNo,
    acReg: entry.acReg,
    natureOfFlight: 'Training Flight',
    // Off-blocks/Origin
    offBlocksDate: entry.date,
    offBlocksTime: '08:30',
    offBlocksStation: 'RP-LB',
    // On-blocks/Destination
    onBlocksDate: entry.date,
    onBlocksTime: '10:45',
    onBlocksStation: 'RP-CL',
    totalFlightTime: entry.fltTime,
    // Fuel
    fuelQtyLeft: '28.5',
    fuelQtyRight: '28.5',
    upliftQtyLeft: '15.0',
    upliftQtyRight: '15.0',
    // Oil
    oilQty: '7.5',
    // Tachometer & Hobbs
    tachometerStart: '2163.0',
    tachometerEnd: '2164.2',
    tachometerTotal: '1.2',
    hobbsMeterStart: '4890.8',
    hobbsMeterEnd: '4893.0',
    hobbsMeterTotal: '2.2',
    // Inspection & Service
    nextInspectionDue: '120 HRS',
    returnToServiceHrs: '2164.2',
    // Remarks
    pilotReport: 'Aircraft performed normally throughout the flight. All systems operational. No discrepancies noted.',
    maintenanceEntry: '100-hour inspection completed. All systems checked and found serviceable.',
    actionsTaken: 'Routine pre-flight inspection completed. Oil level checked and topped off.',
    // Signatures
    pilotName: entry.pilot,
    pilotLicense: '127409',
    mechanicName: 'Vandervorf, Kayla',
    mechanicLicense: '160476-AMT',
    dateTime: `${entry.date} 10:45`,
    // Airframe & Component
    airframeTime: '1427.11',
    engineTime: '373.1',
    propellerTime: '760.9',
    approvedOrg: '184-20',
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
            <p className="text-sm text-gray-600">Entry Details - {detailData.seqNo}</p>
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
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                entry.status === 'Serviceable' 
                  ? 'bg-green-100 text-green-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {entry.status}
              </span>
            </div>

            {/* Sequence Number & Aircraft Registration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-600 text-sm mb-1">Sequence No.</label>
                <p className="text-gray-900">{detailData.seqNo}</p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">A/C Registration</label>
                <p className="text-gray-900">{detailData.acReg}</p>
              </div>
            </div>

            {/* Nature of Flight */}
            <div>
              <label className="block text-gray-600 text-sm mb-1">Nature of Flight</label>
              <p className="text-gray-900">{detailData.natureOfFlight}</p>
            </div>

            {/* Off-Blocks/Origin & On-Blocks/Destination */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Off-Blocks/Origin */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">Off-Blocks / Origin</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Station (STN)</label>
                    <p className="text-gray-900">{detailData.offBlocksStation}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">Date (UTC)</label>
                      <p className="text-gray-900">{detailData.offBlocksDate}</p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">Time (UTC)</label>
                      <p className="text-gray-900">{detailData.offBlocksTime}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* On-Blocks/Destination */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">On-Blocks / Destination</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Station (STN)</label>
                    <p className="text-gray-900">{detailData.onBlocksStation}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">Date (UTC)</label>
                      <p className="text-gray-900">{detailData.onBlocksDate}</p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-sm mb-1">Time (UTC)</label>
                      <p className="text-gray-900">{detailData.onBlocksTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Route & Total Flight Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-600 text-sm mb-1">Route</label>
                <p className="text-gray-900">{entry.route}</p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">Total Flight Time</label>
                <p className="text-gray-900">{detailData.totalFlightTime}</p>
              </div>
            </div>

            {/* Fuel & Oil Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fuel Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Fuel Qty. (Gals)</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">Left</label>
                    <p className="text-gray-900">{detailData.fuelQtyLeft}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">Right</label>
                    <p className="text-gray-900">{detailData.fuelQtyRight}</p>
                  </div>
                </div>
              </div>

              {/* Uplift Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Uplift Qty.</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">Left</label>
                    <p className="text-gray-900">{detailData.upliftQtyLeft}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">Right</label>
                    <p className="text-gray-900">{detailData.upliftQtyRight}</p>
                  </div>
                </div>
              </div>

              {/* Oil Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Oil Qty. (QTS)</h3>
                <p className="text-gray-900">{detailData.oilQty}</p>
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
                      <label className="block text-gray-600 text-xs mb-1">Start</label>
                      <p className="text-gray-900">{detailData.tachometerStart}</p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">End</label>
                      <p className="text-gray-900">{detailData.tachometerEnd}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">Total</label>
                    <p className="text-gray-900">{detailData.tachometerTotal}</p>
                  </div>
                </div>
              </div>

              {/* Hobbs Meter */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">Hobbs Meter</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">Start</label>
                      <p className="text-gray-900">{detailData.hobbsMeterStart}</p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs mb-1">End</label>
                      <p className="text-gray-900">{detailData.hobbsMeterEnd}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs mb-1">Total</label>
                    <p className="text-gray-900">{detailData.hobbsMeterTotal}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inspection & Service */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-600 text-sm mb-1">Next Inspection Due</label>
                <p className="text-gray-900">{detailData.nextInspectionDue}</p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">Return to Service (HRS)</label>
                <p className="text-gray-900">{detailData.returnToServiceHrs}</p>
              </div>
            </div>

            {/* Remarks Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-2">Pilot Report</label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-900 text-sm leading-relaxed">{detailData.pilotReport}</p>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-2">Maintenance Entry</label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-900 text-sm leading-relaxed">{detailData.maintenanceEntry}</p>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-2">Actions Taken</label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-900 text-sm leading-relaxed">{detailData.actionsTaken}</p>
                </div>
              </div>
            </div>

            {/* Component Record */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-gray-900 mb-3">Component Record</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Airframe Time</label>
                  <p className="text-gray-900">{detailData.airframeTime}</p>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Engine Time</label>
                  <p className="text-gray-900">{detailData.engineTime}</p>
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Propeller Time</label>
                  <p className="text-gray-900">{detailData.propellerTime}</p>
                </div>
              </div>
            </div>

            {/* Signatures Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pilot Signature */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">Pilot's Acceptance</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Name</label>
                    <p className="text-gray-900">{detailData.pilotName}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">License No.</label>
                    <p className="text-gray-900">{detailData.pilotLicense}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Signature</label>
                    <div className="bg-white border border-gray-300 rounded p-3 h-20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mechanic Signature */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">PIC Name & Signature</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Name</label>
                    <p className="text-gray-900">{detailData.mechanicName}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">License No.</label>
                    <p className="text-gray-900">{detailData.mechanicLicense}</p>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-sm mb-1">Signature</label>
                    <div className="bg-white border border-gray-300 rounded p-3 h-20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time / Approved Organization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-600 text-sm mb-1">Date & Time (UTC)</label>
                <p className="text-gray-900">{detailData.dateTime}</p>
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">Approved Maintenance Organization</label>
                <p className="text-gray-900">{detailData.approvedOrg}</p>
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
