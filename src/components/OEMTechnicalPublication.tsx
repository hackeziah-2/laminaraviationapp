import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  Upload,
  Pencil,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";

interface Publication {
  id: number;
  item: string;
  type: string;
  expiry: string;
  linkToManual: string;
}

const DEFAULT_PUBLICATION_TYPES = [
  "TXTAV CESSNA",
  "TXTAV BARON",
  "JEPPESSEN NAVDATA",
];

export function OEMTechnicalPublication() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPublication, setEditingPublication] =
    useState<Publication | null>(null);
  const [addForm, setAddForm] = useState({
    publicationType: "",
    expiryDate: "",
    assignLink: "",
    uploadedFile: null as File | null,
  });

  const [publications, setPublications] = useState<Publication[]>([
    {
      id: 1,
      item: "TXTAV CESSNA",
      type: "SUBSCRIPTION",
      expiry: "25 Feb 2027",
      linkToManual: "#",
    },
    {
      id: 2,
      item: "TXTAV BARON",
      type: "SUBSCRIPTION",
      expiry: "25 Feb 2027",
      linkToManual: "#",
    },
    {
      id: 3,
      item: "JEPPESSEN NAVDATA",
      type: "SUBSCRIPTION",
      expiry: "11 Oct 2025",
      linkToManual: "#",
    },
    {
      id: 4,
      item: "GARMIN G1000 DATABASE",
      type: "SUBSCRIPTION",
      expiry: "15 Dec 2026",
      linkToManual: "#",
    },
    {
      id: 5,
      item: "AMM CESSNA 172",
      type: "MANUAL",
      expiry: "31 Mar 2027",
      linkToManual: "#",
    },
    {
      id: 6,
      item: "IPC CESSNA 172",
      type: "MANUAL",
      expiry: "31 Mar 2027",
      linkToManual: "#",
    },
    {
      id: 7,
      item: "CMM LYCOMING IO-360",
      type: "MANUAL",
      expiry: "30 Jun 2027",
      linkToManual: "#",
    },
    {
      id: 8,
      item: "FOREFLIGHT SUBSCRIPTION",
      type: "SUBSCRIPTION",
      expiry: "20 Jan 2026",
      linkToManual: "#",
    },
    {
      id: 9,
      item: "WDM CESSNA 172",
      type: "MANUAL",
      expiry: "31 Mar 2027",
      linkToManual: "#",
    },
    {
      id: 10,
      item: "STC DOCUMENTATION",
      type: "MANUAL",
      expiry: "N/A",
      linkToManual: "#",
    },
  ]);

  // Dynamic publication types: defaults first (TXTAV CESSNA, TXTAV BARON, JEPPESSEN NAVDATA), then any other existing; user can also type a new type
  const publicationTypeSuggestions = useMemo(() => {
    const existing = [...new Set(publications.map((p) => p.item))];
    const others = existing.filter(
      (item) => !DEFAULT_PUBLICATION_TYPES.includes(item)
    );
    return [...DEFAULT_PUBLICATION_TYPES, ...others];
  }, [publications]);

  const openAddModal = () => {
    setEditingPublication(null);
    setAddForm({
      publicationType: "",
      expiryDate: "",
      assignLink: "",
      uploadedFile: null,
    });
    setShowAddModal(true);
  };

  const openViewEditModal = (pub: Publication) => {
    setEditingPublication(pub);
    const expiryMatch =
      pub.expiry && pub.expiry !== "N/A"
        ? pub.expiry.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
        : null;
    const expiryDate = expiryMatch
      ? (() => {
          const months: Record<string, string> = {
            Jan: "01",
            Feb: "02",
            Mar: "03",
            Apr: "04",
            May: "05",
            Jun: "06",
            Jul: "07",
            Aug: "08",
            Sep: "09",
            Oct: "10",
            Nov: "11",
            Dec: "12",
          };
          const [, day, month, year] = expiryMatch;
          return `${year}-${months[month] || "01"}-${day.padStart(2, "0")}`;
        })()
      : "";
    setAddForm({
      publicationType: pub.item,
      expiryDate,
      assignLink:
        pub.linkToManual && pub.linkToManual !== "#" ? pub.linkToManual : "",
      uploadedFile: null,
    });
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingPublication(null);
    setAddForm({
      publicationType: "",
      expiryDate: "",
      assignLink: "",
      uploadedFile: null,
    });
  };

  const handleSaveDocument = () => {
    if (!addForm.publicationType.trim()) return;
    const expiryFormatted = addForm.expiryDate
      ? new Date(addForm.expiryDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "N/A";
    if (editingPublication) {
      setPublications((prev) =>
        prev.map((p) =>
          p.id === editingPublication.id
            ? {
                ...p,
                item: addForm.publicationType,
                expiry: expiryFormatted,
                linkToManual: addForm.assignLink?.trim() || "#",
              }
            : p
        )
      );
    } else {
      const newId = Math.max(0, ...publications.map((p) => p.id)) + 1;
      setPublications((prev) => [
        ...prev,
        {
          id: newId,
          item: addForm.publicationType,
          type: "SUBSCRIPTION",
          expiry: expiryFormatted,
          linkToManual: addForm.assignLink?.trim() || "#",
        },
      ]);
    }
    closeAddModal();
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
    setPublications((prev) => prev.filter((p) => p.id !== id));
    Swal.fire({
      icon: "success",
      title: "Deleted!",
      text: "The publication has been deleted.",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAddForm((prev) => ({ ...prev, uploadedFile: file }));
  };

  // Calculate type counts
  const typeCounts = {
    all: publications.length,
    subscription: publications.filter((p) => p.type === "SUBSCRIPTION").length,
    manual: publications.filter((p) => p.type === "MANUAL").length,
  };

  const filteredPublications = publications.filter((pub) => {
    const matchesSearch =
      pub.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.expiry.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" ||
      pub.type.toLowerCase() === filterType.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredPublications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPublications = filteredPublications.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "SUBSCRIPTION":
        return "bg-blue-500/10 text-blue-700 border border-blue-200";
      case "MANUAL":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-200";
      default:
        return "bg-gray-500/10 text-gray-700 border border-gray-200";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
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
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Publication</span>
          </button>
        </div>
      </div>

      {/* Blue Banner */}
      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">
          OEM TECHNICAL PUBLICATION
        </span>
        <span className="text-sm">DATE: 27 FEB 26</span>
      </div>

      {/* Search and Filter */}
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Types ({typeCounts.all})</option>
              <option value="subscription">
                Subscription ({typeCounts.subscription})
              </option>
              <option value="manual">Manual ({typeCounts.manual})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Header Info */}
      <div className="text-gray-600">
        Showing {filteredPublications.length > 0 ? startIndex + 1 : 0} to{" "}
        {Math.min(startIndex + itemsPerPage, filteredPublications.length)} of{" "}
        {filteredPublications.length} publications
      </div>

      {/* Publications Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  ITEM
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  TYPE
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    ></span>
                    EXPIRY
                  </span>
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
              {paginatedPublications.length > 0 ? (
                paginatedPublications.map((pub) => (
                  <tr
                    key={pub.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-gray-900 font-medium">
                      {pub.item}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getTypeColor(
                          pub.type
                        )}`}
                      >
                        {pub.type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-gray-900">{pub.expiry}</td>
                    <td className="px-6 py-3.5">
                      <a
                        href={pub.linkToManual}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline text-sm"
                      >
                        [LINK]
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openViewEditModal(pub)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="View / Edit"
                          aria-label="View or Edit"
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

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-6"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dynamic page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[2rem] px-3 py-1.5 rounded transition-colors text-white`}
                  style={{
                    backgroundColor:
                      currentPage === pageNum ? "#38BDF8" : "transparent",
                    color: currentPage === pageNum ? "#ffffff" : "#454545",
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== pageNum)
                      e.currentTarget.style.backgroundColor = "#f3f3f5";
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== pageNum)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2 text-gray-500">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="min-w-[2rem] px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Publication Modal - Medium size */}
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
                {/* Publication Type - dynamic: select from list or enter new */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Publication Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="publication-type-list"
                    value={addForm.publicationType}
                    onChange={(e) =>
                      setAddForm((prev) => ({
                        ...prev,
                        publicationType: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="Select type or enter new (e.g. TXTAV CESSNA, JEPPESSEN NAVDATA)"
                  />
                  <datalist id="publication-type-list">
                    {publicationTypeSuggestions.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>
                {/* Expiry Date */}
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
                {/* Web Link */}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="Enter Web Link"
                  />
                </div>
                {/* Upload Document */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Upload Document
                  </label>
                  <label className="flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      Choose file or drag here
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                    </span>
                    {addForm.uploadedFile && (
                      <span className="text-sm text-gray-700 mt-2 font-medium truncate max-w-[200px]">
                        {addForm.uploadedFile.name}
                      </span>
                    )}
                  </label>
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Save Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
