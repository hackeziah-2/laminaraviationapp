import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Swal from "sweetalert2";
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import {
  deleteAtlBatch,
  getAtlBatchesPaged,
  type AtlBatch,
} from "../../api/aircraftTechnicalLogApi";
import {
  deleteCertificateCategoryType,
  getCertificateCategoryTypesPaged,
  type CertificateTypeOption,
} from "../../api/organizationalApprovalApi";
import type { ModuleSettingKey } from "../../constants/moduleSettingsOptions";
import { useUserPermissions } from "../../hooks/useUserPermissions";
import { getMe } from "../../api/authApi";
import {
  canCreateAtlBatch,
  canEditAtlBatch,
} from "../../utility/atlEditRbac";
import {
  deleteOemItemType,
  getOemItemTypesPaged,
  type OemItemTypeOption,
} from "../../api/oemTechnicalPublicationApi";
import { AddAtlBatchModal } from "../AddAtlBatchModal";
import { AddCertificateCategoryTypeModal } from "../AddCertificateCategoryTypeModal";
import { AddOemItemTypeModal } from "../AddOemItemTypeModal";
import {
  AUTH_SCOPE_BARON_CONFIG,
  AUTH_SCOPE_CESSNA_CONFIG,
  AUTH_SCOPE_OTHERS_CONFIG,
  AuthorizationScopeSettingsPanel,
} from "./AuthorizationScopeSettingsPanel";
import { DataTablePagination } from "../ui/DataTablePagination";

type ActiveModuleKey = Exclude<ModuleSettingKey, "">;

interface SettingsModuleSettingsProps {
  moduleKey: ActiveModuleKey;
}

function SettingsPanelShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
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

function FleetTimeMonitoringSettings() {
  return (
    <SettingsPanelShell
      title="Fleet Time Monitoring"
      description="Module settings for fleet time records, work status workflow, and technical log defaults."
    >
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700">
        <p className="mb-2 font-medium text-gray-900">Overview</p>
        <ul className="list-disc space-y-1 pl-5 text-gray-600">
          <li>
            Fleet time entries use work statuses such as{" "}
            <span className="font-medium text-gray-800">FOR REVIEW</span> and{" "}
            <span className="font-medium text-gray-800">APPROVED</span>.
          </li>
          <li>
            New entries default to review status until approved in Operations.
          </li>
          <li>
            Use{" "}
            <span className="font-medium text-gray-800">
              ATL Batch Settings
            </span>{" "}
            to manage ATL batches used when filtering fleet time records.
          </li>
        </ul>
      </div>
    </SettingsPanelShell>
  );
}

