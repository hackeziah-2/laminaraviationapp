import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  formatAtlWorkStatusLabel,
  type AtlWorkStatusKey,
} from "../utility/atlEditRbac";

export interface BulkStatusModalProps {
  isOpen: boolean;
  selectedCount: number;
  statusOptions: readonly AtlWorkStatusKey[];
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (workStatus: AtlWorkStatusKey, atomic: boolean) => void | Promise<void>;
}

export function BulkStatusModal({
  isOpen,
  selectedCount,
  statusOptions,
  submitting = false,
  onClose,
  onConfirm,
}: BulkStatusModalProps) {
  const [workStatus, setWorkStatus] = useState<AtlWorkStatusKey | "">("");
  const [atomic, setAtomic] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setWorkStatus(statusOptions[0] ?? "");
      setAtomic(false);
      setError("");
    }
  }, [isOpen, statusOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workStatus) {
      setError("Please select a work status.");
      return;
    }
    setError("");
    await onConfirm(workStatus, atomic);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-labelledby="bulk-status-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2
            id="bulk-status-title"
            className="text-lg font-semibold text-gray-900"
          >
            Update Work Status
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <p className="text-sm text-gray-600">
            Update work status for{" "}
            <span className="font-medium text-gray-900">
              {selectedCount} selected{" "}
              {selectedCount === 1 ? "entry" : "entries"}
            </span>
            .
          </p>

          <div>
            <label
              htmlFor="bulk-work-status"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              New work status *
            </label>
            <select
              id="bulk-work-status"
              value={workStatus}
              onChange={(e) => {
                setWorkStatus(e.target.value as AtlWorkStatusKey);
                setError("");
              }}
              disabled={submitting || statusOptions.length === 0}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50"
            >
              {statusOptions.length === 0 ? (
                <option value="">No statuses available for your role</option>
              ) : (
                statusOptions.map((key) => (
                  <option key={key} value={key}>
                    {formatAtlWorkStatusLabel(key)}
                  </option>
                ))
              )}
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={atomic}
              onChange={(e) => setAtomic(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium">Atomic update</span>
              <span className="mt-0.5 block text-gray-500">
                When enabled, the entire batch fails if any selected entry cannot
                be updated. When off, valid entries are updated and failures are
                reported separately.
              </span>
            </span>
          </label>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting || !workStatus || statusOptions.length === 0
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Updating…" : "Update status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
