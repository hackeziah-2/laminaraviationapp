import { useState, useEffect } from "react";
import { Search, Download, Filter, RotateCcw, X } from "lucide-react";
import Swal from "sweetalert2";
import { DataTablePagination } from "./ui/DataTablePagination";
import {
  getAdvisoryPaged,
  renewAdvisory,
  withholdAdvisory,
  type AdvisoryItem,
  type AdvisorySortBy,
  type AdvisorySortOrder,
} from "../api/advisoryApi";

export function RegulatoryAdvisory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<AdvisorySortBy>("remaining_validity");
  const [sortOrder, setSortOrder] = useState<AdvisorySortOrder>("desc");
  const [items, setItems] = useState<AdvisoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewAdvisoryRow, setRenewAdvisoryRow] = useState<AdvisoryItem | null>(null);
  /** Holds id, expiry (editable), category_type from item, regulatory_compliance from row when present. */
  const [renewUpdate, setRenewUpdate] = useState<{
    id: number;
    expiry: string;
    category_type: string;
    regulatory_compliance?: string;
  } | null>(null);
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [withholdSubmitting, setWithholdSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const typeParam = filterType === "all" ? undefined : filterType;
    getAdvisoryPaged(
      currentPage,
      itemsPerPage,
      searchTerm,
      typeParam,
      sortBy,
      sortOrder
    )
      .then((res) => {
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
          setTotalPages(res.pages);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.detail ??
              err?.message ??
              "Failed to load advisories"
          );
          setItems([]);
          setTotal(0);
          setTotalPages(1);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPage, itemsPerPage, searchTerm, filterType, sortBy, sortOrder]);

  // Normalize type for comparison (API may return CERTIFICATE, Certificate, etc.)
  const normalizeType = (t: string) =>
    String(t ?? "")
      .trim()
      .toUpperCase();

  const startIndex = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, total);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleSort = (field: AdvisorySortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const getTypeColor = (type: string) => {
    const t = normalizeType(type);
    switch (t) {
      case "CERTIFICATE":
        return "bg-blue-500/10 text-blue-700 border border-blue-200";
      case "SUBSCRIPTION":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-200";
      case "REGULATORY CORRESPONDENCE (NON CERT)":
      case "REGULATORY_CORRESPONDENCE_NON_CERT":
      case "(NON CERT)":
        return "bg-amber-500/10 text-amber-700 border border-amber-200";
      case "LICENSE":
        return "bg-violet-500/10 text-violet-700 border border-violet-200";
      case "WITHHOLD":
        return "bg-red-500/10 text-red-700 border border-red-200";
      default:
        return "bg-gray-500/10 text-gray-700 border border-gray-200";
    }
  };

  const openRenewModal = (advisory: AdvisoryItem) => {
    setRenewAdvisoryRow(advisory);
    setRenewUpdate({
      id: advisory.id,
      expiry: advisory.expiry ?? "",
      category_type: advisory.category_type ?? advisory.type ?? "",
      ...(advisory.regulatory_compliance
        ? { regulatory_compliance: advisory.regulatory_compliance }
        : {}),
    });
    setShowRenewModal(true);
  };

  const closeRenewModal = () => {
    setShowRenewModal(false);
    setRenewAdvisoryRow(null);
    setRenewUpdate(null);
  };

  const handleRenewSubmit = async () => {
    if (!renewUpdate || !renewUpdate.expiry.trim()) return;
    setRenewSubmitting(true);
    try {
      await renewAdvisory(renewUpdate.id, renewUpdate.expiry, {
        ...(renewUpdate.regulatory_compliance
          ? { regulatory_compliance: renewUpdate.regulatory_compliance }
          : {}),
        ...(renewUpdate.category_type
          ? { category_type: renewUpdate.category_type }
          : {}),
      });
      closeRenewModal();
      await Swal.fire({
        icon: "success",
        title: "Renewed",
        text: "Advisory has been renewed successfully.",
        timer: 2000,
        showConfirmButton: false,
      });
      // Refetch current page
      const typeParam = filterType === "all" ? undefined : filterType;
      getAdvisoryPaged(
        currentPage,
        itemsPerPage,
        searchTerm,
        typeParam,
        sortBy,
        sortOrder
      )
        .then((res) => {
          setItems(res.items);
          setTotal(res.total);
          setTotalPages(res.pages);
        })
        .catch(() => {});
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err as Error)?.message ??
        "Failed to renew advisory";
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: message,
      });
    } finally {
      setRenewSubmitting(false);
    }
  };

  const getValidityColor = (validity: string) => {
    if (validity === "Expired" || validity === "") {
      return "text-red-600 font-semibold";
    }
    const days = parseInt(validity, 10);
    if (Number.isNaN(days) || days < 0) {
      return "text-red-600 font-semibold";
    }
    if (days <= 7) {
      return "text-red-600 font-semibold";
    }
    if (days <= 30) {
      return "text-amber-600 font-semibold";
    }
    return "text-emerald-600 font-semibold";
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">Advisory</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Document expiry monitoring and renewal management
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Blue Banner */}
      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">ADVISORY</span>
        <span className="text-sm">DATE: 27 FEB 26</span>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              Search Advisory
            </label>
            <input
              type="text"
              placeholder="Search by item"
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Types</option>
              <option value="CERTIFICATE">CERTIFICATE</option>
              <option value="SUBSCRIPTION">SUBSCRIPTION</option>
              <option value="REGULATORY CORRESPONDENCE (NON CERT)">
                REGULATORY CORRESPONDENCE (NON CERT)
              </option>
              <option value="LICENSE">LICENSE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Header Info */}
      <div className="text-gray-600">
        Showing {total > 0 ? startIndex : 0} to {endIndex} of {total} items
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Advisory Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Loading advisories…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("item")}
                      className="inline-flex items-center gap-1 font-medium hover:text-gray-900 transition-colors"
                    >
                      ITEM
                      {sortBy === "item" && (
                        <span className="text-gray-400">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("type")}
                      className="inline-flex items-center gap-1 font-medium hover:text-gray-900 transition-colors"
                    >
                      TYPE
                      {sortBy === "type" && (
                        <span className="text-gray-400">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                    EXPIRY
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => handleSort("remaining_validity")}
                      className="inline-flex items-center gap-1 font-medium hover:text-gray-900 transition-colors"
                    >
                      REMAINING VALIDITY
                      {sortBy === "remaining_validity" && (
                        <span className="text-gray-400">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length > 0 ? (
                  items.map((advisory, index) => (
                    <tr
                      key={`advisory-${advisory.id}-${index}`}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3.5 text-gray-900 font-medium">
                        {advisory.item}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getTypeColor(
                            advisory.type
                          )}`}
                        >
                          {advisory.type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-900">
                        {advisory.expiry}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={getValidityColor(
                            advisory.remainingValidity
                          )}
                        >
                          {advisory.remainingValidity === "Expired" ||
                          advisory.remainingValidity === ""
                            ? "Expired"
                            : `${advisory.remainingValidity} DAYS`}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openRenewModal(advisory);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Renew"
                          >
                            <RotateCcw className="w-4 h-4" />
                            RENEW
                          </button>
                          <button
                            type="button"
                            disabled={withholdSubmitting}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const itemLabel = advisory.item ?? "this item";
                              const result = await Swal.fire({
                                icon: "warning",
                                title: "Are you sure?",
                                text: `You want to WITHHOLD - ${itemLabel}`,
                                showCancelButton: true,
                                confirmButtonColor: "#dc2626",
                                cancelButtonColor: "#6b7280",
                                confirmButtonText: "Yes, withhold",
                                cancelButtonText: "Cancel",
                              });
                              if (result.isConfirmed) {
                                setWithholdSubmitting(true);
                                try {
                                  await withholdAdvisory(
                                    advisory.id,
                                    advisory.regulatory_compliance
                                  );
                                  await Swal.fire({
                                    icon: "success",
                                    title: "Withheld",
                                    text: "Advisory has been withheld successfully.",
                                    timer: 2000,
                                    showConfirmButton: false,
                                  });
                                  const typeParam =
                                    filterType === "all" ? undefined : filterType;
                                  getAdvisoryPaged(
                                    currentPage,
                                    itemsPerPage,
                                    searchTerm,
                                    typeParam,
                                    sortBy,
                                    sortOrder
                                  )
                                    .then((res) => {
                                      setItems(res.items);
                                      setTotal(res.total);
                                      setTotalPages(res.pages);
                                    })
                                    .catch(() => {});
                                } catch (err: unknown) {
                                  const message =
                                    (err as {
                                      response?: { data?: { detail?: string } };
                                    })?.response?.data?.detail ??
                                    (err as Error)?.message ??
                                    "Failed to withhold advisory";
                                  await Swal.fire({
                                    icon: "error",
                                    title: "Error",
                                    text: message,
                                  });
                                } finally {
                                  setWithholdSubmitting(false);
                                }
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            title="Withhold"
                          >
                            WITHHOLD
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
                      No advisory items found matching your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <DataTablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={total}
          totalLabel="items"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          disabled={loading}
        />
      </div>

      {/* Renew Advisory – small modal */}
      {showRenewModal && renewAdvisoryRow && renewUpdate && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={closeRenewModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="renew-advisory-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="renew-advisory-title" className="text-lg font-semibold text-gray-900">
                Renew Advisory
              </h2>
              <button
                type="button"
                onClick={closeRenewModal}
                className="p-1 rounded text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Expiration date
                </label>
                <input
                  type="date"
                  value={renewUpdate.expiry}
                  onChange={(e) =>
                    setRenewUpdate((prev) =>
                      prev ? { ...prev, expiry: e.target.value } : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  placeholder="e.g. 27 FEB 26"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-gray-200">
              <button
                type="button"
                onClick={closeRenewModal}
                disabled={renewSubmitting}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenewSubmit}
                disabled={renewSubmitting || !renewUpdate.expiry.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#2563EB" }}
              >
                <RotateCcw className="w-4 h-4" />
                {renewSubmitting ? "Renewing…" : "RENEW"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
