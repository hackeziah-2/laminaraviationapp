import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Filter,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  History,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { DataTablePagination } from "./ui/DataTablePagination";
import { Spinner } from "./ui/spinner";
import { LinkButton } from "./ui/LinkButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Swal from "sweetalert2";
import {
  getOrganizationalApprovalsPaged,
  createOrganizationalApproval,
  updateOrganizationalApproval,
  deleteOrganizationalApproval,
  getCertificateCategoryTypesList,
  createCertificateCategoryType,
  getOrganizationalApprovalsHistoryPaged,
  type OrganizationalApproval,
  type OrganizationalApprovalHistoryRow,
  type OrganizationalApprovalSortBy,
  type SortOrder,
  type CertificateTypeOption,
} from "../api/organizationalApprovalApi";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { formatDateForApi, formatDisplayDate } from "../utility/utils";
import { DateInput } from "./ui/DateInput";

function formatExpiryDisplay(expiry: string | null | undefined): string {
  return formatDisplayDate(expiry, { fallback: "—" });
}

function toApiDate(value: string | null | undefined): string {
  return formatDateForApi(value);
}

const SEARCH_DEBOUNCE_MS = 400;
const OA_HISTORY_PAGE_SIZE = 10;

const OA_EXPORT_HEADERS = [
  "Approval Type",
  "Number",
  "Expiration",
  "Link",
] as const;