function AtlBatchSettingsPanel() {
  const { canCreate, canUpdate, canDelete } = useUserPermissions();
  const [sessionRoleName, setSessionRoleName] = useState<string | undefined>(
    undefined
  );
  const atlBatchRole = sessionRoleName?.trim();
  const hasSettingsManagePermission =
    canCreate("settings") || canUpdate("settings");
  const canCreateBatches = useMemo(
    () =>
      hasSettingsManagePermission && canCreateAtlBatch(atlBatchRole),
    [hasSettingsManagePermission, atlBatchRole]
  );
  const canEditBatches = useMemo(
    () => hasSettingsManagePermission && canEditAtlBatch(atlBatchRole),
    [hasSettingsManagePermission, atlBatchRole]
  );
  const canManageBatches = canCreateBatches || canEditBatches;
  const canRemoveBatches = canDelete("settings");

  const [batches, setBatches] = useState<AtlBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBatchId, setEditBatchId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBatches, setTotalBatches] = useState(0);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAtlBatchesPaged(currentPage, itemsPerPage);
      setBatches(res.items);
      setTotalBatches(res.total);
      setTotalPages(Math.max(1, res.pages));
      if (res.items.length === 0 && currentPage > 1 && res.total > 0) {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to load ATL batches.");
      setBatches([]);
      setTotalBatches(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setSessionRoleName(me.role?.trim() || undefined);
      })
      .catch(() => {
        if (!cancelled) setSessionRoleName(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    if (!canCreateBatches) return;
    setEditBatchId(null);
    setModalOpen(true);
  };

  const openEdit = (id: number) => {
    if (!canEditBatches) return;
    setEditBatchId(id);
    setModalOpen(true);
  };

  const handleDelete = async (batch: AtlBatch) => {
    const result = await Swal.fire({
      title: "Delete ATL batch?",
      text: `Delete "${batch.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setDeletingId(batch.id);
    try {
      await deleteAtlBatch(batch.id);
      await loadBatches();
      await Swal.fire({
        title: "Deleted!",
        text: `ATL batch "${batch.name}" has been deleted.`,
        icon: "success",
        confirmButtonColor: "#1f2937",
      });
    } catch (err: unknown) {
      const data = (
        err as {
          response?: { data?: { message?: string; detail?: string | unknown } };
        }
      )?.response?.data;
      const msg =
        (typeof data?.message === "string" ? data.message : null) ||
        (typeof data?.detail === "string" ? data.detail : null) ||
        (Array.isArray(data?.detail)
          ? (data.detail as { msg?: string }[])
              .map((d) => d.msg ?? "")
              .filter(Boolean)
              .join(", ") || null
          : null) ||
        (err as Error)?.message ||
        "Failed to delete ATL batch";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <SettingsPanelShell
        title="ATL Batch Settings"
        description="Create, edit, and remove ATL Batches used in Fleet Time Monitoring filters and logbook entries."
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-blue-600">
            {loading
              ? "Loading…"
              : `${totalBatches} batch${totalBatches === 1 ? "" : "es"}`}
          </span>
          {canCreateBatches && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create batch
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
          ) : totalBatches === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-700">
                No ATL batches yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Create a batch to use in fleet time filters and logbook entries.
              </p>
              {canCreateBatches && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create batch
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
                    Description
                  </th>
                  {(canManageBatches || canRemoveBatches) && (
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {batch.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {batch.description?.trim() || "—"}
                    </td>
                    {(canManageBatches || canRemoveBatches) && (
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {canEditBatches && (
                            <button
                              type="button"
                              onClick={() => openEdit(batch.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100"
                              title="Edit batch"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          {canRemoveBatches && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(batch)}
                              disabled={deletingId === batch.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                              title="Delete batch"
                            >
                              {deletingId === batch.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && totalBatches > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalBatches}
              totalLabel="batches"
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          )}
        </div>
      </SettingsPanelShell>

      <AddAtlBatchModal
        isOpen={modalOpen}
        editBatchId={editBatchId}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void loadBatches();
        }}
      />
    </>
  );
}

function OaApprovalTypeSettingsPanel() {
  const { canCreate, canUpdate, canDelete } = useUserPermissions();
  const canManageTypes = canCreate("settings") || canUpdate("settings");
  const canRemoveTypes = canDelete("settings");

  const [types, setTypes] = useState<CertificateTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTypeId, setEditTypeId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTypes, setTotalTypes] = useState(0);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCertificateCategoryTypesPaged(
        currentPage,
        itemsPerPage
      );
      setTypes(res.items);
      setTotalTypes(res.total);
      setTotalPages(Math.max(1, res.pages));
      if (res.items.length === 0 && currentPage > 1 && res.total > 0) {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to load approval types.");
      setTypes([]);
      setTotalTypes(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const openCreate = () => {
    setEditTypeId(null);
    setModalOpen(true);
  };

  const openEdit = (id: number) => {
    setEditTypeId(id);
    setModalOpen(true);
  };

  const handleDelete = async (type: CertificateTypeOption) => {
    const result = await Swal.fire({
      title: "Delete approval type?",
      text: `Delete "${type.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setDeletingId(type.id);
    try {
      await deleteCertificateCategoryType(type.id);
      await loadTypes();
      await Swal.fire({
        title: "Deleted!",
        text: `Approval type "${type.name}" has been deleted.`,
        icon: "success",
        confirmButtonColor: "#1f2937",
      });
    } catch (err: unknown) {
      const data = (
        err as {
          response?: { data?: { message?: string; detail?: string | unknown } };
        }
      )?.response?.data;
      const msg =
        (typeof data?.message === "string" ? data.message : null) ||
        (typeof data?.detail === "string" ? data.detail : null) ||
        (Array.isArray(data?.detail)
          ? (data.detail as { msg?: string }[])
              .map((d) => d.msg ?? "")
              .filter(Boolean)
              .join(", ") || null
          : null) ||
        (err as Error)?.message ||
        "Failed to delete approval type";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <SettingsPanelShell
        title="OA - Approval Type Setting"
        description="Create, edit, and remove approval types used in Organizational Approvals."
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-blue-600">
            {loading
              ? "Loading…"
              : `${totalTypes} type${totalTypes === 1 ? "" : "s"}`}
          </span>
          {canManageTypes && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create approval type
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
          ) : totalTypes === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-700">
                No approval types yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Create an approval type for use in Organizational Approvals.
              </p>
              {canManageTypes && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create approval type
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
                  {(canManageTypes || canRemoveTypes) && (
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {types.map((type) => (
                  <tr
                    key={type.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {type.name}
                      </div>
                    </td>
                    {(canManageTypes || canRemoveTypes) && (
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {canManageTypes && (
                            <button
                              type="button"
                              onClick={() => openEdit(type.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100"
                              title="Edit approval type"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          {canRemoveTypes && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(type)}
                              disabled={deletingId === type.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                              title="Delete approval type"
                            >
                              {deletingId === type.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && totalTypes > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalTypes}
              totalLabel="types"
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          )}
        </div>
      </SettingsPanelShell>

      <AddCertificateCategoryTypeModal
        isOpen={modalOpen}
        editTypeId={editTypeId}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void loadTypes();
        }}
      />
    </>
  );
}

function OemItemTypesSettingsPanel() {
  const { canCreate, canUpdate, canDelete } = useUserPermissions();
  const canManageTypes = canCreate("settings") || canUpdate("settings");
  const canRemoveTypes = canDelete("settings");

  const [types, setTypes] = useState<OemItemTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTypeId, setEditTypeId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTypes, setTotalTypes] = useState(0);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOemItemTypesPaged(currentPage, itemsPerPage);
      setTypes(res.items);
      setTotalTypes(res.total);
      setTotalPages(Math.max(1, res.pages));
      if (res.items.length === 0 && currentPage > 1 && res.total > 0) {
        setCurrentPage((p) => Math.max(1, p - 1));
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to load OEM item types.");
      setTypes([]);
      setTotalTypes(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const openCreate = () => {
    setEditTypeId(null);
    setModalOpen(true);
  };

  const openEdit = (id: number) => {
    setEditTypeId(id);
    setModalOpen(true);
  };

  const handleDelete = async (type: OemItemTypeOption) => {
    const result = await Swal.fire({
      title: "Delete OEM item type?",
      text: `Delete "${type.name}"? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;

    setDeletingId(type.id);
    try {
      await deleteOemItemType(type.id);
      await loadTypes();
      await Swal.fire({
        title: "Deleted!",
        text: `OEM item type "${type.name}" has been deleted.`,
        icon: "success",
        confirmButtonColor: "#1f2937",
      });
    } catch (err: unknown) {
      const data = (
        err as {
          response?: { data?: { message?: string; detail?: string | unknown } };
        }
      )?.response?.data;
      const msg =
        (typeof data?.message === "string" ? data.message : null) ||
        (typeof data?.detail === "string" ? data.detail : null) ||
        (Array.isArray(data?.detail)
          ? (data.detail as { msg?: string }[])
              .map((d) => d.msg ?? "")
              .filter(Boolean)
              .join(", ") || null
          : null) ||
        (err as Error)?.message ||
        "Failed to delete OEM item type";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <SettingsPanelShell
        title="OEM Item Types"
        description="Create, edit, and remove item types used in OEM Technical Publications."
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-semibold text-blue-600">
            {loading
              ? "Loading…"
              : `${totalTypes} type${totalTypes === 1 ? "" : "s"}`}
          </span>
          {canManageTypes && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create item type
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
          ) : totalTypes === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-700">
                No OEM item types yet
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Create an item type for use in OEM Technical Publications.
              </p>
              {canManageTypes && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create item type
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
                  {(canManageTypes || canRemoveTypes) && (
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {types.map((type) => (
                  <tr
                    key={type.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {type.name}
                      </div>
                    </td>
                    {(canManageTypes || canRemoveTypes) && (
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {canManageTypes && (
                            <button
                              type="button"
                              onClick={() => openEdit(type.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100"
                              title="Edit item type"
                            >
                              <Edit2 className="h-4 w-4" />
                              Edit
                            </button>
                          )}
                          {canRemoveTypes && (
                            <button
                              type="button"
                              onClick={() => void handleDelete(type)}
                              disabled={deletingId === type.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                              title="Delete item type"
                            >
                              {deletingId === type.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && totalTypes > 0 && (
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalTypes}
              totalLabel="types"
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          )}
        </div>
      </SettingsPanelShell>

      <AddOemItemTypeModal
        isOpen={modalOpen}
        editTypeId={editTypeId}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void loadTypes();
        }}
      />
    </>
  );
}

export function SettingsModuleSettings({
  moduleKey,
}: SettingsModuleSettingsProps) {
  if (moduleKey === "fleet-time-monitoring") {
    return <FleetTimeMonitoringSettings />;
  }
  if (moduleKey === "oa-approval-type-settings") {
    return <OaApprovalTypeSettingsPanel />;
  }
  if (moduleKey === "oem-item-types") {
    return <OemItemTypesSettingsPanel />;
  }
  if (moduleKey === "auth-scope-cessna") {
    return (
      <AuthorizationScopeSettingsPanel config={AUTH_SCOPE_CESSNA_CONFIG} />
    );
  }
  if (moduleKey === "auth-scope-baron") {
    return (
      <AuthorizationScopeSettingsPanel config={AUTH_SCOPE_BARON_CONFIG} />
    );
  }
  if (moduleKey === "auth-scope-others") {
    return (
      <AuthorizationScopeSettingsPanel config={AUTH_SCOPE_OTHERS_CONFIG} />
    );
  }
  return <AtlBatchSettingsPanel />;
}
