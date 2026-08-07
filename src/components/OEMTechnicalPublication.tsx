import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Download,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { DataTablePagination } from "./ui/DataTablePagination";
import { LinkButton } from "./ui/LinkButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Swal from "../utils/swalDefaults";
import { confirmSaveEntry } from "../utils/confirmSaveEntry";
import {
  getOemPublicationsPaged,
  createOemPublication,
  updateOemPublication,
  deleteOemPublication,
  getOemItemTypesList,
  createOemItemType,
  type OemTechnicalPublication,
  type OemItemTypeOption,
  type OemPublicationSortBy,
  type SortOrder,
  getOemApiErrorMessage,
} from "../api/oemTechnicalPublicationApi";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { usePreserveListView } from "../hooks/usePreserveListView";
import { formatDateForApi, formatDisplayDate } from "../utility/utils";
import { DateInput } from "./ui/DateInput";

const SEARCH_DEBOUNCE_MS = 400;

const OEM_EXPORT_HEADERS = ["Item", "Expiration", "Link"] as const;

const CATEGORY_TYPE_OPTIONS = [
  { value: "CERTIFICATE", label: "CERTIFICATE" },
  { value: "SUBSCRIPTION", label: "SUBSCRIPTION" },
  {
    value: "REGULATORY_CORRESPONDENCE_NON_CERT",
    label: "REGULATORY CORRESPONDENCE (NON CERT)",
  },
  { value: "LICENSE", label: "LICENSE" },
] as const;

function getCategoryTypeLabel(value: string): string {
  const opt = CATEGORY_TYPE_OPTIONS.find((o) => o.value === value);
  return opt ? opt.label : value;
}

function formatExpiryDisplay(expiry: string | null | undefined): string {
  return formatDisplayDate(expiry, { fallback: "N/A" });
}

function toApiDate(value: string | null | undefined): string {
  return formatDateForApi(value);
}

