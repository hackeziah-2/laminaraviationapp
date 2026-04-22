import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import type { ComponentItem } from "./TCCDetail";
import { searchAtlOptionsForTcc, type AtlItem } from "../api/atlApi";
import { SpinnerIcon } from "./ui/spinner";
import { useUserPermissions } from "../hooks/useUserPermissions";
import Swal from "sweetalert2";

interface AddTCCModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (component: any) => void;
  editingItem?: ComponentItem | null;
  onUpdate?: (id: number, component: any) => void;
  /** When editing, prefill category from current tab (POWERPLANT | AIRFRAME | PROPELLER) */
  activeCategory?: string;
  /** Aircraft ID for ATL search (Add + Edit) */
  aircraftId?: string;
}

function atlOptionKey(opt: AtlItem): string {
  return String(opt.sequenceNo ?? opt.id ?? "").trim();
}

function matchesAtlSelection(opt: AtlItem, reference: string): boolean {
  const ref = String(reference ?? "").trim();
  if (!ref) return false;
  const seq = atlOptionKey(opt);
  return seq === ref || String(opt.id) === ref;
}

const METHOD_OPTIONS = [
  "Overhaul",
  "Replacement",
  "Inspection",
  "I&S",
  "Operational Test",
  "Calibration",
];

/** Map API/display category (e.g. Powerplant) back to form select values */
function apiCategoryToFormValue(cat: string | undefined): string {
  if (!cat?.trim()) return "";
  const key = cat.trim().toLowerCase();
  const map: Record<string, string> = {
    powerplant: "POWERPLANT",
    airframe: "AIRFRAME",
    propeller: "PROPELLER",
    "inspection servicing": "INSPECTION_SERVICING",
  };
  return map[key] ?? cat.trim().toUpperCase().replace(/\s+/g, "_");
}

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
  componentLimitYears: "",
  methodOfCompliance: "",
  // Edit-only
  atlReference: "",
  atlId: null as number | null,
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
  const { canUpdate, canCreate } = useUserPermissions();
  const [formData, setFormData] = useState(defaultFormData);
  const [atlOptions, setAtlOptions] = useState<AtlItem[]>([]);
  const [atlSearch, setAtlSearch] = useState("");
  const [atlSearchDebounced, setAtlSearchDebounced] = useState("");
  const [atlOpen, setAtlOpen] = useState(false);
  const [atlLoading, setAtlLoading] = useState(false);
  const atlListRef = useRef<HTMLDivElement>(null);
  const atlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEdit = Boolean(editingItem);
  const title = isEdit ? "Edit TCC Entry" : "Add TCC Entry";
  const submitLabel = isEdit ? "Update TCC Entry" : "Add TCC Entry";

  useEffect(() => {
    if (isOpen && editingItem) {
      const ref = editingItem.reference ?? "";
      const categoryFromRow =
        apiCategoryToFormValue(editingItem.category) || activeCategory;
      setFormData({
        ...defaultFormData,
        category: categoryFromRow,
        partNumber: editingItem.partNo ?? "",
        serialNumber: editingItem.serialNo ?? "",
        description: editingItem.description ?? "",
        componentLimitHours: editingItem.limitHours ?? "",
        componentLimitYears: editingItem.limitYears ?? "",
        methodOfCompliance: editingItem.methodOfCompliance ?? "",
        atlReference: ref,
        atlId:
          editingItem.atlId != null && editingItem.atlId > 0
            ? editingItem.atlId
            : null,
        lastDoneDate: toDateInputValue(editingItem.lastDoneDate),
        lastDoneTach:
          editingItem.lastDoneTach ?? editingItem.lastDoneYear ?? "",
        lastDoneAftt: editingItem.lastDoneAftt ?? "",
        lastDoneMethodOfCompliance:
          editingItem.lastDoneMethodOfCompliance ?? "",
      });
      setAtlSearch(ref);
      setAtlSearchDebounced(ref);
    } else if (isOpen && !editingItem) {
      setFormData({ ...defaultFormData, category: activeCategory });
      setAtlSearch("");
      setAtlSearchDebounced("");
    }
  }, [isOpen, editingItem, activeCategory]);

  // Debounce ATL search by sequence_number (400ms)
  useEffect(() => {
    if (atlDebounceRef.current) clearTimeout(atlDebounceRef.current);
    atlDebounceRef.current = setTimeout(() => {
      setAtlSearchDebounced(atlSearch);
      atlDebounceRef.current = null;
    }, 400);
    return () => {
      if (atlDebounceRef.current) clearTimeout(atlDebounceRef.current);
    };
  }, [atlSearch]);

  // Fetch ATL options for Add + Edit (aircraft-scoped + technical-log fallback)
  useEffect(() => {
    if (!isOpen) return;
    const aircraftIdNum = aircraftId ? parseInt(String(aircraftId), 10) : NaN;
    if (!Number.isFinite(aircraftIdNum) || aircraftIdNum <= 0) {
      setAtlOptions([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setAtlLoading(true);
      try {
        const list = await searchAtlOptionsForTcc(
          atlSearchDebounced,
          aircraftIdNum
        );
        if (!cancelled) setAtlOptions(list);
      } finally {
        if (!cancelled) setAtlLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, atlSearchDebounced, aircraftId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category?.trim()) {
      void Swal.fire({
        icon: "warning",
        title: "Category required",
        text: "Please select a category.",
      });
      return;
    }
    const payload: any = {
      category: formData.category,
      partNo: formData.partNumber,
      serialNo: formData.serialNumber,
      description: formData.description,
      hours: formData.componentLimitHours,
      years: formData.componentLimitYears,
      limitHours: formData.componentLimitHours,
      limitYears: formData.componentLimitYears,
      methodOfCompliance: formData.methodOfCompliance,
      reference: formData.atlReference?.trim() || undefined, // sequence_number
      atlId: formData.atlId,
      lastDoneDate: formData.lastDoneDate || undefined,
      lastDoneYear: formData.lastDoneTach || undefined,
      lastDoneTach: formData.lastDoneTach || undefined,
      lastDoneAftt: formData.lastDoneAftt || undefined,
      lastDoneMethodOfCompliance:
        formData.lastDoneMethodOfCompliance || undefined,
    };
    if (isEdit && editingItem && onUpdate) {
      onUpdate(editingItem.id, payload);
    } else {
      onAdd(payload);
    }
    onClose();
    setFormData(defaultFormData);
    setAtlOpen(false);
    setAtlSearch("");
    setAtlSearchDebounced("");
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
    setAtlOpen(false);
    setAtlSearch("");
    setAtlSearchDebounced("");
    setAtlOptions([]);
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
              <option value="INSPECTION_SERVICING">INSPECTION_SERVICING</option>
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
                name="componentLimitYears"
                value={formData.componentLimitYears}
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

          {/* Edit-only: ATL Reference (search by sequence number), Last Done Date / TACH / AFTT */}

          <>
            {/* ATL Reference: search by ATL sequence number */}
            <div className="mb-4">
              <label className="block text-gray-900 text-sm font-medium mb-1.5">
                ATL Reference
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Search by sequence number (lists recent ATL for this aircraft, or
                matches from the technical log).
              </p>
              {(!aircraftId ||
                !Number.isFinite(parseInt(String(aircraftId), 10)) ||
                parseInt(String(aircraftId), 10) <= 0) && (
                <p className="text-xs text-amber-700 mb-2">
                  Aircraft ID is required to load ATL references.
                </p>
              )}
              <div className="relative" ref={atlListRef}>
                <input
                  type="text"
                  value={
                    atlOpen
                      ? atlSearch
                      : atlOptions.find((o) =>
                          matchesAtlSelection(o, formData.atlReference)
                        )?.label ?? formData.atlReference
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setAtlSearch(val);
                    setFormData((prev) => ({
                      ...prev,
                      atlReference: val,
                      atlId: null,
                    }));
                    setAtlOpen(true);
                  }}
                  onFocus={() => {
                    setAtlOpen(true);
                    // If input is empty but we have a value, prepopulate search?
                    // Actually, if we are syncing them, atlSearch should already be correct?
                    // But we clear atlSearch on select.
                    // Let's NOT clear atlSearch on select if we want to allow editing it later?
                    // If we clear it, then on subsequent focus `atlSearch` is empty.
                    // If atlSearch is empty, we set it to current reference:
                    if (!atlSearch && formData.atlReference) {
                      setAtlSearch(formData.atlReference);
                    }
                  }}
                  onBlur={() => setTimeout(() => setAtlOpen(false), 200)}
                  placeholder="Type or search ATL sequence number..."
                  className="w-full min-h-[2.75rem] pl-3 pr-9 py-2.5 text-sm leading-normal bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none shrink-0" />
                {atlOpen && (
                  <div className="absolute z-20 w-full mt-1.5 bg-white border border-gray-300 rounded-lg shadow-lg max-h-52 overflow-auto">
                    {atlLoading ? (
                      <div className="px-3 py-3 text-sm text-gray-500 flex items-center gap-2">
                        <SpinnerIcon size="sm" aria-hidden />
                        Loading ATL...
                      </div>
                    ) : atlOptions.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-gray-500">
                        No ATL found. Try a different sequence number.
                      </div>
                    ) : (
                      <ul className="py-1">
                        {atlOptions.map((opt) => {
                          const isSelected = matchesAtlSelection(
                            opt,
                            formData.atlReference
                          );
                          const seqVal = atlOptionKey(opt) || String(opt.id);
                          return (
                            <li key={`${opt.id}-${seqVal}`}>
                              <button
                                type="button"
                                className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                                  isSelected
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : "text-gray-900 hover:bg-gray-50"
                                }`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setFormData((prev) => ({
                                    ...prev,
                                    atlReference: seqVal,
                                    atlId: opt.id,
                                  }));
                                  setAtlSearch(seqVal);
                                  setAtlOpen(false);
                                }}
                              >
                                {opt.label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {((isEdit && canUpdate("maintenance")) ||
              (!isEdit && canCreate("maintenance"))) && (
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                {submitLabel}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
