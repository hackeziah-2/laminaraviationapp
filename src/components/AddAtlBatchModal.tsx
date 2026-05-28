import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Swal from "sweetalert2";
import {
  createAtlBatch,
  getAtlBatchById,
  updateAtlBatch,
  type AtlBatch,
} from "../api/aircraftTechnicalLogApi";
import { Spinner } from "./ui/spinner";

interface AddAtlBatchModalProps {
  isOpen: boolean;
  /** When set, modal PATCHes `/api/v1/atl-batch/{id}/`; otherwise POST create */
  editBatchId: number | null;
  onClose: () => void;
  onSaved: (batch: AtlBatch) => void;
}

export function AddAtlBatchModal({
  isOpen,
  editBatchId,
  onClose,
  onSaved,
}: AddAtlBatchModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

  const isEdit = editBatchId != null && editBatchId > 0;

  useEffect(() => {
    if (!isOpen) return;

    const editing = editBatchId != null && editBatchId > 0;

    if (!editing) {
      setName("");
      setDescription("");
      setErrors({});
      setSubmitting(false);
      setLoadingBatch(false);
      return;
    }

    let cancelled = false;
    setLoadingBatch(true);
    setSubmitting(false);
    getAtlBatchById(editBatchId!)
      .then((b) => {
        if (!cancelled) {
          setName(b.name);
          setDescription(b.description ?? "");
        }
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
            : e?.message ?? "Could not load batch.";
        await Swal.fire({
          icon: "error",
          title: "Load failed",
          text,
          confirmButtonColor: "#2563eb",
        });
        if (!cancelled) onClose();
      })
      .finally(() => {
        if (!cancelled) setLoadingBatch(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, editBatchId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: "Batch name is required" });
      return;
    }
    setErrors({});
    if (loadingBatch) return;

    setSubmitting(true);
    try {
      const batch = isEdit
        ? await updateAtlBatch(editBatchId!, {
            name: trimmed,
            description: description,
          })
        : await createAtlBatch({
            name: trimmed,
            description: description.trim() || undefined,
          });
      if (isEdit) {
        await Swal.fire({
          title: "Updated!",
          text: `ATL batch "${batch.name}" has been updated.`,
          icon: "success",
          confirmButtonColor: "#1f2937",
        });
      }
      onSaved(batch);
      onClose();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { detail?: unknown } };
        message?: string;
      };
      const detail = e?.response?.data?.detail;
      const text =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
          ? detail.map((d) => String(d)).join(" ")
          : e?.message ?? `Failed to ${isEdit ? "update" : "create"} batch.`;
      await Swal.fire({
        icon: "error",
        title: isEdit ? "Could not update batch" : "Could not create batch",
        text,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const titleId = isEdit ? "edit-atl-batch-title" : "create-atl-batch-title";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={() => !submitting && !loadingBatch && onClose()}
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
              {isEdit ? "Edit ATL batch" : "Create ATL batch"}
            </h3>
            <button
              type="button"
              onClick={() => !submitting && !loadingBatch && onClose()}
              className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative space-y-4 px-6 py-5">
            {loadingBatch && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
                <Spinner />
              </div>
            )}
            <div>
              <label
                htmlFor="atl-batch-name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="atl-batch-name"
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
                placeholder="Batch name"
                disabled={submitting || loadingBatch}
                autoComplete="off"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="atl-batch-description"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="atl-batch-description"
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
                rows={3}
                className="w-full resize-y rounded-lg border-2 border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Optional description"
                disabled={submitting || loadingBatch}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={() => !submitting && !loadingBatch && onClose()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              disabled={submitting || loadingBatch}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingBatch}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting
                ? "Saving…"
                : isEdit
                ? "Save changes"
                : "Create batch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
