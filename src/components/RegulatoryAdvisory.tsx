import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  Filter,
  RotateCcw,
} from "lucide-react";
import { DataTablePagination } from "./ui/DataTablePagination";

interface AdvisoryItem {
  id: number;
  item: string;
  type: string;
  expiry: string;
  remainingValidity: string;
}

export function RegulatoryAdvisory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const advisories: AdvisoryItem[] = [
    {
      id: 1,
      item: "C OF A (RP-C12)",
      type: "CERTIFICATE",
      expiry: "28 Feb 2026",
      remainingValidity: "1 DY",
    },
    {
      id: 2,
      item: "C OF A",
      type: "CERTIFICATE",
      expiry: "28 Feb 2026",
      remainingValidity: "1 DY",
    },
    {
      id: 3,
      item: "W&B",
      type: "CERTIFICATE",
      expiry: "28 Feb 2026",
      remainingValidity: "1 DY",
    },
    {
      id: 4,
      item: "TXTAV CESSNA",
      type: "SUBSCRIPTION",
      expiry: "10 Mar 2026",
      remainingValidity: "11 DY",
    },
    {
      id: 5,
      item: "TXTAV BARON",
      type: "SUBSCRIPTION",
      expiry: "10 Mar 2026",
      remainingValidity: "11 DY",
    },
    {
      id: 6,
      item: "C OF R (RP-C14)",
      type: "CERTIFICATE",
      expiry: "15 Mar 2026",
      remainingValidity: "16 DY",
    },
    {
      id: 7,
      item: "PITOT STATIC",
      type: "CERTIFICATE",
      expiry: "20 Mar 2026",
      remainingValidity: "21 DY",
    },
    {
      id: 8,
      item: "TRANSPONDER",
      type: "CERTIFICATE",
      expiry: "25 Mar 2026",
      remainingValidity: "26 DY",
    },
    {
      id: 9,
      item: "ELT",
      type: "CERTIFICATE",
      expiry: "30 Mar 2026",
      remainingValidity: "31 DY",
    },
    {
      id: 10,
      item: "JEPPESEN NAVDATA",
      type: "SUBSCRIPTION",
      expiry: "05 Apr 2026",
      remainingValidity: "37 DY",
    },
  ];

  // Calculate type counts
  const typeCounts = {
    all: advisories.length,
    certificate: advisories.filter(
      (ad) => ad.type === "CERTIFICATE",
    ).length,
    subscription: advisories.filter(
      (ad) => ad.type === "SUBSCRIPTION",
    ).length,
  };

  const filteredAdvisories = advisories.filter((ad) => {
    const matchesSearch =
      ad.item
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      ad.type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterType === "all" ||
      ad.type.toLowerCase() === filterType.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(
    filteredAdvisories.length / itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdvisories = filteredAdvisories.slice(
    startIndex,
    startIndex + itemsPerPage,
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
      case "CERTIFICATE":
        return "bg-blue-500/10 text-blue-700 border border-blue-200";
      case "SUBSCRIPTION":
        return "bg-emerald-500/10 text-emerald-700 border border-emerald-200";
      default:
        return "bg-gray-500/10 text-gray-700 border border-gray-200";
    }
  };

  const getValidityColor = (validity: string) => {
    const days = parseInt(validity);
    if (days <= 7) {
      return "text-red-600 font-semibold";
    } else if (days <= 30) {
      return "text-amber-600 font-semibold";
    } else {
      return "text-emerald-600 font-semibold";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            Advisory
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Document expiry monitoring and renewal management
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">
              Export
            </span>
          </button>
        </div>
      </div>

      {/* Blue Banner */}
      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">
          ADVISORY
        </span>
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
              placeholder="Search by item, type..."
              value={searchTerm}
              onChange={(e) =>
                handleSearchChange(e.target.value)
              }
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
              onChange={(e) =>
                handleFilterChange(e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">
                All Types ({typeCounts.all})
              </option>
              <option value="certificate">
                Certificate ({typeCounts.certificate})
              </option>
              <option value="subscription">
                Subscription ({typeCounts.subscription})
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Header Info */}
      <div className="text-gray-600">
        Showing{" "}
        {filteredAdvisories.length > 0 ? startIndex + 1 : 0} to{" "}
        {Math.min(
          startIndex + itemsPerPage,
          filteredAdvisories.length,
        )}{" "}
        of {filteredAdvisories.length} items
      </div>

      {/* Advisory Table */}
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
                  EXPIRY
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  REMAINING VALIDITY
                </th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedAdvisories.length > 0 ? (
                paginatedAdvisories.map((advisory) => (
                  <tr
                    key={advisory.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-gray-900 font-medium">
                      {advisory.item}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded text-xs ${getTypeColor(advisory.type)}`}
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
                          advisory.remainingValidity,
                        )}
                      >
                        {advisory.remainingValidity}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="Renew"
                      >
                        <RotateCcw className="w-4 h-4" />
                        RENEW
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No advisory items found matching your search
                    criteria
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
          totalItems={filteredAdvisories.length}
          totalLabel="items"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      </div>
    </div>
  );
}