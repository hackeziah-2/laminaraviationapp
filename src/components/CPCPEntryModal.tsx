import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { getAtlList, type AtlItem } from "../api/atlApi";

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
  inspection_operation: "",
  description: "",
  interval_hours: "",
  interval_months: "",
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
  const [formData, setFormData] = useState(defaultFormData);
  const [atlOptions, setAtlOptions] = useState<AtlItem[]>([]);
  const [atlSearch, setAtlSearch] = useState("");
  const [atlSearchDebounced, setAtlSearchDebounced] = useState("");
  const [atlOpen, setAtlOpen] = useState(false);
  const [atlLoading, setAtlLoading] = useState(false);
  const atlListRef = useRef<HTMLDivElement>(null);
  const atlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = isEdit ? "Edit Entry" : "Add Entry";
  const submitLabel = isEdit ? "Update Entry" : "Add Entry";

  useEffect(() => {
    if (isOpen && isEdit && initialData) {
      setFormData({
        ...defaultFormData,
        inspection_operation:
          initialData.inspection_operation ?? initialData.inspectionCode ?? "",
        description: initialData.description ?? "",
        interval_hours:
          initialData.interval_hours ?? initialData.interval?.hours ?? "",
        interval_months:
          initialData.interval_months ?? initialData.interval?.months ?? "",
        last_done_tach:
          initialData.last_done_tach ?? initialData.lastDone?.tach ?? initialData.lastDone?.tech ?? "",
        last_done_aftt:
          initialData.last_done_aftt ?? initialData.lastDone?.aftf ?? "",
        last_done_date: toDateInputValue(
          initialData.last_done_date ?? initialData.lastDone?.date
        ),
        atl_ref: initialData.atl_ref_display ?? initialData.reference ?? "",
        atlId: initialData.atlId ?? initialData.atl_ref ?? null,
      });
      const refDisplay =
        initialData.atl_ref_display ?? initialData.reference ?? "";
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
    if (!isOpen || !isEdit) return;
    const ac = { current: false };
    const fetch = async () => {
      setAtlLoading(true);
      try {
        const aircraftIdNum =
          aircraftId != null && String(aircraftId).trim() !== ""
            ? typeof aircraftId === "number"
              ? aircraftId
              : parseInt(String(aircraftId), 10)
            : undefined;
        const list = await getAtlList(
          atlSearchDebounced.trim(),
          !isNaN(aircraftIdNum as number) ? aircraftIdNum : undefined
        );
        if (!ac.current) setAtlOptions(list);
      } finally {
        if (!ac.current) setAtlLoading(false);
      }
    };
    fetch();
    return () => {
      ac.current = true;
    };
  }, [isOpen, isEdit, atlSearchDebounced, aircraftId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = {
      inspection_operation: formData.inspection_operation.trim() || undefined,
      description: formData.description.trim() || undefined,
      interval_hours: formData.interval_hours.trim() || undefined,
      interval_months: formData.interval_months.trim() || undefined,
    };
    if (isEdit) {
      payload.last_done_tach = formData.last_done_tach.trim() || undefined;
      payload.last_done_aftt = formData.last_done_aftt.trim() || undefined;
      payload.last_done_date = formData.last_done_date || undefined;
      if (formData.atlId != null) payload.atl_ref = formData.atlId;
    }
    onSubmit(payload);
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
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
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
                required
                placeholder="e.g. IO 1, IO 2"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Inspection description"
                rows={3}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
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

          {/* Edit-only: last_done_*, atl_ref (search by sequence_no) */}
          {isEdit && (
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
                  <input
                    type="date"
                    name="last_done_date"
                    value={formData.last_done_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-6" ref={atlListRef}>
                <label className="block text-gray-900 text-sm font-medium mb-1.5">
                  ATL Reference (Search by sequence_no)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={
                      atlOpen
                        ? atlSearch
                        : atlOptions.find(
                            (o) =>
                              (o.sequenceNo ?? String(o.id)) ===
                              formData.atl_ref
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
                          <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                                  setFormData((prev) => ({
                                    ...prev,
                                    atl_ref: opt.sequenceNo ?? String(opt.id),
                                    atlId: opt.id,
                                  }));
                                  setAtlSearch(
                                    opt.sequenceNo ?? String(opt.id)
                                  );
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
