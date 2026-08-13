import { useEffect, useState, type FormEvent } from "react";
import { Loader, X } from "lucide-react";
import {
  NATURE_OF_FLIGHT_OPTIONS,
  natureOfFlightApiFieldErrors,
  toNatureOfFlightType,
  type NatureOfFlightDescription,
  type NatureOfFlightDescriptionWrite,
} from "../api/natureOfFlightDescriptionsApi";

type FormState = {
  natureOfFlight: string;
  remarks: string;
  actionTaken: string;
};

const EMPTY_FORM: FormState = {
  natureOfFlight: "",
  remarks: "",
  actionTaken: "",
};

type AddNatureOfFlightDescriptionModalProps = {
  isOpen: boolean;
  saving: boolean;
  editingItem: NatureOfFlightDescription | null;
  onClose: () => void;
  onSubmit: (values: NatureOfFlightDescriptionWrite) => Promise<void>;
};

export function AddNatureOfFlightDescriptionModal({
  isOpen,
  saving,
  editingItem,
  onClose,
  onSubmit,
}: AddNatureOfFlightDescriptionModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = Boolean(editingItem);

  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      setForm({
        natureOfFlight:
          toNatureOfFlightType(editingItem.natureOfFlight) ??
          editingItem.natureOfFlight ??
          "",
        remarks: editingItem.remarks ?? "",
        actionTaken: editingItem.actionTaken ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [isOpen, editingItem]);

  if (!isOpen) return null;

  const handleChange = (
    field: keyof FormState,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    const nature = toNatureOfFlightType(form.natureOfFlight);
    if (!form.natureOfFlight.trim()) {
      next.natureOfFlight = "Nature of Flight is required.";
    } else if (!nature) {
      next.natureOfFlight = "Select a valid nature of flight.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;
    const nature = toNatureOfFlightType(form.natureOfFlight);
    if (!nature) return;
    try {
      await onSubmit({
        natureOfFlight: nature,
        remarks: form.remarks.trim(),
        actionTaken: form.actionTaken.trim(),
      });
    } catch (err) {
      const fieldErrors = natureOfFlightApiFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? "border-red-500" : "border-gray-300"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nof-description-modal-title"
        className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2
              id="nof-description-modal-title"
              className="text-gray-900"
            >
              {isEdit ? "Edit Description" : "Add Description"}
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {isEdit
                ? "Update the nature of flight description."
                : "Enter the details for the new nature of flight description."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="px-6 py-5 space-y-4 overflow-y-auto min-h-0 flex-1">
            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Nature of Flight <span className="text-red-500">*</span>
              </label>
              <select
                value={form.natureOfFlight}
                onChange={(e) => handleChange("natureOfFlight", e.target.value)}
                disabled={saving}
                className={`${inputClass(Boolean(errors.natureOfFlight))} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8`}
              >
                <option value="">Select nature of flight</option>
                {NATURE_OF_FLIGHT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                {form.natureOfFlight &&
                !NATURE_OF_FLIGHT_OPTIONS.some(
                  (opt) => opt.value === form.natureOfFlight
                ) ? (
                  <option value={form.natureOfFlight}>
                    {form.natureOfFlight}
                  </option>
                ) : null}
              </select>
              {errors.natureOfFlight ? (
                <p className="text-red-600 text-xs mt-1">
                  {errors.natureOfFlight}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Remarks
              </label>
              <textarea
                value={form.remarks}
                onChange={(e) => handleChange("remarks", e.target.value)}
                disabled={saving}
                rows={4}
                className={inputClass(Boolean(errors.remarks))}
              />
              {errors.remarks ? (
                <p className="text-red-600 text-xs mt-1">{errors.remarks}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-gray-900 text-sm mb-2">
                Action Taken
              </label>
              <textarea
                value={form.actionTaken}
                onChange={(e) => handleChange("actionTaken", e.target.value)}
                disabled={saving}
                rows={4}
                className={inputClass(Boolean(errors.actionTaken))}
              />
              {errors.actionTaken ? (
                <p className="text-red-600 text-xs mt-1">
                  {errors.actionTaken}
                </p>
              ) : null}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