export function OrganizationalApprovals() {
  const { canUpdate, canCreate, canDelete } = useUserPermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<OrganizationalApprovalSortBy>("EXPIRY");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showModal, setShowModal] = useState(false);
  const [editingApproval, setEditingApproval] =
    useState<OrganizationalApproval | null>(null);
  const [viewingApproval, setViewingApproval] =
    useState<OrganizationalApproval | null>(null);
  const [formData, setFormData] = useState({
    certificateFk: 0,
    number: "",
    expiryDate: "",
    webLink: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [certificateTypesFromApi, setCertificateTypesFromApi] = useState<
    CertificateTypeOption[]
  >([]);
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [creatingType, setCreatingType] = useState(false);

  const [approvals, setApprovals] = useState<OrganizationalApproval[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [historyTarget, setHistoryTarget] = useState<{
    oaHistoryId: number;
    subtitle: string;
  } | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRows, setHistoryRows] = useState<OrganizationalApprovalHistoryRow[]>(
    []
  );
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const certificateOptions = useMemo(() => {
    const byId = new Map<number, { id: number; name: string }>();
    approvals
      .filter((a) => a.certificateFk && (a.approvalTypeName || a.certificate))
      .forEach((a) => {
        if (!byId.has(a.certificateFk)) {
          byId.set(a.certificateFk, {
            id: a.certificateFk,
            name:
              (a.approvalTypeName ?? a.certificate) || String(a.certificateFk),
          });
        }
      });
    certificateTypesFromApi.forEach((x) => {
      if (x.id && x.name && !byId.has(x.id))
        byId.set(x.id, { id: x.id, name: x.name });
    });
    if (
      editingApproval?.certificateFk &&
      !byId.has(editingApproval.certificateFk)
    ) {
      const name =
        editingApproval.approvalTypeName ??
        editingApproval.certificate ??
        String(editingApproval.certificateFk);
      byId.set(editingApproval.certificateFk, {
        id: editingApproval.certificateFk,
        name,
      });
    }
    const combined = Array.from(byId.values());
    return combined.length ? combined : certificateTypesFromApi;
  }, [approvals, certificateTypesFromApi, editingApproval]);

  useEffect(() => {
    getCertificateCategoryTypesList().then(setCertificateTypesFromApi);
  }, []);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const certificateFilter =
        filterType === "all" ? undefined : Number(filterType) || filterType;
      const res = await getOrganizationalApprovalsPaged(
        currentPage,
        itemsPerPage,
        debouncedSearchTerm.trim(),
        sortBy,
        sortOrder,
        certificateFilter
      );
      setApprovals(res.items);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.pages));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load approvals.";
      setError(message);
      setApprovals([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    debouncedSearchTerm,
    filterType,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  // Debounce search: update debounced term and reset to page 1 when it changes
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const paginatedApprovals = approvals;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    // Page resets to 1 when debounced search updates
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleSortChange = (field: OrganizationalApprovalSortBy) => {
    setSortBy(field);
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(1);
  };

  const handleOaExport = async (format: "csv" | "xlsx") => {
    const certificateFilter =
      filterType === "all" ? undefined : Number(filterType) || filterType;
    const exportLimit = Math.max(total, 1);
    setExportLoading(true);
    try {
      const res = await getOrganizationalApprovalsPaged(
        1,
        exportLimit,
        debouncedSearchTerm.trim(),
        sortBy,
        sortOrder,
        certificateFilter
      );
      const rows = res.items ?? [];
      if (!rows.length) {
        await Swal.fire({
          icon: "info",
          title: "No data to export",
          text: "There are no approvals matching the current filters.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
      const escapeCsvValue = (value: string) =>
        `"${String(value).replace(/"/g, '""')}"`;
      const linkStr = (a: OrganizationalApproval) => {
        const w = a.webLink?.trim() ?? "";
        if (w) return w;
        const f = a.fileLink?.trim() ?? "";
        return f && f !== "#" ? f : "";
      };
      const dataRows = rows.map((a) => [
        a.approvalTypeName ?? a.certificate ?? "",
        a.number ?? "",
        formatExpiryDisplay(a.expiry),
        linkStr(a),
      ]);
      const stamp = new Date().toISOString().slice(0, 10);
      const baseName = `organizational_approvals_export_${stamp}`;
      if (format === "csv") {
        const headerLine = [...OA_EXPORT_HEADERS]
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
        const aoa: string[][] = [[...OA_EXPORT_HEADERS], ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Approvals");
        XLSX.writeFile(wb, `${baseName}.xlsx`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not export approvals.";
      await Swal.fire({
        icon: "error",
        title: "Export failed",
        text: message,
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setExportLoading(false);
    }
  };

  /** Path param for organizational-approvals-history/{oa_history}/paged */
  const getOaHistoryId = (approval: OrganizationalApproval): number | null => {
    if (approval.oaHistory != null && approval.oaHistory > 0)
      return approval.oaHistory;
    const raw = (approval as { oa_history?: unknown }).oa_history;
    if (raw != null && !isNaN(Number(raw)) && Number(raw) > 0)
      return Number(raw);
    return approval.id > 0 ? approval.id : null;
  };

  const openHistoryModal = (approval: OrganizationalApproval) => {
    const oaId = getOaHistoryId(approval);
    if (!oaId) {
      Swal.fire({
        icon: "warning",
        title: "Unavailable",
        text: "History is not available for this record.",
      });
      return;
    }
    setHistoryTarget({
      oaHistoryId: oaId,
      subtitle:
        approval.approvalTypeName ?? approval.certificate ?? `Approval #${approval.id}`,
    });
    setHistoryPage(1);
  };

  const closeHistoryModal = () => {
    setHistoryTarget(null);
    setHistoryRows([]);
    setHistoryTotal(0);
    setHistoryTotalPages(1);
    setHistoryPage(1);
  };

  useEffect(() => {
    if (!historyTarget) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const res = await getOrganizationalApprovalsHistoryPaged(
          historyTarget.oaHistoryId,
          historyPage,
          OA_HISTORY_PAGE_SIZE
        );
        if (cancelled) return;
        setHistoryRows(res.items);
        setHistoryTotal(res.total);
        setHistoryTotalPages(Math.max(1, res.pages));
      } catch (error: unknown) {
        if (cancelled) return;
        setHistoryRows([]);
        setHistoryTotal(0);
        setHistoryTotalPages(1);
        Swal.fire({
          icon: "error",
          title: "Error",
          text:
            error instanceof Error ? error.message : "Failed to load history.",
        });
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyTarget, historyPage]);

  const openAddModal = () => {
    setEditingApproval(null);
    setFormData({ certificateFk: 0, number: "", expiryDate: "", webLink: "" });
    setShowModal(true);
  };

  const openViewModal = (approval: OrganizationalApproval) => {
    setViewingApproval(approval);
  };

  const openViewEditModal = (approval: OrganizationalApproval) => {
    setEditingApproval(approval);
    const expiryForInput = approval.expiryDate ?? approval.expiry;
    setFormData({
      certificateFk: approval.certificateFk || 0,
      number: approval.number || "",
      expiryDate: expiryForInput
        ? (() => {
            const d = new Date(expiryForInput);
            return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
          })()
        : "",
      webLink:
        approval.fileLink && approval.fileLink !== "#"
          ? approval.fileLink
          : approval.webLink ?? "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingApproval(null);
    setFormData({ certificateFk: 0, number: "", expiryDate: "", webLink: "" });
    setFormErrors({});
  };

  const handleSaveDocument = async () => {
    const fk = formData.certificateFk;
    const newErrors: Record<string, string> = {};

    if (!fk) newErrors.certificateFk = "Approval type is required";
    if (!formData.number?.trim())
      newErrors.number = "Approval number is required";
    if (!formData.expiryDate?.trim())
      newErrors.expiryDate = "Expiry date is required";

    const webLink = formData.webLink?.trim();
    const dateOfExpiration = toApiDate(formData.expiryDate);
    if (formData.expiryDate?.trim() && !dateOfExpiration)
      newErrors.expiryDate = "Please enter a valid expiry date";

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }
    setFormErrors({});

    setSaving(true);
    const payload = {
      certificate_fk: fk,
      number: formData.number.trim(),
      date_of_expiration: dateOfExpiration,
      web_link: webLink !== undefined && webLink !== "" ? webLink : null,
    };

    try {
      if (editingApproval) {
        await updateOrganizationalApproval(editingApproval.id, payload);

        Swal.fire({
          icon: "success",
          title: "Updated",
          text: "The approval has been updated.",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createOrganizationalApproval(payload);

        Swal.fire({
          icon: "success",
          title: "Created",
          text: "The approval has been added.",
          timer: 1500,
          showConfirmButton: false,
        });
      }

      closeModal();
      setCurrentPage(1);
      await fetchApprovals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewType = async () => {
    const name = newTypeName?.trim();
    if (!name) {
      Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please enter a name for the new approval type.",
      });
      return;
    }
    setCreatingType(true);
    try {
      const created = await createCertificateCategoryType({ name });
      const list = await getCertificateCategoryTypesList();
      setCertificateTypesFromApi(list);
      const newId = created?.id ?? list.find((x) => x.name === name)?.id;
      if (newId) {
        setFormData((prev) => ({ ...prev, certificateFk: newId }));
      }
      setShowCreateTypeModal(false);
      setNewTypeName("");
      await Swal.fire({
        icon: "success",
        title: "Approval type created",
        text: `"${name}" has been added.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create type.";
      Swal.fire({ icon: "error", title: "Error", text: message });
    } finally {
      setCreatingType(false);
    }
  };

  const handleDeleteApproval = async (id: number) => {
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
      await deleteOrganizationalApproval(id);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The approval has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      setCurrentPage(1);
      await fetchApprovals();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete.";
      Swal.fire({ icon: "error", title: "Error", text: message });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            Organizational Approvals
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Operational certificates and organizational approvals tracking
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
                onSelect={() => void handleOaExport("csv")}
                className="bg-white text-gray-900 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
              >
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={exportLoading || loading}
                onSelect={() => void handleOaExport("xlsx")}
                className="bg-white text-gray-900 focus:bg-gray-100 focus:text-gray-900 data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900"
              >
                Export XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {canCreate("regulatory-compliance") && (
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Approval</span>
            </button>
          )}
        </div>
      </div>

      {/* Blue Banner */}
      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">
          ORGANIZATIONAL APPROVALS
        </span>
        <span className="text-sm"></span>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-500" />
              Search Approvals
            </label>
            <input
              type="text"
              placeholder="Search by approval type, number, or expiry..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
            />
          </div>
          <div className="w-full md:w-56">
            <label className="block text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              Filter by Approval Type
            </label>
            <select
              value={filterType}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Approval Types</option>
              {certificateOptions.map((opt, idx) => (
                <option key={`filter-${opt.id}-${idx}`} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Approvals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSortChange("CERTIFICATE")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    APPROVAL TYPE
                    {sortBy === "CERTIFICATE" && (
                      <span className="text-blue-600">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  NUMBER
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => handleSortChange("EXPIRY")}
                    className="inline-flex items-center gap-1 hover:text-gray-900 font-medium"
                  >
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    />
                    EXPIRY
                    {sortBy === "EXPIRY" && (
                      <span className="text-blue-600">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  FILE
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  HISTORY
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <Spinner />
                  </td>
                </tr>
              ) : paginatedApprovals.length > 0 ? (
                paginatedApprovals.map((approval) => {
                  const isWithhold =
                    approval.isWithhold ??
                    (approval as { is_withhold?: boolean }).is_withhold ??
                    false;
                  const rowBg = isWithhold
                    ? "bg-red-100 hover:bg-red-200"
                    : "hover:bg-gray-50";
                  const cellClass = `px-6 py-3.5 ${
                    isWithhold ? "text-red-900" : "text-gray-900"
                  }`;
                  return (
                    <tr
                      key={approval.id}
                      className={`${rowBg} transition-colors`}
                    >
                      <td className={`${cellClass} font-medium`}>
                        {approval.approvalTypeName ?? approval.certificate}
                      </td>
                      <td className={cellClass}>
                        {approval.number || (
                          <span
                            className={
                              isWithhold ? "text-red-600" : "text-gray-400"
                            }
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className={cellClass}>
                        {formatExpiryDisplay(
                          approval.expiryDate ?? approval.expiry
                        )}
                      </td>
                      <td className={cellClass}>
                        {approval.fileLink && approval.fileLink !== "#" ? (
                          <LinkButton href={approval.fileLink} />
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
                      <td className={cellClass}>
                        <button
                          type="button"
                          onClick={() => openHistoryModal(approval)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                          title="View history"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                      </td>
                      <td className={`${cellClass} whitespace-nowrap`}>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openViewModal(approval)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                            title="View details"
                            aria-label="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canUpdate("regulatory-compliance") && (
                            <button
                              type="button"
                              onClick={() => openViewEditModal(approval)}
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
                              onClick={() => handleDeleteApproval(approval.id)}
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
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No approvals found matching your search criteria
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
          totalLabel="approvals"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          disabled={loading}
        />
      </div>

      {/* View Approval Details Modal */}
      {viewingApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={() => setViewingApproval(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                View Approval Details
              </h2>
              <button
                type="button"
                onClick={() => setViewingApproval(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Approval Type
                </span>
                <span className="text-gray-900 text-sm">
                  {viewingApproval.approvalTypeName ??
                    viewingApproval.certificate}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Number
                </span>
                <span className="text-gray-900 text-sm">
                  {viewingApproval.number || "—"}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  Expiry Date
                </span>
                <span className="text-gray-900 text-sm">
                  {formatExpiryDisplay(
                    viewingApproval.expiryDate ?? viewingApproval.expiry
                  )}
                </span>
              </div>
              <div>
                <span className="block text-gray-500 text-sm mb-0.5">
                  File Link
                </span>
                {viewingApproval.fileLink &&
                viewingApproval.fileLink !== "#" ? (
                  <LinkButton
                    href={viewingApproval.fileLink}
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
                onClick={() => setViewingApproval(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval history (paged) */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={closeHistoryModal}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Approval history
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {historyTarget.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeHistoryModal}
                className="p-1 hover:bg-gray-100 rounded"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {historyLoading ? (
                <div className="py-12 flex justify-center">
                  <Spinner />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Date of expiration
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Web link
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide">
                          Created at
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No history entries
                          </td>
                        </tr>
                      ) : (
                        historyRows.map((row, idx) => (
                          <tr
                            key={`${row.createdAt ?? ""}-${idx}`}
                            className="hover:bg-gray-50/80"
                          >
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                              {formatExpiryDisplay(row.dateOfExpiration)}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              {row.webLink ? (
                                <LinkButton
                                  href={row.webLink}
                                  className="text-sm"
                                />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                              {formatExpiryDisplay(row.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 bg-white px-6 py-3">
              <DataTablePagination
                currentPage={historyPage}
                totalPages={Math.max(1, historyTotalPages)}
                onPageChange={setHistoryPage}
                totalItems={historyTotal}
                totalLabel="entries"
                itemsPerPage={OA_HISTORY_PAGE_SIZE}
                disabled={historyLoading}
                showRangeText
              />
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Approval Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-white/15 backdrop-blur-[4px]"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingApproval ? "Edit Approval" : "Add Approval"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Approval Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={
                    formData.certificateFk ? String(formData.certificateFk) : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__create_new__") {
                      setNewTypeName("");
                      setShowCreateTypeModal(true);
                      return;
                    }
                    setFormData({
                      ...formData,
                      certificateFk: val ? Number(val) : 0,
                    });
                    if (formErrors.certificateFk)
                      setFormErrors((prev) => ({ ...prev, certificateFk: "" }));
                  }}
                  className={`w-full px-3 py-2 border rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.certificateFk
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                >
                  <option value="">Select Type</option>
                  {certificateOptions.map((opt, idx) => (
                    <option
                      key={`type-${opt.id}-${idx}`}
                      value={String(opt.id)}
                    >
                      {opt.name}
                    </option>
                  ))}
                  <option value="__create_new__">— Create New —</option>
                </select>
                {formErrors.certificateFk && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.certificateFk}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => {
                    setFormData({ ...formData, number: e.target.value });
                    if (formErrors.number)
                      setFormErrors((prev) => ({ ...prev, number: "" }));
                  }}
                  placeholder="Enter Number"
                  className={`w-full px-3 py-2 border rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.number ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.number && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.number}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={formData.expiryDate}
                  onChange={(expiryDate) => {
                    setFormData({ ...formData, expiryDate });
                    if (formErrors.expiryDate)
                      setFormErrors((prev) => ({ ...prev, expiryDate: "" }));
                  }}
                  aria-invalid={!!formErrors.expiryDate}
                  inputClassName={`rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.expiryDate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {formErrors.expiryDate && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.expiryDate}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Web Link
                </label>
                <input
                  type="url"
                  value={formData.webLink}
                  onChange={(e) =>
                    setFormData({ ...formData, webLink: e.target.value })
                  }
                  placeholder="Enter Link"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                Cancel
              </button>
              {((!editingApproval &&
                canCreate("regulatory-compliance")) ||
                (editingApproval &&
                  canUpdate("regulatory-compliance"))) && (
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  disabled={
                    saving ||
                    !formData.certificateFk ||
                    !formData.number?.trim() ||
                    !formData.expiryDate?.trim()
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center justify-center gap-2"
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

          {/* Create new approval type - pops up on top of Add / Edit Approval modal */}
          {showCreateTypeModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
                onClick={() => {
                  if (!creatingType) {
                    setShowCreateTypeModal(false);
                    setNewTypeName("");
                  }
                }}
                aria-hidden
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-approval-type-title"
                className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h2
                    id="create-approval-type-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    Create new approval type
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      !creatingType &&
                      (setShowCreateTypeModal(false), setNewTypeName(""))
                    }
                    disabled={creatingType}
                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <p className="text-gray-500 text-xs">
                    New approval type for organizational approvals (e.g. AOC,
                    Maintenance Approval)
                  </p>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5">
                      Approval type value{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="Enter approval type value"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateNewType()
                      }
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      !creatingType &&
                      (setShowCreateTypeModal(false), setNewTypeName(""))
                    }
                    disabled={creatingType}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewType}
                    disabled={creatingType || !newTypeName?.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
                  >
                    {creatingType ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
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

      {/* Standalone Create new approval type modal (when opened from header) */}
      {showCreateTypeModal && !showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[4px]"
            onClick={() => {
              if (!creatingType) {
                setShowCreateTypeModal(false);
                setNewTypeName("");
              }
            }}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-approval-type-standalone-title"
            className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2
                id="create-approval-type-standalone-title"
                className="text-lg font-semibold text-gray-900"
              >
                Create new approval type
              </h2>
              <button
                type="button"
                onClick={() =>
                  !creatingType &&
                  (setShowCreateTypeModal(false), setNewTypeName(""))
                }
                disabled={creatingType}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-gray-500 text-xs">
                New approval type for organizational approvals (e.g. AOC,
                Maintenance Approval)
              </p>
              <div>
                <label className="block text-gray-700 text-sm mb-1.5">
                  Approval type value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Enter approval type value"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleCreateNewType()}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  !creatingType &&
                  (setShowCreateTypeModal(false), setNewTypeName(""))
                }
                disabled={creatingType}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewType}
                disabled={creatingType || !newTypeName?.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-2"
              >
                {creatingType ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
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
