import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Swal from "../utils/swalDefaults";
import { confirmSaveEntry } from "../utils/confirmSaveEntry";
import {
  createAuthorizationScope,
  getAuthorizationScopeById,
  updateAuthorizationScope,
  type AuthorizationScope,
  type AuthorizationScopeType,
} from "../api/authorizationScopeApi";
import { Spinner } from "./ui/spinner";

interface AddAuthorizationScopeModalProps {
  scopeType: AuthorizationScopeType;
  entityLabel: string;
  isOpen: boolean;
  editScopeId: number | null;
  onClose: () => void;
  onSaved: (scope: AuthorizationScope) => void;
}

export function AddAuthorizationScopeModal({
  scopeType,
  entityLabel,
  isOpen,
  editScopeId,
  onClose,
  onSaved,
}: AddAuthorizationScopeModalProps) {
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingScope, setLoadingScope] = useState(false);

  const isEdit = editScopeId != null && editScopeId > 0;

  useEffect(() => {
    if (!isOpen) return;

    const editing = editScopeId != null && editScopeId > 0;

    if (!editing) {
      setName("");
      setErrors({});
      setSubmitting(false);
      setLoadingScope(false);
      return;
    }

    let cancelled = false;
    setLoadingScope(true);
    setSubmitting(false);
    getAuthorizationScopeById(scopeType, editScopeId!)
      .then((scope) => {
        if (!cancelled) setName(scope.name);
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
            : e?.message ?? `Could not load ${entityLabel}.`;
        await Swal.fire({
          icon: "error",
          title: "Load failed",
          text,
          confirmButtonColor: "#2563eb",
        });
        if (!cancelled) onClose();
      })
      .finally(() => {
        if (!cancelled) setLoadingScope(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, editScopeId, onClose, scopeType, entityLabel]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: "Name is required" });
      return;
    }
    setErrors({});
    if (loadingScope || submitting) return;

    setSubmitting(true);
    try {
      await confirmSaveEntry(isEdit, async () => {
        const scope = isEdit
          ? await updateAuthorizationScope(scopeType, editScopeId!, {
              name: trimmed,
            })
          : await createAuthorizationScope(scopeType, { name: trimmed });
        onSaved(scope);
        onClose();
      });
    } finally {
      setSubmitting(false);
    }
  };

  const titleId = isEdit
    ? `edit-auth-scope-${scopeType}-title`
    : `create-auth-scope-${scopeType}-title`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        role="dialog"
        aria-labelledby={titleId}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">
              {isEdit ? `Edit ${entityLabel}` : `Create ${entityLabel}`}
            </h3>
            <button
              type="button"
              onClick={() => !submitting && !loadingScope && onClose()}
              className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative space-y-4 px-6 py-5">
            {loadingScope && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80">
                <Spinner />
              </div>
            )}
            <div>
              <label
                htmlFor={`auth-scope-${scopeType}-name`}
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id={`auth-scope-${scopeType}-name`}
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
                placeholder="Scope name"
                disabled={submitting || loadingScope}
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
              onClick={() => !submitting && !loadingScope && onClose()}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              disabled={submitting || loadingScope}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingScope}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create scope"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
