import { useCallback, useEffect, useState } from "react";
import { Loader, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createNatureOfFlightDescription,
  deleteNatureOfFlightDescription,
  getNatureOfFlightDescriptionById,
  getNatureOfFlightDescriptionByNature,
  getNatureOfFlightDescriptions,
  toNatureOfFlightType,
  updateNatureOfFlightDescription,
  type NatureOfFlightDescription,
  type NatureOfFlightDescriptionWrite,
} from "../api/natureOfFlightDescriptionsApi";
import { formatNatureOfFlightForDisplay } from "../api/atlApi";
import { formatApiErrorForSwal } from "../utility/utils";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";
import Swal from "../utils/swalDefaults";
import { confirmSaveEntry } from "../utils/confirmSaveEntry";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { usePreserveListView } from "../hooks/usePreserveListView";
import { DataTablePagination } from "./ui/DataTablePagination";
import { Spinner } from "./ui/spinner";
import { AddNatureOfFlightDescriptionModal } from "./AddNatureOfFlightDescriptionModal";

type NatureOfFlightDescriptionsProps = {
  aircraftId: number;
};

export function NatureOfFlightDescriptions({
  aircraftId,
}: NatureOfFlightDescriptionsProps) {
  const { canCreate, canUpdate, canDelete } = useUserPermissions();
  const [items, setItems] = useState<NatureOfFlightDescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] =
    useState<NatureOfFlightDescription | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);

  const {
    listScrollRef,
    captureViewForRestore,
    beginPreserveViewSettle,
    getPendingPage,
    clearPendingViewRestore,
  } = usePreserveListView({
    isEditOpen: modalOpen,
    loading,
    listDeps: [items.length, total, currentPage],
    scrollSelector: "[data-nof-descriptions-scroll]",
  });

  const fetchDescriptions = useCallback(
    async (options?: { preserveView?: boolean }) => {
      if (!aircraftId || aircraftId <= 0) return;
      const preserveView = Boolean(options?.preserveView);
      const pageToFetch = preserveView
        ? getPendingPage(currentPage)
        : currentPage;
      if (!preserveView) setLoading(true);
      setError(null);
      try {
        const res = await getNatureOfFlightDescriptions(
          aircraftId,
          pageToFetch,
          itemsPerPage
        );
        setItems(res.items);
        setTotal(res.total);
        setPages(res.pages);
        if (preserveView && pageToFetch !== currentPage) {
          setCurrentPage(pageToFetch);
        }
      } catch (err) {
        setError(
          formatApiErrorMessage(err, "Failed to load nature of flight descriptions.")
        );
        setItems([]);
        setTotal(0);
        setPages(1);
      } finally {
        if (!preserveView) {
          setLoading(false);
        } else {
          beginPreserveViewSettle();
        }
      }
    },
    [
      aircraftId,
      currentPage,
      itemsPerPage,
      getPendingPage,
      beginPreserveViewSettle,
    ]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [aircraftId]);

  useEffect(() => {
    void fetchDescriptions();
  }, [fetchDescriptions]);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingItem(null);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = async (item: NatureOfFlightDescription) => {
    setLoadingEditId(item.id);
    try {
      const nature = toNatureOfFlightType(item.natureOfFlight);
      // Aircraft-scoped GET is by TypeEnum, not numeric id (id → 422).
      const byNature = nature
        ? await getNatureOfFlightDescriptionByNature(aircraftId, nature)
        : null;
      if (byNature) {
        setEditingItem({
          id: byNature.id || item.id,
          aircraftId: byNature.aircraftId ?? item.aircraftId,
          natureOfFlight:
            byNature.natureOfFlight || nature || item.natureOfFlight,
          remarks: byNature.remarks,
          actionTaken: byNature.actionTaken,
        });
      } else {
        const latest = await getNatureOfFlightDescriptionById(
          aircraftId,
          item.id
        );
        setEditingItem(latest);
      }
      setModalOpen(true);
    } catch (err) {
      const swal = formatApiErrorForSwal(err, {
        defaultTitle: "Could not load description",
        fallbackMessage: "Failed to load the latest description. Using list data.",
      });
      await Swal.fire(swal);
      setEditingItem({
        ...item,
        natureOfFlight:
          toNatureOfFlightType(item.natureOfFlight) ?? item.natureOfFlight,
      });
      setModalOpen(true);
    } finally {
      setLoadingEditId(null);
    }
  };

  const handleSubmit = async (values: NatureOfFlightDescriptionWrite) => {
    if (saving) return;
    const isUpdate = Boolean(editingItem);
    setSaving(true);
    let saveError: unknown = null;
    try {
      if (isUpdate && editingItem) {
        captureViewForRestore(editingItem.id, currentPage);
      } else {
        captureViewForRestore(null, currentPage);
      }

      const saved = await confirmSaveEntry(isUpdate, async () => {
        try {
          if (editingItem) {
            await updateNatureOfFlightDescription(
              aircraftId,
              editingItem.id,
              values
            );
          } else {
            await createNatureOfFlightDescription(aircraftId, values);
          }
        } catch (err) {
          saveError = err;
          throw err;
        }
        setModalOpen(false);
        setEditingItem(null);
        await fetchDescriptions({ preserveView: true });
      });

      if (!saved) {
        clearPendingViewRestore();
        if (saveError) throw saveError;
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: NatureOfFlightDescription) => {
    const label = item.natureOfFlight
      ? formatNatureOfFlightForDisplay(item.natureOfFlight)
      : `#${item.id}`;
    const result = await Swal.fire({
      title: "Delete description?",
      text: `"${label}" — This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;

    setDeletingId(item.id);
    try {
      await deleteNatureOfFlightDescription(aircraftId, item.id);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Description deleted.",
        timer: 1500,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      const nextPage =
        items.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      if (nextPage !== currentPage) {
        setCurrentPage(nextPage);
      } else {
        await fetchDescriptions();
      }
    } catch (err) {
      await Swal.fire(
        formatApiErrorForSwal(err, {
          defaultTitle: "Error",
          fallbackMessage: "Failed to delete description.",
        })
      );
    } finally {
      setDeletingId(null);
    }
  };

  const displayValue = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : "—";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 pb-4">
        <h3 className="text-gray-900 text-base sm:text-lg">
          Nature of Flight Descriptions
        </h3>
        {canCreate("profile") && (
          <button
            type="button"
            onClick={openAddModal}
            disabled={saving}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Description
          </button>
        )}
      </div>

      {error && (
        <div className="mx-4 sm:mx-6 mb-4 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchDescriptions()}
            className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <div
        ref={listScrollRef}
        data-nof-descriptions-scroll
        className="overflow-x-auto"
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner label="Loading descriptions…" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                  Nature of Flight
                </th>
                <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                  Remarks
                </th>
                <th className="px-5 py-3 text-left text-gray-900 text-xs uppercase tracking-wider">
                  Action Taken
                </th>
                <th className="px-5 py-3 text-center text-gray-900 text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-gray-500 text-sm"
                  >
                    No nature of flight descriptions. Add one to get started.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    data-list-entry-id={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {row.natureOfFlight
                        ? formatNatureOfFlightForDisplay(row.natureOfFlight)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words max-w-xs">
                      {displayValue(row.remarks)}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words max-w-xs">
                      {displayValue(row.actionTaken)}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <div className="flex items-center justify-center gap-1">
                        {deletingId === row.id || loadingEditId === row.id ? (
                          <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                        ) : (
                          <>
                            {canUpdate("profile") && (
                              <button
                                type="button"
                                onClick={() => void openEditModal(row)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete("profile") && (
                              <button
                                type="button"
                                onClick={() => void handleDelete(row)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {total > 0 && !loading && (
        <DataTablePagination
          currentPage={currentPage}
          totalPages={pages || 1}
          onPageChange={setCurrentPage}
          totalItems={total}
          totalLabel="descriptions"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          showRangeText
          disabled={loading}
        />
      )}

      <AddNatureOfFlightDescriptionModal
        isOpen={modalOpen}
        saving={saving}
        editingItem={editingItem}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
