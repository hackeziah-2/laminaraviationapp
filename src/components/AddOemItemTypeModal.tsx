import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Swal from "sweetalert2";
import { confirmSaveEntry } from "../utils/confirmSaveEntry";
import {
  createOemItemType,
  getOemItemTypeById,
  updateOemItemType,
  type OemItemTypeOption,
} from "../api/oemTechnicalPublicationApi";
import { Spinner } from "./ui/spinner";

interface AddOemItemTypeModalProps {
  isOpen: boolean;
  /** When set, modal PATCHes `/api/v1/oem-item-types/{id}/`; otherwise POST create */
  editTypeId: number | null;
  onClose: () => void;
  onSaved: (type: OemItemTypeOption) => void;
}

export function AddOemItemTypeModal({
  isOpen,
  editTypeId,
  onClose,
  onSaved,
}: AddOemItemTypeModalProps) {
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingType, setLoadingType] = useState(false);

  const isEdit = editTypeId != null && editTypeId > 0;

  useEffect(() => {
    if (!isOpen) return;

    const editing = editTypeId != null && editTypeId > 0;

    if (!editing) {
      setName("");
      setErrors({});
      setSubmitting(false);
      setLoadingType(false);
      return;
    }

    let cancelled = false;
    setLoadingType(true);
    setSubmitting(false);
    getOemItemTypeById(editTypeId!)
      .then((t) => {
        if (!cancelled) setName(t.name);
      })
      .catch(async (err: unknown) => {
        const e = err as {
          response?: { data?: { detail?: unknown } };
          message?: string;
        };
        const detail = e?.response?.data?.detail;
        const text =
          typeof detail === "string"
            ? detail
            : e?.message ?? "Could not load OEM item type.";
        await Swal.fire({
          icon: "error",
          title: "Load failed",
          text,
          confirmButtonColor: "#2563eb",
        });
        if (!cancelled) onClose();
      })
      .finally(() => {
        if (!cancelled) setLoadingType(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, editTypeId, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: "Item type name is required" });
      return;
    }
    setErrors({});
    if (loadingType || submitting) return;

    setSubmitting(true);
    try {
      await confirmSaveEntry(isEdit, async () => {
        const type = isEdit
          ? await updateOemItemType(editTypeId!, { name: trimmed })
          : await createOemItemType({ name: trimmed });
        onSaved(type);
        onClose();
      });
    } finally {
      setSubmitting(false);
    }
  };

  const titleId = isEdit
    ? "edit-oem-item-type-title"
    : "create-oem-item-type-title";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={() => !submitting && !loadingType && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-labelledby={titleId}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit OEM item type" : "Create OEM item type"}
            </h3>
            <button
              type="button"
              onClick={() => !submitting && !loadingType && onClose()}
              className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative space-y-4 px-6 py-5">
            {loadingType && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
                <Spinner />
              </div>
            )}
            <div>
              <label
                htmlFor="oem-item-type-name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="oem-item-type-name"
                type="text"
                value={name}
                onChange={(ev) => {
                  setName(ev.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                  errors.name
                    ? "border-red-500 focus:border-red-500 focus:ring-red-300"
                    : "border-gray-300 focus:border-blue-500"
                }`}
                placeholder="Item type name"
                disabled={submitting || loadingType}
                autoComplete="off"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={() => !submitting && !loadingType && onClose()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              disabled={submitting || loadingType}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingType}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
