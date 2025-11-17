import { X, Upload } from 'lucide-react';
import { useState } from 'react';

interface AddTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTechnicalLogbookEntryModal({ isOpen, onClose }: AddTechnicalLogbookEntryModalProps) {
  const [formData, setFormData] = useState({
    seqNo: '',
    acReg: '',
    natureOfFlight: 'training',
    otherNature: '',
    // Off-blocks/Origin
    offBlocksDate: '',
    offBlocksTime: '',
    offBlocksStation: '',
    // On-blocks/Destination
    onBlocksDate: '',
    onBlocksTime: '',
    onBlocksStation: '',
    totalFlightTime: '',
    // Fuel
    fuelQtyLeft: '',
    fuelQtyRight: '',
    upliftQtyLeft: '',
    upliftQtyRight: '',
    // Oil
    oilQty: '',
    // Times
    priorDepartureHours: '',
    priorDepartureMinutes: '',
    afterLandingHours: '',
    afterLandingMinutes: '',
    // Tachometer & Hobbs
    tachometerStart: '',
    tachometerEnd: '',
    tachometerTotal: '',
    hobbsMeterStart: '',
    hobbsMeterEnd: '',
    hobbsMeterTotal: '',
    // Inspection & Service
    nextInspectionDue: '',
    returnToServiceHrs: '',
    // Remarks
    pilotReport: '',
    maintenanceEntry: '',
    actionsTaken: '',
    // Signatures
    pilotName: '',
    pilotLicense: '',
    pilotSignature: null as File | null,
    mechanicName: '',
    mechanicLicense: '',
    mechanicAuth: '',
    mechanicSignature: null as File | null,
    dateTime: '',
    // Airframe & Component
    airframeTime: '',
    engineTime: '',
    propellerTime: '',
    approvedOrg: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    onClose();
  };

  const handleFileChange = (field: 'pilotSignature' | 'mechanicSignature', file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file }));
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
            <p className="text-sm text-gray-600">New Entry</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Sequence Number & Aircraft Registration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Sequence No. *</label>
                <input
                  type="text"
                  value={formData.seqNo}
                  onChange={(e) => setFormData({ ...formData, seqNo: e.target.value })}
                  placeholder="ATL-00249958"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">A/C Registration *</label>
                <input
                  type="text"
                  value={formData.acReg}
                  onChange={(e) => setFormData({ ...formData, acReg: e.target.value })}
                  placeholder="RP-C9012"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  required
                />
              </div>
            </div>

            {/* Nature of Flight */}
            <div>
              <label className="block text-gray-700 mb-2">Nature of Flight *</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="natureOfFlight"
                    value="training"
                    checked={formData.natureOfFlight === 'training'}
                    onChange={(e) => setFormData({ ...formData, natureOfFlight: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900">Training Flight</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="natureOfFlight"
                    value="test"
                    checked={formData.natureOfFlight === 'test'}
                    onChange={(e) => setFormData({ ...formData, natureOfFlight: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900">Test Flight</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="natureOfFlight"
                    value="other"
                    checked={formData.natureOfFlight === 'other'}
                    onChange={(e) => setFormData({ ...formData, natureOfFlight: e.target.value })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900">Others:</span>
                  {formData.natureOfFlight === 'other' && (
                    <input
                      type="text"
                      value={formData.otherNature}
                      onChange={(e) => setFormData({ ...formData, otherNature: e.target.value })}
                      placeholder="Specify"
                      className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  )}
                </label>
              </div>
            </div>

            {/* Off-Blocks/Origin & On-Blocks/Destination */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Off-Blocks/Origin */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">Off-Blocks / Origin</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Station (STN)</label>
                    <input
                      type="text"
                      value={formData.offBlocksStation}
                      onChange={(e) => setFormData({ ...formData, offBlocksStation: e.target.value })}
                      placeholder="RP-LB"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">Date (UTC)</label>
                      <input
                        type="date"
                        value={formData.offBlocksDate}
                        onChange={(e) => setFormData({ ...formData, offBlocksDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">Time (UTC)</label>
                      <input
                        type="time"
                        value={formData.offBlocksTime}
                        onChange={(e) => setFormData({ ...formData, offBlocksTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* On-Blocks/Destination */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">On-Blocks / Destination</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Station (STN)</label>
                    <input
                      type="text"
                      value={formData.onBlocksStation}
                      onChange={(e) => setFormData({ ...formData, onBlocksStation: e.target.value })}
                      placeholder="RP-LB"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">Date (UTC)</label>
                      <input
                        type="date"
                        value={formData.onBlocksDate}
                        onChange={(e) => setFormData({ ...formData, onBlocksDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">Time (UTC)</label>
                      <input
                        type="time"
                        value={formData.onBlocksTime}
                        onChange={(e) => setFormData({ ...formData, onBlocksTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Flight Time */}
            <div>
              <label className="block text-gray-700 mb-2">Total Flight Time</label>
              <input
                type="text"
                value={formData.totalFlightTime}
                onChange={(e) => setFormData({ ...formData, totalFlightTime: e.target.value })}
                placeholder="2:15"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
              />
            </div>

            {/* Fuel & Oil Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fuel Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Fuel Qty. (Gals)</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Left</label>
                    <input
                      type="text"
                      value={formData.fuelQtyLeft}
                      onChange={(e) => setFormData({ ...formData, fuelQtyLeft: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Right</label>
                    <input
                      type="text"
                      value={formData.fuelQtyRight}
                      onChange={(e) => setFormData({ ...formData, fuelQtyRight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Uplift Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Uplift Qty.</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Left</label>
                    <input
                      type="text"
                      value={formData.upliftQtyLeft}
                      onChange={(e) => setFormData({ ...formData, upliftQtyLeft: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Right</label>
                    <input
                      type="text"
                      value={formData.upliftQtyRight}
                      onChange={(e) => setFormData({ ...formData, upliftQtyRight: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Oil Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Oil Qty. (QTS)</h3>
                <input
                  type="text"
                  value={formData.oilQty}
                  onChange={(e) => setFormData({ ...formData, oilQty: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                />
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
                      <label className="block text-gray-700 text-xs mb-1">Start</label>
                      <input
                        type="text"
                        value={formData.tachometerStart}
                        onChange={(e) => setFormData({ ...formData, tachometerStart: e.target.value })}
                        placeholder="2163.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">End</label>
                      <input
                        type="text"
                        value={formData.tachometerEnd}
                        onChange={(e) => setFormData({ ...formData, tachometerEnd: e.target.value })}
                        placeholder="2164.2"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Total</label>
                    <input
                      type="text"
                      value={formData.tachometerTotal}
                      onChange={(e) => setFormData({ ...formData, tachometerTotal: e.target.value })}
                      placeholder="1.2"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Hobbs Meter */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">Hobbs Meter</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">Start</label>
                      <input
                        type="text"
                        value={formData.hobbsMeterStart}
                        onChange={(e) => setFormData({ ...formData, hobbsMeterStart: e.target.value })}
                        placeholder="4890.8"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">End</label>
                      <input
                        type="text"
                        value={formData.hobbsMeterEnd}
                        onChange={(e) => setFormData({ ...formData, hobbsMeterEnd: e.target.value })}
                        placeholder="4893.0"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">Total</label>
                    <input
                      type="text"
                      value={formData.hobbsMeterTotal}
                      onChange={(e) => setFormData({ ...formData, hobbsMeterTotal: e.target.value })}
                      placeholder="2.2"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Inspection & Service */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">Next Inspection Due</label>
                <input
                  type="text"
                  value={formData.nextInspectionDue}
                  onChange={(e) => setFormData({ ...formData, nextInspectionDue: e.target.value })}
                  placeholder="120 HRS"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Return to Service (HRS)</label>
                <input
                  type="text"
                  value={formData.returnToServiceHrs}
                  onChange={(e) => setFormData({ ...formData, returnToServiceHrs: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Remarks Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Pilot Report</label>
                <textarea
                  value={formData.pilotReport}
                  onChange={(e) => setFormData({ ...formData, pilotReport: e.target.value })}
                  rows={3}
                  placeholder="Enter pilot remarks..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Maintenance Entry</label>
                <textarea
                  value={formData.maintenanceEntry}
                  onChange={(e) => setFormData({ ...formData, maintenanceEntry: e.target.value })}
                  rows={3}
                  placeholder="Enter maintenance notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Actions Taken</label>
                <textarea
                  value={formData.actionsTaken}
                  onChange={(e) => setFormData({ ...formData, actionsTaken: e.target.value })}
                  rows={2}
                  placeholder="Enter actions taken..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                />
              </div>
            </div>

            {/* Component Record */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-gray-900 mb-3">Component Record</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm mb-1">Airframe Time</label>
                  <input
                    type="text"
                    value={formData.airframeTime}
                    onChange={(e) => setFormData({ ...formData, airframeTime: e.target.value })}
                    placeholder="1427.11"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1">Engine Time</label>
                  <input
                    type="text"
                    value={formData.engineTime}
                    onChange={(e) => setFormData({ ...formData, engineTime: e.target.value })}
                    placeholder="373.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1">Propeller Time</label>
                  <input
                    type="text"
                    value={formData.propellerTime}
                    onChange={(e) => setFormData({ ...formData, propellerTime: e.target.value })}
                    placeholder="760.9"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  />
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
                    <label className="block text-gray-700 text-sm mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.pilotName}
                      onChange={(e) => setFormData({ ...formData, pilotName: e.target.value })}
                      placeholder="Mendarek Cuyos"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">License No. & Signature</label>
                    <input
                      type="text"
                      value={formData.pilotLicense}
                      onChange={(e) => setFormData({ ...formData, pilotLicense: e.target.value })}
                      placeholder="127409"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Upload Signature</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange('pilotSignature', e.target.files?.[0] || null)}
                        className="hidden"
                        id="pilot-signature"
                      />
                      <label
                        htmlFor="pilot-signature"
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700 text-sm">
                          {formData.pilotSignature ? formData.pilotSignature.name : 'Choose file'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mechanic Signature */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">PIC Name & Signature</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.mechanicName}
                      onChange={(e) => setFormData({ ...formData, mechanicName: e.target.value })}
                      placeholder="Vandervorf, Kayla"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">License No.</label>
                    <input
                      type="text"
                      value={formData.mechanicLicense}
                      onChange={(e) => setFormData({ ...formData, mechanicLicense: e.target.value })}
                      placeholder="160476-AMT"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">Upload Signature</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange('mechanicSignature', e.target.files?.[0] || null)}
                        className="hidden"
                        id="mechanic-signature"
                      />
                      <label
                        htmlFor="mechanic-signature"
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="w-4 h-4 text-gray-600" />
                        <span className="text-gray-700 text-sm">
                          {formData.mechanicSignature ? formData.mechanicSignature.name : 'Choose file'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time / Approved Organization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">Date & Time (UTC)</label>
                <input
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Approved Maintenance Organization</label>
                <input
                  type="text"
                  value={formData.approvedOrg}
                  onChange={(e) => setFormData({ ...formData, approvedOrg: e.target.value })}
                  placeholder="184-20"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
