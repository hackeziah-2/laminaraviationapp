import { useCallback, useEffect, useState } from "react";
import Swal from "../../utils/swalDefaults";
import { Edit2, Eye, Loader2, Plus, Trash2 } from "lucide-react";
import {
  deleteAuthorizationScope,
  getAuthorizationScopesPaged,
  type AuthorizationScope,
  type AuthorizationScopeType,
} from "../../api/authorizationScopeApi";
import { useUserPermissions } from "../../hooks/useUserPermissions";
import { AddAuthorizationScopeModal } from "../AddAuthorizationScopeModal";
import { ViewAuthorizationScopeModal } from "../ViewAuthorizationScopeModal";
import { DataTablePagination } from "../ui/DataTablePagination";

export interface AuthorizationScopePanelConfig {
  scopeType: AuthorizationScopeType;
  title: string;
  description: string;
  entityLabel: string;
  entityLabelPlural: string;
  createButtonLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}

function SettingsPanelShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-gray-200 bg-white px-6 py-5 shadow-sm sm:px-7">
      <div className="mb-5">
        <h2 className="text-[1.35rem] font-semibold leading-snug text-slate-900">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function extractDeleteError(err: unknown, fallback: string): string {
  const data = (
    err as {
      response?: { data?: { message?: string; detail?: string | unknown } };
    }
  )?.response?.data;
  return (
    (typeof data?.message === "string" ? data.message : null) ||
    (typeof data?.detail === "string" ? data.detail : null) ||
    (Array.isArray(data?.detail)
      ? (data.detail as { msg?: string }[])
          .map((d) => d.msg ?? "")
          .filter(Boolean)
          .join(", ") || null
      : null) ||
    (err as Error)?.message ||
    fallback
  );
}

export function AuthorizationScopeSettingsPanel({
  config,
}: {
  config: AuthorizationScopePanelConfig;
}) {
  const { canCreate, canUpdate, canDelete } = useUserPermissions();
  const canAddScopes = canCreate("settings");
  const canEditScopes = canUpdate("settings");
  const canRemoveScopes = canDelete("settings");

  const [scopes, setScopes] = useState<AuthorizationScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editScopeId, setEditScopeId] = useState<number | null>(null);
  const [viewScopeId, setViewScopeId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalScopes, setTotalScopes] = useState(0);

  const loadScopes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuthorizationScopesPaged(
        config.scopeType,
        currentPage,
        itemsPerPage
      );
      setScopes(res.items);
      setTotalScopes(res.total);
      setTotalPages(Math.max(1, res.pages));
      if (res.items.length === 0 && currentPage > 1 && res.total > 0) {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    } catch (err: unknown) {
      setError(
        (err as Error)?.message ??
          `Failed to load ${config.entityLabelPlural}.`
      );
      setScopes([]);
      setTotalScopes(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [
    config.scopeType,
    config.entityLabelPlural,
    currentPage,
    itemsPerPage,
  ]);

  useEffect(() => {
    void loadScopes();
  }, [loadScopes]);

  const openCreate = () => {
    if (!canAddScopes) return;
    setEditScopeId(null);
    setModalOpen(true);
  };

  const openEdit = (id: number) => {
    if (!canEditScopes) return;
    setEditScopeId(id);
    setModalOpen(true);
  };

  const openView = (id: number) => {
    setViewScopeId(id);
  };

  const handleDelete = async (scope: AuthorizationScope) => {
    const result = await Swal.fire({
      title: `Delete ${config.entityLabel}?`,
      text: `Delete "${scope.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setDeletingId(scope.id);
    try {
      await deleteAuthorizationScope(config.scopeType, scope.id);
      await loadScopes();
      await Swal.fire({
        title: "Deleted!",
        text: `${config.entityLabel} "${scope.name}" has been deleted.`,
        icon: "success",
        confirmButtonColor: "#1f2937",
      });
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: extractDeleteError(
          err,
          `Failed to delete ${config.entityLabel}.`
        ),
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <SettingsPanelShell
        title={config.title}
        description={config.description}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-blue-600">
            {loading
              ? "Loading…"
              : `${totalScopes} ${totalScopes === 1 ? config.entityLabel : config.entityLabelPlural}`}
          </span>
          {canAddScopes && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {config.createButtonLabel}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : totalScopes === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-700">
                {config.emptyTitle}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {config.emptyDescription}
              </p>
              {canAddScopes && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  {config.createButtonLabel}
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scopes.map((scope) => (
                  <tr
                    key={scope.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {scope.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openView(scope.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                          title={`View ${config.entityLabel}`}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                        {canEditScopes && (
                          <button
                            type="button"
                            onClick={() => openEdit(scope.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100"
                            title={`Edit ${config.entityLabel}`}
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                        {canRemoveScopes && (
                          <button
                            type="button"
                            onClick={() => void handleDelete(scope)}
                            disabled={deletingId === scope.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                            title={`Delete ${config.entityLabel}`}
                          >
                            {deletingId === scope.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && totalScopes > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalScopes}
              totalLabel={config.entityLabelPlural}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          )}
        </div>
      </SettingsPanelShell>

      <AddAuthorizationScopeModal
        scopeType={config.scopeType}
        entityLabel={config.entityLabel}
        isOpen={modalOpen}
        editScopeId={editScopeId}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void loadScopes();
        }}
      />

      <ViewAuthorizationScopeModal
        scopeType={config.scopeType}
        entityLabel={config.entityLabel}
        scopeId={viewScopeId}
        onClose={() => setViewScopeId(null)}
      />
    </>
  );
}

export const AUTH_SCOPE_CESSNA_CONFIG: AuthorizationScopePanelConfig = {
  scopeType: "cessna",
  title: "Auth Scope Cessna",
  description:
    "Create, view, edit, and remove authorization scopes for Cessna aircraft (150, 152, 172).",
  entityLabel: "auth scope",
  entityLabelPlural: "scopes",
  createButtonLabel: "Add new",
  emptyTitle: "No auth scopes yet",
  emptyDescription:
    "Create an authorization scope for use in Personnel Authorization.",
};

export const AUTH_SCOPE_BARON_CONFIG: AuthorizationScopePanelConfig = {
  scopeType: "baron",
  title: "Auth Scope Baron",
  description:
    "Create, view, edit, and remove authorization scopes for Baron aircraft (95-C55).",
  entityLabel: "auth scope",
  entityLabelPlural: "scopes",
  createButtonLabel: "Add new",
  emptyTitle: "No auth scopes yet",
  emptyDescription:
    "Create an authorization scope for use in Personnel Authorization.",
};

export const AUTH_SCOPE_OTHERS_CONFIG: AuthorizationScopePanelConfig = {
  scopeType: "others",
  title: "Auth Scope Others",
  description:
    "Create, view, edit, and remove authorization scopes for other aircraft types.",
  entityLabel: "auth scope",
  entityLabelPlural: "scopes",
  createButtonLabel: "Add new",
  emptyTitle: "No auth scopes yet",
  emptyDescription:
    "Create an authorization scope for use in Personnel Authorization.",
};
