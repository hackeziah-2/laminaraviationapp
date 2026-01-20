import { X, Upload, Plus, Trash2, ChevronDown, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { getAircrafts } from "../api/aircraftApi";

interface AddTechnicalLogbookEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddTechnicalLogbookEntryModal({
  isOpen,
  onClose,
}: AddTechnicalLogbookEntryModalProps) {
  const [formData, setFormData] = useState({
    seqNo: "",
    acReg: "",
    natureOfFlight: "TR",
    // Off-blocks/Origin
    offBlocksDate: "",
    offBlocksTime: "",
    offBlocksStation: "",
    // On-blocks/Destination
    onBlocksDate: "",
    onBlocksTime: "",
    onBlocksStation: "",
    totalFlightTime: "",
    // Fuel
    fuelQtyLeft: "",
    fuelQtyRight: "",
    upliftQtyLeft: "",
    upliftQtyRight: "",
    // Oil
    oilQty: "",
    // Times
    priorDepartureHours: "",
    priorDepartureMinutes: "",
    afterLandingHours: "",
    afterLandingMinutes: "",
    // Tachometer & Hobbs
    tachometerStart: "",
    tachometerEnd: "",
    tachometerTotal: "",
    hobbsMeterStart: "",
    hobbsMeterEnd: "",
    hobbsMeterTotal: "",
    // Inspection & Service
    nextInspectionDue: "",
    returnToServiceHrs: "",
    // Remarks
    pilotReport: "",
    maintenanceEntry: "",
    actionsTaken: "",
    // Signatures
    pilotName: "",
    pilotLicense: "",
    pilotSignature: null as File | null,
    mechanicName: "",
    mechanicLicense: "",
    mechanicAuth: "",
    mechanicSignature: null as File | null,
    dateTime: "",
    // Airframe & Component Times
    airframePrevTime: "",
    airframeFlightTime: "",
    airframeTotalTime: "",
    enginePrevTime: "",
    engineFlightTime: "",
    engineTotalTime: "",
    propellerPrevTime: "",
    propellerFlightTime: "",
    propellerTotalTime: "",
    approvedOrg: "",
  });

  // Component Records state
  interface ComponentRecord {
    id: string; // temporary ID for React key
    qty: string;
    unit: string;
    nomenclature: string;
    removedPartNo: string;
    removedSerialNo: string;
    installedPartNo: string;
    installedSerialNo: string;
    partDescription: string;
    ataChapter: string;
  }

  const [componentRecords, setComponentRecords] = useState<ComponentRecord[]>([]);

  // Aircraft searchable dropdown state
  const [aircrafts, setAircrafts] = useState<Array<{ id: number; registration: string }>>([]);
  const [aircraftSearchTerm, setAircraftSearchTerm] = useState("");
  const [isAircraftDropdownOpen, setIsAircraftDropdownOpen] = useState(false);
  const [loadingAircrafts, setLoadingAircrafts] = useState(false);
  const aircraftDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch aircrafts when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAircrafts();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        aircraftDropdownRef.current &&
        !aircraftDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAircraftDropdownOpen(false);
      }
    };

    if (isAircraftDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAircraftDropdownOpen]);

  const fetchAircrafts = async () => {
    setLoadingAircrafts(true);
    try {
      const response = await getAircrafts(1, 100, "", "", "");
      const aircraftList = response.data.items.map((item: any) => ({
        id: item.id,
        registration: item.registration,
      }));
      setAircrafts(aircraftList);
    } catch (err) {
      console.error("Error fetching aircrafts:", err);
      setAircrafts([]);
    } finally {
      setLoadingAircrafts(false);
    }
  };

  // Filter aircrafts based on search term
  const filteredAircrafts = aircrafts.filter((aircraft) =>
    aircraft.registration
      .toLowerCase()
      .includes(aircraftSearchTerm.toLowerCase())
  );

  const handleAircraftSelect = (registration: string) => {
    setFormData({ ...formData, acReg: registration });
    setAircraftSearchTerm("");
    setIsAircraftDropdownOpen(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleFileChange = (
    field: "pilotSignature" | "mechanicSignature",
    file: File | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  // Calculate total time from prev time + flight time
  const calculateTotalTime = (prevTime: string, flightTime: string): string => {
    const prev = parseFloat(prevTime) || 0;
    const flight = parseFloat(flightTime) || 0;
    const total = prev + flight;
    return total > 0 ? total.toFixed(2) : "";
  };

  // Handle time field changes and auto-calculate totals
  const handleTimeFieldChange = (
    field: string,
    value: string,
    type: "airframe" | "engine" | "propeller"
  ) => {
    const updates: any = { [field]: value };

    if (type === "airframe") {
      if (field === "airframePrevTime" || field === "airframeFlightTime") {
        updates.airframeTotalTime = calculateTotalTime(
          field === "airframePrevTime"
            ? value
            : formData.airframePrevTime,
          field === "airframeFlightTime"
            ? value
            : formData.airframeFlightTime
        );
      }
    } else if (type === "engine") {
      if (field === "enginePrevTime" || field === "engineFlightTime") {
        updates.engineTotalTime = calculateTotalTime(
          field === "enginePrevTime"
            ? value
            : formData.enginePrevTime,
          field === "engineFlightTime"
            ? value
            : formData.engineFlightTime
        );
      }
    } else if (type === "propeller") {
      if (field === "propellerPrevTime" || field === "propellerFlightTime") {
        updates.propellerTotalTime = calculateTotalTime(
          field === "propellerPrevTime"
            ? value
            : formData.propellerPrevTime,
          field === "propellerFlightTime"
            ? value
            : formData.propellerFlightTime
        );
      }
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Component Record handlers
  const addComponentRecord = () => {
    const newRecord: ComponentRecord = {
      id: `component-${Date.now()}-${Math.random()}`,
      qty: "",
      unit: "",
      nomenclature: "",
      removedPartNo: "",
      removedSerialNo: "",
      installedPartNo: "",
      installedSerialNo: "",
      partDescription: "",
      ataChapter: "",
    };
    setComponentRecords([...componentRecords, newRecord]);
  };

  const removeComponentRecord = (id: string) => {
    setComponentRecords(componentRecords.filter((record) => record.id !== id));
  };

  const updateComponentRecord = (
    id: string,
    field: keyof ComponentRecord,
    value: string
  ) => {
    setComponentRecords(
      componentRecords.map((record) =>
        record.id === id ? { ...record, [field]: value } : record
      )
    );
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
                <label className="block text-gray-700 mb-2">
                  Sequence No. *
                </label>
                <input
                  type="text"
                  value={formData.seqNo}
                  onChange={(e) =>
                    setFormData({ ...formData, seqNo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  A/C Registration *
                </label>
                <div className="relative" ref={aircraftDropdownRef}>
                  <div className="relative">
                <input
                  type="text"
                      value={isAircraftDropdownOpen ? aircraftSearchTerm : formData.acReg}
                      onChange={(e) => {
                        setAircraftSearchTerm(e.target.value);
                        setIsAircraftDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setIsAircraftDropdownOpen(true);
                        setAircraftSearchTerm("");
                      }}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                  required
                      placeholder="Search aircraft registration..."
                    />
                    <button
                      type="button"
                      onClick={() => setIsAircraftDropdownOpen(!isAircraftDropdownOpen)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isAircraftDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {isAircraftDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {loadingAircrafts ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          Loading aircrafts...
                        </div>
                      ) : filteredAircrafts.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          {aircraftSearchTerm
                            ? "No aircrafts found"
                            : "No aircrafts available"}
                        </div>
                      ) : (
                        <ul className="py-1">
                          {filteredAircrafts.map((aircraft) => (
                            <li
                              key={aircraft.id}
                              onClick={() => handleAircraftSelect(aircraft.registration)}
                              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-between ${
                                formData.acReg === aircraft.registration
                                  ? "bg-blue-50"
                                  : ""
                              }`}
                            >
                              <span className="text-gray-900">
                                {aircraft.registration}
                              </span>
                              {formData.acReg === aircraft.registration && (
                                <Check className="w-4 h-4 text-blue-600" />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nature of Flight & Total Flight Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  Nature of Flight *
                </label>
                <select
                  value={formData.natureOfFlight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      natureOfFlight: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                  required
                >
                  <option value="TR">TR - Training Flight</option>
                  <option value="PSF">PSF - Post Flight Inspection</option>
                  <option value="PRF">PRF - Pre Flight Inspection</option>
                  <option value="EGR">EGR - Engine Run-up</option>
                  <option value="ME">ME - Maintenance Entry</option>
                  <option value="TR W/ PIREM">TR W/ PIREM - Training Flight with Pilot Remarks VOID</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  Total Flight Time
                </label>
                <input
                  type="text"
                  value={formData.totalFlightTime}
                  onChange={(e) =>
                    setFormData({ ...formData, totalFlightTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                />
              </div>
            </div>

            {/* Off-Blocks/Origin & On-Blocks/Destination */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Off-Blocks/Origin */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">Off-Blocks / Origin</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">
                      Station (STN)
                    </label>
                    <input
                      type="text"
                      value={formData.offBlocksStation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          offBlocksStation: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Date (UTC)
                      </label>
                      <input
                        type="date"
                        value={formData.offBlocksDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            offBlocksDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Time (UTC)
                      </label>
                      <input
                        type="time"
                        value={formData.offBlocksTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            offBlocksTime: e.target.value,
                          })
                        }
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
                    <label className="block text-gray-700 text-sm mb-1">
                      Station (STN)
                    </label>
                    <input
                      type="text"
                      value={formData.onBlocksStation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          onBlocksStation: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Date (UTC)
                      </label>
                      <input
                        type="date"
                        value={formData.onBlocksDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            onBlocksDate: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Time (UTC)
                      </label>
                      <input
                        type="time"
                        value={formData.onBlocksTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            onBlocksTime: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fuel & Oil Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fuel Quantity */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3 text-sm">Fuel Qty. (Gals)</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">
                      Left
                    </label>
                    <input
                      type="text"
                      value={formData.fuelQtyLeft}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fuelQtyLeft: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">
                      Right
                    </label>
                    <input
                      type="text"
                      value={formData.fuelQtyRight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fuelQtyRight: e.target.value,
                        })
                      }
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
                    <label className="block text-gray-700 text-xs mb-1">
                      Left
                    </label>
                    <input
                      type="text"
                      value={formData.upliftQtyLeft}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          upliftQtyLeft: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">
                      Right
                    </label>
                    <input
                      type="text"
                      value={formData.upliftQtyRight}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          upliftQtyRight: e.target.value,
                        })
                      }
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
                  onChange={(e) =>
                    setFormData({ ...formData, oilQty: e.target.value })
                  }
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
                      <label className="block text-gray-700 text-xs mb-1">
                        Start
                      </label>
                      <input
                        type="text"
                        value={formData.tachometerStart}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tachometerStart: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">
                        End
                      </label>
                      <input
                        type="text"
                        value={formData.tachometerEnd}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tachometerEnd: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">
                      Total
                    </label>
                    <input
                      type="text"
                      value={formData.tachometerTotal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tachometerTotal: e.target.value,
                        })
                      }
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
                      <label className="block text-gray-700 text-xs mb-1">
                        Start
                      </label>
                      <input
                        type="text"
                        value={formData.hobbsMeterStart}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hobbsMeterStart: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-xs mb-1">
                        End
                      </label>
                      <input
                        type="text"
                        value={formData.hobbsMeterEnd}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hobbsMeterEnd: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-xs mb-1">
                      Total
                    </label>
                    <input
                      type="text"
                      value={formData.hobbsMeterTotal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hobbsMeterTotal: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Inspection & Service */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">
                  Next Inspection Due
                </label>
                <input
                  type="text"
                  value={formData.nextInspectionDue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      nextInspectionDue: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  Return to Service (HRS)
                </label>
                <input
                  type="text"
                  value={formData.returnToServiceHrs}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      returnToServiceHrs: e.target.value,
                    })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, pilotReport: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  Maintenance Entry
                </label>
                <textarea
                  value={formData.maintenanceEntry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maintenanceEntry: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  Actions Taken
                </label>
                <textarea
                  value={formData.actionsTaken}
                  onChange={(e) =>
                    setFormData({ ...formData, actionsTaken: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 resize-none"
                />
              </div>
            </div>

            {/* AIRFRAME, ENGINE & PROPELLER TIMES */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-4">
                <h3 className="text-white font-semibold">
                  AIRFRAME, ENGINE & PROPELLER TIMES
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700"></th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                        AIRFRAME
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                        ENGINE
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700">
                        PROPELLER
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                        PREV. TIME
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="text"
                          value={formData.airframePrevTime}
                    onChange={(e) =>
                            handleTimeFieldChange(
                              "airframePrevTime",
                              e.target.value,
                              "airframe"
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="text"
                          value={formData.enginePrevTime}
                    onChange={(e) =>
                            handleTimeFieldChange(
                              "enginePrevTime",
                              e.target.value,
                              "engine"
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                  <input
                    type="text"
                          value={formData.propellerPrevTime}
                    onChange={(e) =>
                            handleTimeFieldChange(
                              "propellerPrevTime",
                              e.target.value,
                              "propeller"
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                        FLIGHT TIME
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={formData.airframeFlightTime}
                          onChange={(e) =>
                            handleTimeFieldChange(
                              "airframeFlightTime",
                              e.target.value,
                              "airframe"
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={formData.engineFlightTime}
                          onChange={(e) =>
                            handleTimeFieldChange(
                              "engineFlightTime",
                              e.target.value,
                              "engine"
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={formData.propellerFlightTime}
                          onChange={(e) =>
                            handleTimeFieldChange(
                              "propellerFlightTime",
                              e.target.value,
                              "propeller"
                            )
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50">
                        TOTAL TIME
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={formData.airframeTotalTime}
                          disabled
                          readOnly
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={formData.engineTotalTime}
                          disabled
                          readOnly
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                        />
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        <input
                          type="text"
                          value={formData.propellerTotalTime}
                          disabled
                          readOnly
                          className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-100 text-gray-600 text-sm cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
            </div>

            {/* COMPONENT RECORD */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg -mx-4 -mt-4 mb-4">
                <h3 className="text-white font-semibold">COMPONENT RECORD</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        QTY
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        UNIT
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        NOMENCLATURE
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        REMOVED PART NO
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        REMOVED S/N
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        INSTALLED PART NO
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        INSTALLED S/N
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        PART DESCRIPTION
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        ATA CHAPTER
                      </th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-semibold text-gray-700">
                        DELETE?
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {componentRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="border border-gray-300 px-3 py-4 text-center text-gray-500 text-sm"
                        >
                          No component records added. Click "Add another Component" to add one.
                        </td>
                      </tr>
                    ) : (
                      componentRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.qty}
                              onChange={(e) =>
                                updateComponentRecord(record.id, "qty", e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.unit}
                              onChange={(e) =>
                                updateComponentRecord(record.id, "unit", e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.nomenclature}
                              onChange={(e) =>
                                updateComponentRecord(
                                  record.id,
                                  "nomenclature",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.removedPartNo}
                              onChange={(e) =>
                                updateComponentRecord(
                                  record.id,
                                  "removedPartNo",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.removedSerialNo}
                              onChange={(e) =>
                                updateComponentRecord(
                                  record.id,
                                  "removedSerialNo",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.installedPartNo}
                              onChange={(e) =>
                                updateComponentRecord(
                                  record.id,
                                  "installedPartNo",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.installedSerialNo}
                              onChange={(e) =>
                                updateComponentRecord(
                                  record.id,
                                  "installedSerialNo",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.partDescription}
                              onChange={(e) =>
                                updateComponentRecord(
                                  record.id,
                                  "partDescription",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={record.ataChapter}
                              onChange={(e) =>
                                updateComponentRecord(
                                  record.id,
                                  "ataChapter",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeComponentRecord(record.id)}
                              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={addComponentRecord}
                  className="mt-3 flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add another Component
                </button>
              </div>
            </div>

            {/* Signatures Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pilot Signature */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">Pilot's Acceptance</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.pilotName}
                      onChange={(e) =>
                        setFormData({ ...formData, pilotName: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">
                      License No. & Signature
                    </label>
                    <input
                      type="text"
                      value={formData.pilotLicense}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pilotLicense: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Mechanic Signature */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-gray-900 mb-3">PIC Name & Signature</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.mechanicName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mechanicName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1">
                      License No.
                    </label>
                    <input
                      type="text"
                      value={formData.mechanicLicense}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mechanicLicense: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time / Approved Organization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">
                  Date & Time (UTC)
                </label>
                <input
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) =>
                    setFormData({ ...formData, dateTime: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  Approved Maintenance Organization
                </label>
                <input
                  type="text"
                  value={formData.approvedOrg}
                  onChange={(e) =>
                    setFormData({ ...formData, approvedOrg: e.target.value })
                  }
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
