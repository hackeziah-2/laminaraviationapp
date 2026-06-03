import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, ChevronDown } from "lucide-react";
import {
  getAtlList,
  searchAtlOptionsForTcc,
  type AtlItem,
} from "../api/atlApi";
import { SpinnerIcon } from "./ui/spinner";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { formatDateForApi } from "../utility/utils";
import { DateInput } from "./ui/DateInput";

interface CPCPEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
  /** When true, show Edit fields (last_done_*, atl_ref) and title "Edit Entry" */
  isEdit?: boolean;
  /** Prefill for edit mode */
  initialData?: Record<string, any>;
  /** Optional aircraft ID for ATL list scope */
  aircraftId?: string | number;
}

function matchesAtlSelection(opt: AtlItem, reference: string): boolean {
  const ref = String(reference ?? "").trim();
  if (!ref) return false;
  const seq = String(opt.sequenceNo ?? "").trim();
  if (seq && seq === ref) return true;
  return String(opt.id) === ref;
}

function resolveAtlIdFromInitial(
  initialData: Record<string, any> | undefined
): number | null {
  if (!initialData) return null;
  const fromField = initialData.atlId;
  if (typeof fromField === "number" && fromField > 0) return fromField;
  const atlNested = initialData.atl;
  if (
    atlNested &&
    typeof atlNested === "object" &&
    (atlNested as any).id != null
  ) {
    const id = Number((atlNested as any).id);
    if (Number.isFinite(id) && id > 0) return id;
  }
  const ar = initialData.atl_ref;
  if (typeof ar === "number" && ar > 0) return ar;
  if (ar && typeof ar === "object" && ar.id != null) {
    const id = Number(ar.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  return null;
}

function formIntervalField(v: unknown): string {
  if (v == null || v === "") return "0";
  const s = String(v).trim();
  if (s === "-" || s === "—") return "0";
  const n = parseFloat(s.replace(/,/g, ""));
  return Number.isFinite(n) ? String(n) : "0";
}

function toDateInputValue(s: string | undefined): string {
  if (!s || !String(s).trim()) return "";
  const str = String(s).trim();
  if (str === "-" || str === "—") return "";
  return formatDateForApi(str) || "";
}

const defaultFormData = {
  inspection_operation: "",
  description: "",
  interval_hours: "0",
  interval_months: "0",
  // Edit-only
  last_done_tach: "",
  last_done_aftt: "",
  last_done_date: "",
  atl_ref: "", // display: sequence_no
  atlId: null as number | null,
};

export function CPCPEntryModal({
  isOpen,
  onClose,
  onSubmit,
  isEdit = false,
  initialData,
  aircraftId,
}: CPCPEntryModalProps) {
  const { canUpdate, canCreate } = useUserPermissions();
  const [formData, setFormData] = useState(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [atlOptions, setAtlOptions] = useState<AtlItem[]>([]);
  const [atlSearch, setAtlSearch] = useState("");
  const [atlSearchDebounced, setAtlSearchDebounced] = useState("");
  const [atlOpen, setAtlOpen] = useState(false);
  const [atlLoading, setAtlLoading] = useState(false);
  const atlListRef = useRef<HTMLDivElement>(null);
  const atlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = isEdit ? "Edit Entry" : "Add Entry";
  const submitLabel = isEdit ? "Update Entry" : "Add Entry";

  const aircraftIdNum = useMemo(() => {
    if (aircraftId == null || String(aircraftId).trim() === "") return NaN;
    return typeof aircraftId === "number"
      ? aircraftId
      : parseInt(String(aircraftId), 10);
  }, [aircraftId]);
  const aircraftIdValid = Number.isFinite(aircraftIdNum) && aircraftIdNum > 0;

  useEffect(() => {
    if (isOpen && isEdit && initialData) {
      const nestedAtl = initialData.atl_ref;
      const nestedSeq =
        nestedAtl && typeof nestedAtl === "object"
          ? String(
              (nestedAtl as any).sequence_no ??
                (nestedAtl as any).sequenceNo ??
                (nestedAtl as any).sequence_number ??
                ""
            ).trim()
          : "";
      const refDisplay =
        initialData.atl_ref_display ?? initialData.reference ?? nestedSeq ?? "";
      setFormData({
        ...defaultFormData,
        inspection_operation:
          initialData.inspection_operation ?? initialData.inspectionCode ?? "",
        description: initialData.description ?? "",
        interval_hours: formIntervalField(
          initialData.interval_hours ?? initialData.interval?.hours
        ),
        interval_months: formIntervalField(
          initialData.interval_months ?? initialData.interval?.months
        ),
        last_done_tach:
          initialData.last_done_tach ??
          initialData.lastDone?.tach ??
          initialData.lastDone?.tech ??
          "",
        last_done_aftt:
          initialData.last_done_aftt ?? initialData.lastDone?.aftf ?? "",
        last_done_date: toDateInputValue(
          initialData.last_done_date ?? initialData.lastDone?.date
        ),
        atl_ref: refDisplay,
        atlId: resolveAtlIdFromInitial(initialData),
      });
      setAtlSearch(refDisplay);
      setAtlSearchDebounced(refDisplay);
    } else if (isOpen && !isEdit) {
      setFormData({ ...defaultFormData });
      setAtlSearch("");
      setAtlSearchDebounced("");
    }
  }, [isOpen, isEdit, initialData]);

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

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const run = async () => {
      setAtlLoading(true);
      try {
        let list: AtlItem[];
        const cpcpAtlOpts = { resultLineStyle: "cpcp" as const };
        if (aircraftIdValid) {
          list = await searchAtlOptionsForTcc(
            atlSearchDebounced,
            aircraftIdNum,
            cpcpAtlOpts
          );
        } else {
          list = await getAtlList(
            atlSearchDebounced.trim(),
            undefined,
            cpcpAtlOpts
          );
        }
        if (!cancelled) setAtlOptions(list);
      } finally {
        if (!cancelled) setAtlLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, atlSearchDebounced, aircraftIdValid, aircraftIdNum]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formData.inspection_operation.trim())
      newErrors.inspection_operation = "Inspection operation is required";
    if (!formData.description.trim())
      newErrors.description = "Description is required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    const payload: Record<string, any> = {
      inspection_operation: formData.inspection_operation.trim() || undefined,
      description: formData.description.trim() || undefined,
      interval_hours: formData.interval_hours.trim() || undefined,
      interval_months: formData.interval_months.trim() || undefined,
      last_done_tach: formData.last_done_tach.trim() || undefined,
      last_done_aftt: formData.last_done_aftt.trim() || undefined,
      last_done_date: formData.last_done_date || undefined,
    };
    if (formData.atlId != null) payload.atl_ref = formData.atlId;
    onSubmit(payload);
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleClose = () => {
    onClose();
    setFormData(defaultFormData);
    setErrors({});
    setAtlOpen(false);
    setAtlSearch("");
    setAtlSearchDebounced("");
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
                ? "Update inspection and last-done / ATL reference."
                : "Enter inspection operation, description, and intervals."}
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
          {/* Add + Edit: Inspection operation, Description, Interval hours/months */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Inspection operation *
              </label>
              <input
                type="text"
                name="inspection_operation"
                value={formData.inspection_operation}
                onChange={handleChange}
                placeholder="e.g. IO 1, IO 2"
                className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.inspection_operation
                    ? "border-red-500"
                    : "border-gray-200"
                }`}
              />
              {errors.inspection_operation && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.inspection_operation}
                </p>
              )}
            </div>
            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Inspection description"
                rows={3}
                className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.description ? "border-red-500" : "border-gray-200"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  Interval Hours
                </label>
                <input
                  type="text"
                  name="interval_hours"
                  value={formData.interval_hours}
                  onChange={handleChange}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  Interval Months
                </label>
                <input
                  type="text"
                  name="interval_months"
                  value={formData.interval_months}
                  onChange={handleChange}
                  placeholder="e.g. 12"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="mb-6" ref={atlListRef}>
            <label className="block text-gray-900 text-sm font-medium mb-1.5">
              ATL Reference (Search by Sequence No)
            </label>
            {!aircraftIdValid ? (
              <p className="text-xs text-amber-700 mb-2">
                A valid aircraft ID is required to search this aircraft&apos;s
                ATL (including technical log fallback).
              </p>
            ) : null}
            <div className="relative">
              <input
                type="text"
                value={
                  atlOpen
                    ? atlSearch
                    : atlOptions.find((o) =>
                        matchesAtlSelection(o, formData.atl_ref)
                      )?.label ?? formData.atl_ref
                }
                onChange={(e) => {
                  const val = e.target.value;
                  setAtlSearch(val);
                  setFormData((prev) => ({
                    ...prev,
                    atl_ref: val,
                    atlId: null,
                  }));
                  setAtlOpen(true);
                }}
                onFocus={() => {
                  setAtlOpen(true);
                  if (!atlSearch && formData.atl_ref)
                    setAtlSearch(formData.atl_ref);
                }}
                onBlur={() => setTimeout(() => setAtlOpen(false), 200)}
                placeholder="Search by ATL sequence number..."
                className="w-full min-h-[2.75rem] pl-3 pr-9 py-2.5 text-sm leading-normal bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      {atlOptions.map((opt) => (
                        <li key={opt.id}>
                          <button
                            type="button"
                            className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                              formData.atlId === opt.id
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : "text-gray-900 hover:bg-gray-50"
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData((prev) => {
                                const next: typeof prev = {
                                  ...prev,
                                  atl_ref: opt.sequenceNo ?? String(opt.id),
                                  atlId: opt.id,
                                };
                                if (
                                  opt.cpcpLastDoneTach != null &&
                                  opt.cpcpLastDoneTach !== ""
                                ) {
                                  next.last_done_tach = opt.cpcpLastDoneTach;
                                }
                                if (
                                  opt.cpcpLastDoneAftt != null &&
                                  opt.cpcpLastDoneAftt !== ""
                                ) {
                                  next.last_done_aftt = opt.cpcpLastDoneAftt;
                                }
                                if (
                                  opt.cpcpLastDoneDate != null &&
                                  opt.cpcpLastDoneDate !== ""
                                ) {
                                  next.last_done_date = opt.cpcpLastDoneDate;
                                }
                                return next;
                              });
                              setAtlSearch(opt.sequenceNo ?? String(opt.id));
                              setAtlOpen(false);
                            }}
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  Last Done TACH
                </label>
                <input
                  type="text"
                  name="last_done_tach"
                  value={formData.last_done_tach}
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
                  name="last_done_aftt"
                  value={formData.last_done_aftt}
                  onChange={handleChange}
                  placeholder="e.g. 1098.2"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-900 text-sm mb-2">
                  Last Done Date
                </label>
                <DateInput
                  name="last_done_date"
                  value={formData.last_done_date}
                  onChange={(last_done_date) => {
                    setFormData((prev) => ({ ...prev, last_done_date }));
                    if (errors.last_done_date)
                      setErrors((prev) => ({ ...prev, last_done_date: "" }));
                  }}
                  className="w-full"
                />
              </div>
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