export function OEMTechnicalPublication() {
  const { canUpdate, canCreate, canDelete } = useUserPermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] =
    useState<OemPublicationSortBy>("date_of_expiration");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingPublication, setViewingPublication] =
    useState<OemTechnicalPublication | null>(null);
  const [editingPublication, setEditingPublication] =
    useState<OemTechnicalPublication | null>(null);
  const [addForm, setAddForm] = useState({
    itemFk: 0,
    categoryType: "",
    expiryDate: "",
    assignLink: "",
  });
  const [itemTypes, setItemTypes] = useState<OemItemTypeOption[]>([]);
  const [showAddItemTypeModal, setShowAddItemTypeModal] = useState(false);
  const [newItemTypeName, setNewItemTypeName] = useState("");
  const [creatingItemType, setCreatingItemType] = useState(false);

  const [publications, setPublications] = useState<OemTechnicalPublication[]>(
    []
  );
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const {
    listScrollRef,
    captureViewForRestore,
    beginPreserveViewSettle,
    getPendingPage,
    clearPendingViewRestore,
  } = usePreserveListView({
    isEditOpen: Boolean(editingPublication),
    loading,
    listDeps: [publications],
  });

  useEffect(() => {
    getOemItemTypesList().then(setItemTypes);
  }, []);

  const fetchPublications = useCallback(
    async (options?: { preserveView?: boolean }) => {
      const preserveView = Boolean(options?.preserveView);
      const pageToFetch = preserveView
        ? getPendingPage(currentPage)
        : currentPage;

      if (!preserveView) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await getOemPublicationsPaged(
          pageToFetch,
          itemsPerPage,
          debouncedSearchTerm.trim(),
          sortBy,
          sortOrder
        );
        setPublications(res.items);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.pages));
        if (preserveView && pageToFetch !== currentPage) {
          setCurrentPage(pageToFetch);
        }
      } catch (err) {
        setError(getOemApiErrorMessage(err, "Failed to load publications."));
        setPublications([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (!preserveView) {
          setLoading(false);
        } else {
          beginPreserveViewSettle();
        }
      }
    },
    [
      currentPage,
      itemsPerPage,
      debouncedSearchTerm,
      sortBy,
      sortOrder,
      getPendingPage,
      beginPreserveViewSettle,
    ]
  );

  useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const openAddModal = () => {
    setEditingPublication(null);
    setAddForm({ itemFk: 0, categoryType: "", expiryDate: "", assignLink: "" });
    setShowAddModal(true);
    getOemItemTypesList().then(setItemTypes);
  };

  const openViewModal = (pub: OemTechnicalPublication) => {
    setViewingPublication(pub);
  };

  const openViewEditModal = (pub: OemTechnicalPublication) => {
    setEditingPublication(pub);
    const expiryForInput = pub.dateOfExpiration ?? pub.expiry;
    setAddForm({
      itemFk: pub.itemFk || 0,
      categoryType: pub.categoryType ?? pub.type ?? "",
      expiryDate: expiryForInput
        ? (() => {
            const d = new Date(expiryForInput);
            return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
          })()
        : "",
      assignLink:
        pub.linkToManual && pub.linkToManual !== "#" ? pub.linkToManual : "",
    });
    setShowAddModal(true);
    getOemItemTypesList().then(setItemTypes);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingPublication(null);
    setAddForm({ itemFk: 0, categoryType: "", expiryDate: "", assignLink: "" });
  };

  const handleSaveDocument = async () => {
    if (
      !addForm.itemFk ||
      !addForm.categoryType?.trim() ||
      !addForm.expiryDate?.trim()
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please select an item type, category type, and enter expiry date.",
      });
      return;
    }
    if (saving) return;

    const isUpdate = Boolean(editingPublication);
    setSaving(true);
    try {
      // Capture before confirm/success Swal so window scroll is not already reset.
      if (isUpdate && editingPublication) {
        captureViewForRestore(editingPublication.id, currentPage);
      }

      const categoryType = addForm.categoryType.trim();
      const saved = await confirmSaveEntry(isUpdate, async () => {
        if (editingPublication) {
          await updateOemPublication(editingPublication.id, {
            item: addForm.itemFk,
            category_type: categoryType,
            date_of_expiration: toApiDate(addForm.expiryDate),
            web_link: addForm.assignLink?.trim() || "",
          });
          closeAddModal();
          await fetchPublications({ preserveView: true });
        } else {
          await createOemPublication({
            item: addForm.itemFk,
            category_type: categoryType,
            date_of_expiration: toApiDate(addForm.expiryDate),
            web_link: addForm.assignLink?.trim() || null,
          });
          closeAddModal();
          await fetchPublications();
        }
      });

      if (isUpdate && !saved) {
        clearPendingViewRestore();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateItemType = async () => {
    const name = newItemTypeName?.trim();
    if (!name) {
      await Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please enter a name for the new item type.",
      });
      return;
    }
    setCreatingItemType(true);
    try {
      const created = await createOemItemType({ name });
      const list = await getOemItemTypesList();
      setItemTypes(list);
      setShowAddItemTypeModal(false);
      setNewItemTypeName("");
      if (showAddModal) {
        setAddForm((prev) => ({ ...prev, itemFk: created.id }));
      }
      await Swal.fire({
        icon: "success",
        title: "Item type created",
        text: `"${name}" has been added.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: getOemApiErrorMessage(err, "Failed to create item type."),
      });
    } finally {
      setCreatingItemType(false);
    }
  };

  const handleDeletePublication = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteOemPublication(id);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The publication has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      setCurrentPage(1);
      await fetchPublications();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: getOemApiErrorMessage(err, "Failed to delete."),
      });
    }
  };

  const handleSortChange = (field: OemPublicationSortBy) => {
    setSortBy(field);
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(1);
  };

  const handleOemExport = async (format: "csv" | "xlsx") => {
    const exportLimit = Math.max(total, 1);
    setExportLoading(true);
    try {
      const res = await getOemPublicationsPaged(
        1,
        exportLimit,
        debouncedSearchTerm.trim(),
        sortBy,
        sortOrder
      );
      const rows = res.items ?? [];
      if (!rows.length) {
        await Swal.fire({
          icon: "info",
          title: "No data to export",
          text: "There are no publications matching the current filters.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
      const escapeCsvValue = (value: string) =>
        `"${String(value).replace(/"/g, '""')}"`;
      const linkStr = (p: OemTechnicalPublication) => {
        const u =
          p.linkToManual && p.linkToManual !== "#"
            ? p.linkToManual.trim()
            : (p.webLink ?? "").trim();
        return u && u !== "#" ? u : "";
      };
      const dataRows = rows.map((p) => [
        p.itemName ?? "",
        formatExpiryDisplay(p.dateOfExpiration ?? p.expiry),
        linkStr(p),
      ]);
      const stamp = new Date().toISOString().slice(0, 10);
      const baseName = `oem_technical_publications_export_${stamp}`;
      if (format === "csv") {
        const headerLine = [...OEM_EXPORT_HEADERS]
          .map(escapeCsvValue)
          .join(",");
        const csvLines = [
          headerLine,
          ...dataRows.map((cells) => cells.map(escapeCsvValue).join(",")),
        ];
        const csvBlob = new Blob(["\uFEFF" + csvLines.join("\n")], {
          type: "text/csv;charset=utf-8;",
        });
        const url = window.URL.createObjectURL(csvBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseName}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const aoa: string[][] = [[...OEM_EXPORT_HEADERS], ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Publications");
        XLSX.writeFile(wb, `${baseName}.xlsx`);
      }
    } catch (err: unknown) {
      await Swal.fire({
        icon: "error",
        title: "Export failed",
        text: getOemApiErrorMessage(err, "Could not export publications."),
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const startIndex = (currentPage - 1) * itemsPerPage;

  const handleSearchChange = (value: string) => setSearchTerm(value);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            OEM Technical Publication
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Technical manuals, service bulletins, and subscription management
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={exportLoading || loading}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:pointer-events-none"
              >
                {exportLoading ? (
                  <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 text-gray-600" />
                )}
                <span className="text-gray-700 hidden sm:inline">Export</span>
                <ChevronDown className="w-4 h-4 shrink-0 text-gray-600 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="min-w-[11rem] border border-gray-200 bg-white p-1 text-gray-900 shadow-xl"
            >
              <DropdownMenuItem
                disabled={exportLoading || loading}
                onSelect={() => void handleOemExport("csv")}
                className="bg-white text-gray-900 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
              >
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportLoading || loading}
                onSelect={() => void handleOemExport("xlsx")}
                className="bg-white text-gray-900 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
              >
                Export XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canCreate("regulatory-compliance") && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Publication</span>
            </button>
          )}
        </div>
      </div>

      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">
          OEM TECHNICAL PUBLICATION
        </span>
        <span className="text-sm"></span>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              Search Publications
            </label>
            <input
              type="text"
              placeholder="Search by item or expiry..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-gray-600">
        Showing {total > 0 ? startIndex + 1 : 0} to{" "}
        {Math.min(startIndex + itemsPerPage, total)} of {total} publications
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div
          ref={listScrollRef}
          data-atl-list-scroll
          className="overflow-x-auto"
        >
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSortChange("item__name")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    ITEM
                    {sortBy === "item__name" && (
                      <span className="text-blue-600">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSortChange("date_of_expiration")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    />
                    EXPIRY
                    {sortBy === "date_of_expiration" && (
                      <span className="text-blue-600">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  LINK TO MANUAL
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto inline-block" />
                    <p className="text-gray-500 mt-2 text-sm">
                      Loading publications...
                    </p>
                  </td>
                </tr>
              ) : publications.length > 0 ? (
                publications.map((pub) => {
                  const isWithhold =
                    pub.isWithhold ??
                    (pub as { is_withhold?: boolean }).is_withhold ??
                    false;
                  const rowBg = isWithhold
                    ? "bg-red-100 hover:bg-red-200"
                    : "hover:bg-gray-50";
                  const cellClass = `px-6 py-3.5 ${
                    isWithhold ? "text-red-900" : "text-gray-900"
                  }`;
                  return (
                    <tr
                      key={pub.id}
                      data-list-entry-id={pub.id}
                      className={`${rowBg} transition-colors`}
                    >
                      <td className={`${cellClass} font-medium`}>
                        {pub.itemName || pub.itemFk}
                      </td>
                      <td className={cellClass}>
                        {formatExpiryDisplay(
                          pub.dateOfExpiration ?? pub.expiry
                        )}
                      </td>
                      <td className={cellClass}>
                        {pub.linkToManual && pub.linkToManual !== "#" ? (
                          <LinkButton href={pub.linkToManual} />
                        ) : (
                          <span
                            className={
                              isWithhold ? "text-red-600" : "text-gray-400"
                            }
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className={`${cellClass} whitespace-nowrap`}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openViewModal(pub)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                            title="View Publication"
                            aria-label="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canUpdate("regulatory-compliance") && (
                            <button
                              type="button"
                              onClick={() => openViewEditModal(pub)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit"
                              aria-label="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete("regulatory-compliance") && (
                            <button
                              type="button"
                              onClick={() => handleDeletePublication(pub.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No publications found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={total}
          totalLabel="publications"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          disabled={loading}
        />
      </div>

      {/* View Publication Modal */}
      {viewingPublication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/15 backdrop-blur-[4px]" />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                View Publication
              </h2>
              <button
                type="button"
                onClick={() => setViewingPublication(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Item Type
                </span>
                <span className="text-gray-900 text-sm">
                  {viewingPublication.itemName ??
                    viewingPublication.itemFk ??
                    "—"}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Category Type
                </span>
                <span className="text-gray-900 text-sm">
                  {getCategoryTypeLabel(
                    viewingPublication.categoryType ??
                      (viewingPublication as any).type ??
                      ""
                  ) || "—"}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Expiry Date
                </span>
                <span className="text-gray-900 text-sm">
                  {formatExpiryDisplay(
                    viewingPublication.dateOfExpiration ??
                      (viewingPublication as any).expiry
                  )}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Link to Manual
                </span>
                {viewingPublication.linkToManual &&
                viewingPublication.linkToManual !== "#" ? (
                  <LinkButton
                    href={viewingPublication.linkToManual}
                    className="text-sm"
                  />
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPublication(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[4px]"
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-publication-title"
            className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2
                id="add-publication-title"
                className="text-lg font-semibold text-gray-900"
              >
                {editingPublication ? "Edit Publication" : "Add Publication"}
              </h2>
              <button
                type="button"
                onClick={closeAddModal}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Item Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.itemFk ? String(addForm.itemFk) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__create_new__") {
                        setNewItemTypeName("");
                        setShowAddItemTypeModal(true);
                        return;
                      }
                      setAddForm((prev) => ({
                        ...prev,
                        itemFk: val ? Number(val) : 0,
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Item Type</option>
                    {itemTypes.map((opt) => (
                      <option key={opt.id} value={String(opt.id)}>
                        {opt.name}
                      </option>
                    ))}
                    <option value="__create_new__">— Create New —</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Category Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addForm.categoryType}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        categoryType: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Category Type</option>
                    {CATEGORY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <DateInput
                    value={addForm.expiryDate}
                    onChange={(expiryDate) =>
                      setAddForm((prev) => ({
                        ...prev,
                        expiryDate,
                      }))
                    }
                    inputClassName="border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Web Link
                  </label>
                  <input
                    type="url"
                    value={addForm.assignLink}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        assignLink: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="Enter Web Link"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeAddModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              {((!editingPublication &&
                canCreate("regulatory-compliance")) ||
                (editingPublication &&
                  canUpdate("regulatory-compliance"))) && (
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  disabled={
                    saving ||
                    !addForm.itemFk ||
                    !addForm.categoryType?.trim() ||
                    !addForm.expiryDate?.trim()
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium inline-flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Document"
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Add Item Type - pops up on top of Add / Edit Publication modal */}
          {showAddItemTypeModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
                aria-hidden
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-item-type-title"
                className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200"
              >
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
                  <h2
                    id="add-item-type-title"
                    className="text-base font-semibold text-gray-900"
                  >
                    Add Item Type
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      !creatingItemType &&
                      (setShowAddItemTypeModal(false), setNewItemTypeName(""))
                    }
                    disabled={creatingItemType}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <p className="text-gray-500 text-xs">
                    New item type for publications (e.g. manual, subscription)
                  </p>
                  <div>
                    <label className="block text-gray-500 text-xs font-medium mb-1">
                      Item type value
                    </label>
                    <input
                      type="text"
                      value={newItemTypeName}
                      onChange={(e) => setNewItemTypeName(e.target.value)}
                      placeholder="Enter item type value"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateItemType()
                      }
                    />
                  </div>
                </div>
                <div className="px-5 py-3.5 border-t border-gray-200 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      !creatingItemType &&
                      (setShowAddItemTypeModal(false), setNewItemTypeName(""))
                    }
                    disabled={creatingItemType}
                    className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateItemType}
                    disabled={creatingItemType || !newItemTypeName?.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2 transition-colors"
                  >
                    {creatingItemType ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Standalone Add Item Type modal (when opened from header, not from Add/Edit Publication) */}
      {showAddItemTypeModal && !showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[4px]"
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-type-standalone-title"
            className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
              <h2
                id="add-item-type-standalone-title"
                className="text-base font-semibold text-gray-900"
              >
                Add Item Type
              </h2>
              <button
                type="button"
                onClick={() =>
                  !creatingItemType &&
                  (setShowAddItemTypeModal(false), setNewItemTypeName(""))
                }
                disabled={creatingItemType}
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-gray-500 text-xs">
                New item type for publications (e.g. manual, subscription)
              </p>
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-1">
                  Item type value
                </label>
                <input
                  type="text"
                  value={newItemTypeName}
                  onChange={(e) => setNewItemTypeName(e.target.value)}
                  placeholder="Enter item type value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateItemType()}
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  !creatingItemType &&
                  (setShowAddItemTypeModal(false), setNewItemTypeName(""))
                }
                disabled={creatingItemType}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateItemType}
                disabled={creatingItemType || !newItemTypeName?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2 transition-colors"
              >
                {creatingItemType ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
