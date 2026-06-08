import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Swal from "sweetalert2";
import {
  getAuthorizationScopeById,
  type AuthorizationScope,
  type AuthorizationScopeType,
} from "../api/authorizationScopeApi";
import { Spinner } from "./ui/spinner";

interface ViewAuthorizationScopeModalProps {
  scopeType: AuthorizationScopeType;
  entityLabel: string;
  scopeId: number | null;
  onClose: () => void;
}

function formatTimestamp(value?: string | null): string {
  if (!value?.trim()) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function ViewAuthorizationScopeModal({
  scopeType,
  entityLabel,
  scopeId,
  onClose,
}: ViewAuthorizationScopeModalProps) {
  const [scope, setScope] = useState<AuthorizationScope | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (scopeId == null || scopeId <= 0) {
      setScope(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    getAuthorizationScopeById(scopeType, scopeId)
      .then((item) => {
        if (!cancelled) setScope(item);
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
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scopeId, scopeType, entityLabel, onClose]);

  if (scopeId == null || scopeId <= 0) return null;

  const titleId = `view-auth-scope-${scopeType}-title`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={() => !loading && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 id={titleId} className="text-lg font-semibold text-gray-900">
            View {entityLabel}
          </h3>
          <button
            type="button"
            onClick={() => !loading && onClose()}
            className="rounded p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          )}
          {!loading && scope && (
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Name
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  {scope.name}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-gray-700">
                  {formatTimestamp(scope.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Last updated
                </dt>
                <dd className="mt-1 text-sm text-gray-700">
                  {formatTimestamp(scope.updatedAt)}
                </dd>
              </div>
            </dl>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
