import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import type { ComponentItem } from "./TCCDetail";
import { getAtlList, type AtlItem } from "../api/atlApi";

interface AddTCCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (component: any) => void;
  editingItem?: ComponentItem | null;
  onUpdate?: (id: number, component: any) => void;
  /** When editing, prefill category from current tab (POWERPLANT | AIRFRAME | PROPELLER) */
  activeCategory?: string;
  /** Aircraft ID for ATL list (Edit only) */
  aircraftId?: string;
}

const METHOD_OPTIONS = [
  "Overhaul",
  "Replacement",
  "Inspection",
  "I&S",
  "Operational Test",
  "Calibration",
];

/** Normalize date string to YYYY-MM-DD for type="date" input */
function toDateInputValue(s: string | undefined): string {
  if (!s || !String(s).trim()) return "";
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return str;
}

const defaultFormData = {
  category: "",
  partNumber: "",
  serialNumber: "",
  description: "",
  componentLimitHours: "",
  timeDistance: "",
  methodOfCompliance: "",
  // Edit-only
  atlReference: "",
  lastDoneDate: "",
  lastDoneTach: "",
  lastDoneAftt: "",
  lastDoneMethodOfCompliance: "",
};

export function AddTCCModal({
  isOpen,
  onClose,
  onAdd,
  editingItem = null,
  onUpdate,
  activeCategory = "",
  aircraftId,
}: AddTCCModalProps) {
  const [formData, setFormData] = useState(defaultFormData);
  const [atlOptions, setAtlOptions] = useState<AtlItem[]>([]);
  const [atlSearch, setAtlSearch] = useState("");
  const [atlOpen, setAtlOpen] = useState(false);
  const [atlLoading, setAtlLoading] = useState(false);
  const atlListRef = useRef<HTMLDivElement>(null);

  const isEdit = Boolean(editingItem);
  const title = isEdit ? "Edit TCC Entry" : "Add TCC Entry";
  const submitLabel = isEdit ? "Update TCC Entry" : "Add TCC Entry";

  useEffect(() => {
    if (isOpen && editingItem) {
      setFormData({
        ...defaultFormData,
        category: activeCategory,
        partNumber: editingItem.partNo ?? "",
        serialNumber: editingItem.serialNo ?? "",
        description: editingItem.description ?? "",
        componentLimitHours: editingItem.threshold ?? "",
        timeDistance: editingItem.hours ?? "",
        methodOfCompliance: editingItem.methodOfCompliance ?? "",
        atlReference: editingItem.reference ?? "",
        lastDoneDate: toDateInputValue(editingItem.lastDoneDate),
        lastDoneTach: editingItem.lastDoneYear ?? "",
        lastDoneAftt: editingItem.lastDoneAftt ?? "",
        lastDoneMethodOfCompliance: editingItem.lastDoneMethodOfCompliance ?? "",
      });
    } else if (isOpen && !editingItem) {
      setFormData({ ...defaultFormData, category: activeCategory });
    }
  }, [isOpen, editingItem, activeCategory]);

  // Fetch ATL list for Edit mode (on open or search change)
  useEffect(() => {
    if (!isOpen || !isEdit) return;
    const ac = { current: false };
    const fetch = async () => {
      setAtlLoading(true);
      try {
        const aircraftIdNum = aircraftId ? parseInt(aircraftId, 10) : undefined;
        const list = await getAtlList(atlSearch.trim(), aircraftIdNum);
        if (!ac.current) setAtlOptions(list);
      } finally {
        if (!ac.current) setAtlLoading(false);
      }
    };
    fetch();
    return () => { ac.current = true; };
  }, [isOpen, isEdit, atlSearch, aircraftId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      category: formData.category,
      partNo: formData.partNumber,
      serialNo: formData.serialNumber,
      description: formData.description,
      threshold: formData.componentLimitHours,
      hours: formData.timeDistance,
      methodOfCompliance: formData.methodOfCompliance,
    };
    if (isEdit && editingItem && onUpdate) {
      payload.reference = formData.atlReference || undefined;
      payload.lastDoneDate = formData.lastDoneDate || undefined;
      payload.lastDoneYear = formData.lastDoneTach || undefined;
      payload.lastDoneAftt = formData.lastDoneAftt || undefined;
      payload.lastDoneMethodOfCompliance = formData.lastDoneMethodOfCompliance || undefined;
      onUpdate(editingItem.id, payload);
    } else {
      onAdd(payload);
    }
    onClose();
    setFormData(defaultFormData);
    setAtlOpen(false);
    setAtlSearch("");
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleClose = () => {
    onClose();
    setFormData(defaultFormData);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        background: "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-gray-900">{title}</h2>
            <p className="text-gray-600 text-sm mt-1">
              {isEdit
                ? "Update the time-controlled component details."
                : "Enter the details for the new time-controlled component."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Category */}
          <div className="mb-4">
            <label className="block text-gray-900 text-sm mb-2">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer pr-9"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
              }}
            >
              <option value="">Select category</option>
              <option value="POWERPLANT">POWERPLANT</option>
              <option value="AIRFRAME">AIRFRAME</option>
              <option value="PROPELLER">PROPELLER</option>
            </select>
          </div>

          {/* Part Number, Serial Number */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Part Number
              </label>
              <input
                type="text"
                name="partNumber"
                value={formData.partNumber}
                onChange={handleChange}
                placeholder="Enter part number"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Serial Number
              </label>
              <input
                type="text"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="Enter serial number"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-gray-900 text-sm mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter component description"
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Component Limit (Hours), Time/Distance */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Component Limit (Hours)
              </label>
              <input
                type="text"
                name="componentLimitHours"
                value={formData.componentLimitHours}
                onChange={handleChange}
                placeholder="e.g. 2000"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Component Limit (Years)
              </label>
              <input
                type="text"
                name="timeDistance"
                value={formData.timeDistance}
                onChange={handleChange}
                placeholder="e.g. 12"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Method of Compliance */}
          <div className="mb-6">
            <label className="block text-gray-900 text-sm mb-2">
              Method of Compliance
            </label>
            <select
              name="methodOfCompliance"
              value={formData.methodOfCompliance}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer pr-9"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
              }}
            >
              <option value="">Select method</option>
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Edit-only: ATL reference, Last Done Date / TACH / AFTT */}
          {isEdit && (
            <>
              {/* ATL Reference: search dropdown */}
              <div className="mb-4">
                <label className="block text-gray-900 text-sm mb-2">
                  ATL Reference
                </label>
                <div className="relative" ref={atlListRef}>
                  <input
                    type="text"
                    value={atlOpen ? atlSearch : (atlOptions.find((o) => String(o.id) === formData.atlReference)?.label ?? formData.atlReference)}
                    onChange={(e) => {
                      setAtlSearch(e.target.value);
                      setAtlOpen(true);
                    }}
                    onFocus={() => {
                      setAtlOpen(true);
                      if (atlSearch === "") setAtlSearch(formData.atlReference);
                    }}
                    onBlur={() => setTimeout(() => setAtlOpen(false), 200)}
                    placeholder="Search by sequence number..."
                    className="w-full px-3 py-2 pr-9 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  {atlOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {atlLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
                      ) : atlOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No ATL found</div>
                      ) : (
                        atlOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData((prev) => ({ ...prev, atlReference: String(opt.id) }));
                              setAtlSearch("");
                              setAtlOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Last Done Date, TACH, AFTT */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-gray-900 text-sm mb-2">
                    Last Done Date
                  </label>
                  <input
                    type="date"
                    name="lastDoneDate"
                    value={formData.lastDoneDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-900 text-sm mb-2">
                    Last Done TACH
                  </label>
                  <input
                    type="text"
                    name="lastDoneTach"
                    value={formData.lastDoneTach}
                    onChange={handleChange}
                    placeholder="e.g. 1123.5"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-900 text-sm mb-2">
                    Last Done AFTT
                  </label>
                  <input
                    type="text"
                    name="lastDoneAftt"
                    value={formData.lastDoneAftt}
                    onChange={handleChange}
                    placeholder="e.g. 1098.2"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Last Done Method of Compliance */}
              <div className="mb-6">
                <label className="block text-gray-900 text-sm mb-2">
                  Last Done Method of Compliance
                </label>
                <select
                  name="lastDoneMethodOfCompliance"
                  value={formData.lastDoneMethodOfCompliance}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer pr-9"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                  }}
                >
                  <option value="">Select method</option>
                  {METHOD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
