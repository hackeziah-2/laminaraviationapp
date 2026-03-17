import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Download,
  Filter,
  ExternalLink,
  X,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { DataTablePagination } from "./ui/DataTablePagination";
import Swal from "sweetalert2";
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

const SEARCH_DEBOUNCE_MS = 400;

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
  if (!expiry?.trim()) return "N/A";
  const d = new Date(expiry);
  if (isNaN(d.getTime())) return expiry;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toApiDate(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const d = new Date(value.trim());
  if (isNaN(d.getTime())) return value.trim();
  return d.toISOString().slice(0, 10);
}

export function OEMTechnicalPublication() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<OemPublicationSortBy>("date_of_expiration");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showAddModal, setShowAddModal] = useState(false);
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

  const [publications, setPublications] = useState<OemTechnicalPublication[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOemItemTypesList().then(setItemTypes);
  }, []);

  const fetchPublications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOemPublicationsPaged(
        currentPage,
        itemsPerPage,
        debouncedSearchTerm.trim(),
        sortBy,
        sortOrder
      );
      setPublications(res.items);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.pages));
    } catch (err) {
      setError(getOemApiErrorMessage(err, "Failed to load publications."));
      setPublications([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearchTerm, sortBy, sortOrder]);

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
    if (!addForm.itemFk || !addForm.expiryDate?.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please select an item type and enter expiry date.",
      });
      return;
    }
    setSaving(true);
    try {
      if (editingPublication) {
        await updateOemPublication(editingPublication.id, {
          item: addForm.itemFk,
          category_type: addForm.categoryType?.trim() || "",
          date_of_expiration: toApiDate(addForm.expiryDate),
          web_link: addForm.assignLink?.trim() || "",
        });
        await Swal.fire({
          icon: "success",
          title: "Updated",
          text: "The publication has been updated.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await createOemPublication({
          item: addForm.itemFk,
          category_type: addForm.categoryType?.trim() || null,
          date_of_expiration: toApiDate(addForm.expiryDate),
          web_link: addForm.assignLink?.trim() || null,
        });
        await Swal.fire({
          icon: "success",
          title: "Created",
          text: "The publication has been added.",
          timer: 2000,
          showConfirmButton: false,
        });
      }
      closeAddModal();
      await fetchPublications();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: getOemApiErrorMessage(err, "Failed to save publication."),
      });
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
      await createOemItemType({ name });
      const list = await getOemItemTypesList();
      setItemTypes(list);
      setShowAddItemTypeModal(false);
      setNewItemTypeName("");
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

  const displayType = (p: OemTechnicalPublication) =>
    p.categoryType ?? p.type ?? "";

  const filteredForDisplay = publications.filter((pub) => {
    const type = displayType(pub);
    const matchesFilter =
      filterType === "all" || type?.toLowerCase() === filterType.toLowerCase();
    return matchesFilter;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPublications = filteredForDisplay;

  const handleSearchChange = (value: string) => setSearchTerm(value);
  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "CERTIFICATE":
        return "bg-violet-500/10 text-violet-700 border border-violet-200";
      case "SUBSCRIPTION":
        return "bg-blue-500/10 text-blue-700 border border-blue-200";
      case "REGULATORY_CORRESPONDENCE_NON_CERT":
        return "bg-amber-500/10 text-amber-700 border border-amber-200";
      case "LICENSE":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-200";
      default:
        return "bg-gray-500/10 text-gray-700 border border-gray-200";
    }
  };

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
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddItemTypeModal(true);
              setNewItemTypeName("");
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Item Type</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Publication</span>
          </button>
        </div>
      </div>

      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">
          OEM TECHNICAL PUBLICATION
        </span>
        <span className="text-sm">DATE: 27 FEB 26</span>
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
              placeholder="Search by item, type, or expiry..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filter by Type
            </label>
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Types</option>
              {CATEGORY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
        <div className="overflow-x-auto">
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
                  TYPE
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
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto inline-block" />
                    <p className="text-gray-500 mt-2 text-sm">Loading publications...</p>
                  </td>
                </tr>
              ) : paginatedPublications.length > 0 ? (
                paginatedPublications.map((pub) => (
                  <tr
                    key={pub.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-gray-900 font-medium">
                      {pub.itemName || pub.itemFk}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getTypeColor(
                          pub.categoryType ?? pub.type
                        )}`}
                      >
                        {getCategoryTypeLabel(pub.categoryType ?? pub.type)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-900">
                      {formatExpiryDisplay(pub.dateOfExpiration ?? pub.expiry)}
                    </td>
                    <td className="px-6 py-3.5">
                      {pub.linkToManual && pub.linkToManual !== "#" ? (
                        <a
                          href={pub.linkToManual}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline text-sm"
                        >
                          [LINK]
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openViewEditModal(pub)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePublication(pub.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[4px]"
            onClick={closeAddModal}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-publication-title"
            className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
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
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        itemFk: e.target.value ? Number(e.target.value) : 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Item Type</option>
                    {itemTypes.map((opt) => (
                      <option key={opt.id} value={String(opt.id)}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Category Type
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
                  >
                    <option value="">Select category (optional)</option>
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
                  <input
                    type="date"
                    value={addForm.expiryDate}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        expiryDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={
                  saving ||
                  !addForm.itemFk ||
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
            </div>
          </div>
        </div>
      )}

      {showAddItemTypeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={() => {
              if (!creatingItemType) {
                setShowAddItemTypeModal(false);
                setNewItemTypeName("");
              }
            }}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Item Type
              </h2>
              <button
                type="button"
                onClick={() =>
                  !creatingItemType &&
                  (setShowAddItemTypeModal(false), setNewItemTypeName(""))
                }
                disabled={creatingItemType}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newItemTypeName}
                  onChange={(e) => setNewItemTypeName(e.target.value)}
                  placeholder="e.g. TXTAV CESSNA, JEPPESSEN NAVDATA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleCreateItemType()
                  }
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  !creatingItemType &&
                  (setShowAddItemTypeModal(false), setNewItemTypeName(""))
                }
                disabled={creatingItemType}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateItemType}
                disabled={creatingItemType || !newItemTypeName?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
              >
                {creatingItemType ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
