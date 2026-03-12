import { useState } from "react";
import {
  Search,
  Plus,
  Download,
  Filter,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";

interface Personnel {
  id: number;
  authorizationNo: string;
  name: string;
  position: string;
  licNoType: string;
  authInitialDOI: string;
  authIssueDate: string;
  authExpiryDate: string;
  scopeCessna: string;
  scopeBaron: string;
  scopeOthers: string;
  caapLicExpiry: string;
  hfTrainingExpiry: string;
  typeTrainingCessna: string;
  typeTrainingBaron: string;
}

function PersonnelDetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="block text-gray-500 text-sm mb-0.5">{label}</span>
      <span className="text-gray-900 text-sm">{value || "—"}</span>
    </div>
  );
}

// Authorization scope options per aircraft type
const SCOPE_CESSNA_OPTIONS = ["RTS, II, MR, EGR", "RTS, MR, EGR", "MR", "NONE"];
const SCOPE_BARON_OPTIONS = [
  "RTS, II, MR, EGR",
  "RTS, MR, EGR",
  "RTS, MR",
  "MR",
  "NONE",
];
const SCOPE_OTHERS_OPTIONS = ["I/RI", "NONE"];

export function PersonnelAuthorization() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(
    null
  );
  const [viewingPersonnel, setViewingPersonnel] = useState<Personnel | null>(
    null
  );

  // Create form state
  const [createForm, setCreateForm] = useState({
    authorizationNumber: "",
    name: "",
    position: "",
    licenseNoType: "",
    authInitialDOI: "",
    authIssueDate: "",
    authExpiryDate: "",
    scopeCessna: "",
    scopeBaron: "",
    scopeOthers: "",
    caapLicExpiry: "",
    hfTrainingExpiry: "",
    typeTrainingCessna: "",
    typeTrainingBaron: "",
    webLink: "",
    uploadedFile: null as File | null,
  });

  const [personnel, setPersonnel] = useState<Personnel[]>([
    {
      id: 1,
      authorizationNo: "001",
      name: "ERICSON L. GRACE",
      position: "AVIONICS MECHANIC B",
      licNoType: "156315-AMS",
      authInitialDOI: "14 Aug 2023",
      authIssueDate: "19 Aug 2025",
      authExpiryDate: "19 Aug 2026",
      scopeCessna: "MR",
      scopeBaron: "MR",
      scopeOthers: "NONE",
      caapLicExpiry: "29 Jan 2028",
      hfTrainingExpiry: "9 Jul 2027",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "22 Jul 2026",
    },
    {
      id: 2,
      authorizationNo: "006",
      name: "CHRISTIAN MARK JHON D. GONZAGA",
      position: "A&P MECHANIC A",
      licNoType: "138569-AMT",
      authInitialDOI: "16 Aug 2022",
      authIssueDate: "4 Sep 2025",
      authExpiryDate: "4 Sep 2026",
      scopeCessna: "RTS, II, MR, EGR",
      scopeBaron: "RTS, II, MR, EGR",
      scopeOthers: "NONE",
      caapLicExpiry: "4 May 2028",
      hfTrainingExpiry: "26 Aug 2027",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "22 Jul 2026",
    },
    {
      id: 3,
      authorizationNo: "009",
      name: "ARGIE C. FAJERGA",
      position: "MAINTENANCE MANAGER",
      licNoType: "120119-AMT",
      authInitialDOI: "2 Jun 2023",
      authIssueDate: "3 Jan 2026",
      authExpiryDate: "3 Jan 2027",
      scopeCessna: "RTS, II, MR, EGR",
      scopeBaron: "RTS, MR, EGR",
      scopeOthers: "NONE",
      caapLicExpiry: "10 Nov 2023",
      hfTrainingExpiry: "5 May 2027",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "22 Jul 2026",
    },
    {
      id: 4,
      authorizationNo: "011",
      name: "GLENN CARLO S. MIRAFUENTE",
      position: "A&P MECHANIC A",
      licNoType: "154093-AMT",
      authInitialDOI: "20 Feb 0204",
      authIssueDate: "12 Aug 2025",
      authExpiryDate: "12 Aug 2026",
      scopeCessna: "RTS, MR, EGR",
      scopeBaron: "RTS, MR, EGR",
      scopeOthers: "NONE",
      caapLicExpiry: "15 Jan 2028",
      hfTrainingExpiry: "9 Jul 2027",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "22 Jul 2026",
    },
    {
      id: 5,
      authorizationNo: "017",
      name: "KAILE NATHAN C. MONTEMAYOR",
      position: "A&P MECHANIC C",
      licNoType: "164476-AMT",
      authInitialDOI: "20 Aug 2025",
      authIssueDate: "20 Aug 2025",
      authExpiryDate: "20 Aug 2026",
      scopeCessna: "MR",
      scopeBaron: "NONE",
      scopeOthers: "NONE",
      caapLicExpiry: "19 Mar 2029",
      hfTrainingExpiry: "4 Dec 2026",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "",
    },
    {
      id: 6,
      authorizationNo: "018",
      name: "JAZZ RUSSEL Y. SANTOS",
      position: "A&P MECHANIC C",
      licNoType: "167688-AMT",
      authInitialDOI: "20 Aug 2025",
      authIssueDate: "20 Aug 2025",
      authExpiryDate: "20 Aug 2026",
      scopeCessna: "MR",
      scopeBaron: "NONE",
      scopeOthers: "NONE",
      caapLicExpiry: "04 Dec 2029",
      hfTrainingExpiry: "5 May 2027",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "",
    },
    {
      id: 7,
      authorizationNo: "019",
      name: "LEE MARVIN V. GUNO",
      position: "AVIONICS MECHANIC B",
      licNoType: "158569-AMS",
      authInitialDOI: "20 Aug 2025",
      authIssueDate: "20 Aug 2025",
      authExpiryDate: "20 Aug 2026",
      scopeCessna: "MR",
      scopeBaron: "NONE",
      scopeOthers: "NONE",
      caapLicExpiry: "06 Nov 2028",
      hfTrainingExpiry: "27 May 2027",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "",
    },
    {
      id: 8,
      authorizationNo: "020",
      name: "JANSEN ANGEL A. GAUDICOS",
      position: "A&P MECHANIC C",
      licNoType: "160376-AMT",
      authInitialDOI: "20 Aug 2025",
      authIssueDate: "20 Aug 2025",
      authExpiryDate: "20 Aug 2026",
      scopeCessna: "MR",
      scopeBaron: "NONE",
      scopeOthers: "NONE",
      caapLicExpiry: "26 Feb 2029",
      hfTrainingExpiry: "4 December 2026",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "",
    },
    {
      id: 9,
      authorizationNo: "021",
      name: "BRYAN GELO A. VELASCO",
      position: "A&P MECHANIC C",
      licNoType: "161283-AMT",
      authInitialDOI: "29 Jan 2026",
      authIssueDate: "29 Jan 2026",
      authExpiryDate: "29 Jan 2027",
      scopeCessna: "MR",
      scopeBaron: "NONE",
      scopeOthers: "NONE",
      caapLicExpiry: "20 Dec 2028",
      hfTrainingExpiry: "16 Jan 2027",
      typeTrainingCessna: "9 May 2027",
      typeTrainingBaron: "",
    },
    {
      id: 10,
      authorizationNo: "026",
      name: "JEPHTE DAVID V. LAKE",
      position: "TOOLKEEPER & WAREHOUSE PERSONNEL",
      licNoType: "",
      authInitialDOI: "29 Jan 2026",
      authIssueDate: "29 Jan 2026",
      authExpiryDate: "29 Jan 2027",
      scopeCessna: "NONE",
      scopeBaron: "NONE",
      scopeOthers: "I/RI",
      caapLicExpiry: "",
      hfTrainingExpiry: "9 Jul 2027",
      typeTrainingCessna: "",
      typeTrainingBaron: "",
    },
  ]);

  // Existing authorization numbers for dynamic select (user can also type new)
  const existingAuthNumbers = [
    ...new Set(personnel.map((p) => p.authorizationNo)),
  ].sort();

  const openCreateModal = () => {
    setEditingPersonnel(null);
    setCreateForm({
      authorizationNumber: "",
      name: "",
      position: "",
      licenseNoType: "",
      authInitialDOI: "",
      authIssueDate: "",
      authExpiryDate: "",
      scopeCessna: "",
      scopeBaron: "",
      scopeOthers: "",
      caapLicExpiry: "",
      hfTrainingExpiry: "",
      typeTrainingCessna: "",
      typeTrainingBaron: "",
      webLink: "",
      uploadedFile: null,
    });
    setShowCreateModal(true);
  };

  const openViewModal = (person: Personnel) => {
    setViewingPersonnel(person);
  };

  const openViewEditModal = (person: Personnel) => {
    setEditingPersonnel(person);
    const toDateInput = (s: string) => {
      if (!s || s === "—") return "";
      const d = new Date(s);
      return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
    };
    setCreateForm({
      authorizationNumber: person.authorizationNo,
      name: person.name,
      position: person.position,
      licenseNoType: person.licNoType || "",
      authInitialDOI: toDateInput(person.authInitialDOI),
      authIssueDate: toDateInput(person.authIssueDate),
      authExpiryDate:
        person.authExpiryDate && person.authExpiryDate !== "—"
          ? person.authExpiryDate
          : "",
      scopeCessna:
        person.scopeCessna && person.scopeCessna !== "—"
          ? person.scopeCessna
          : "",
      scopeBaron:
        person.scopeBaron && person.scopeBaron !== "—" ? person.scopeBaron : "",
      scopeOthers:
        person.scopeOthers && person.scopeOthers !== "—"
          ? person.scopeOthers
          : "",
      caapLicExpiry: toDateInput(person.caapLicExpiry),
      hfTrainingExpiry: toDateInput(person.hfTrainingExpiry),
      typeTrainingCessna: toDateInput(person.typeTrainingCessna),
      typeTrainingBaron: toDateInput(person.typeTrainingBaron),
      webLink: "",
      uploadedFile: null,
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingPersonnel(null);
  };

  const handleCreateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCreateForm((prev) => ({ ...prev, uploadedFile: file }));
  };

  const handleCreateSubmit = () => {
    const row = {
      authorizationNo: createForm.authorizationNumber.trim() || "—",
      name: createForm.name.trim(),
      position: createForm.position.trim(),
      licNoType: createForm.licenseNoType.trim(),
      authInitialDOI: createForm.authInitialDOI || "—",
      authIssueDate: createForm.authIssueDate || "—",
      authExpiryDate: createForm.authExpiryDate.trim() || "—",
      scopeCessna: createForm.scopeCessna || "—",
      scopeBaron: createForm.scopeBaron || "—",
      scopeOthers: createForm.scopeOthers || "—",
      caapLicExpiry: createForm.caapLicExpiry || "—",
      hfTrainingExpiry: createForm.hfTrainingExpiry || "—",
      typeTrainingCessna: createForm.typeTrainingCessna || "—",
      typeTrainingBaron: createForm.typeTrainingBaron || "—",
    };
    if (editingPersonnel) {
      setPersonnel((prev) =>
        prev.map((p) => (p.id === editingPersonnel.id ? { ...p, ...row } : p))
      );
    } else {
      const nextId = Math.max(0, ...personnel.map((p) => p.id)) + 1;
      setPersonnel((prev) => [...prev, { id: nextId, ...row }]);
    }
    closeCreateModal();
  };

  const handleDeletePersonnel = async (id: number) => {
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
    setPersonnel((prev) => prev.filter((p) => p.id !== id));
    Swal.fire({
      icon: "success",
      title: "Deleted!",
      text: "The personnel record has been deleted.",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  // Calculate position counts
  const positions = [...new Set(personnel.map((p) => p.position))];
  const positionCounts = {
    all: personnel.length,
    ...Object.fromEntries(
      positions.map((pos) => [
        pos.toLowerCase().replace(/[^a-z0-9]/g, ""),
        personnel.filter((p) => p.position === pos).length,
      ])
    ),
  };

  const filteredPersonnel = personnel.filter((person) => {
    const matchesSearch =
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.authorizationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.licNoType.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterPosition === "all" ||
      person.position.toLowerCase().replace(/[^a-z0-9]/g, "") ===
        filterPosition.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredPersonnel.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPersonnel = filteredPersonnel.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterPosition(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">
            Personnel Authorization
          </h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Personnel licenses, authorizations, and training records management
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Download className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700 hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Personnel</span>
          </button>
        </div>
      </div>

      {/* Blue Banner */}
      <div
        className="text-white px-4 sm:px-6 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0"
        style={{ backgroundColor: "#2563EB" }}
      >
        <span className="tracking-wide text-sm sm:text-base">
          PERSONNEL AUTHORIZATION
        </span>
        <span className="text-sm">DATE: 27 FEB 26</span>
      </div>

      {/* Search and Filter - same card pattern as Aircraft Fleet Profile */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="personnel-search"
              className="block text-gray-700 mb-2 flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-gray-500" />
              Search Personnel
            </label>
            <div className="relative">
              <input
                id="personnel-search"
                type="text"
                placeholder="Search by name, auth number, position, or license"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Search personnel"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="w-full md:w-56">
            <label
              htmlFor="personnel-position-filter"
              className="block text-gray-700 mb-2 flex items-center gap-2"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              Filter by Position
            </label>
            <select
              id="personnel-position-filter"
              value={filterPosition}
              onChange={(e) => handleFilterChange(e.target.value)}
              aria-label="Filter by position"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
            >
              <option value="all">All Positions ({positionCounts.all})</option>
              <option value="apmechanica">
                A&P Mechanic A ({positionCounts.apmechanica || 0})
              </option>
              <option value="apmechanicc">
                A&P Mechanic C ({positionCounts.apmechanicc || 0})
              </option>
              <option value="avionicsmechanicb">
                Avionics Mechanic B ({positionCounts.avionicsmechanicb || 0})
              </option>
              <option value="maintenancemanager">
                Maintenance Manager ({positionCounts.maintenancemanager || 0})
              </option>
              <option value="toolkeeperwarehousepersonnel">
                Toolkeeper & Warehouse (
                {positionCounts.toolkeeperwarehousepersonnel || 0})
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Personnel Table - separate card like Aircraft Fleet Profile */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  AUTH NO
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  NAME
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  POSITION
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  LIC NO / TYPE
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  AUTH INITIAL DOI
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  AUTH ISSUE DATE
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    ></span>
                    AUTH EXPIRY
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  SCOPE
                  <br />
                  CESSNA 150, 152, 172
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  SCOPE
                  <br />
                  BARON 95-C55
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  SCOPE
                  <br />
                  OTHERS
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    ></span>
                    CAAP LIC EXPIRY
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    ></span>
                    HF TRAINING
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  TYPE TRAINING
                  <br />
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    ></span>
                    CESSNA 150, 152, 172
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  TYPE TRAINING
                  <br />
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 bg-blue-600"
                      style={{
                        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
                      }}
                    ></span>
                    BARON 95-C55
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedPersonnel.length > 0 ? (
                paginatedPersonnel.map((person) => (
                  <tr
                    key={person.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-3 py-3 text-gray-900 font-medium whitespace-nowrap">
                      {person.authorizationNo}
                    </td>
                    <td className="px-3 py-3 text-gray-900 font-medium">
                      {person.name}
                    </td>
                    <td className="px-3 py-3 text-gray-900">
                      {person.position}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                      {person.licNoType || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                      {person.authInitialDOI}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                      {person.authIssueDate}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                      {person.authExpiryDate}
                    </td>
                    <td className="px-3 py-3 text-gray-900">
                      {person.scopeCessna}
                    </td>
                    <td className="px-3 py-3 text-gray-900">
                      {person.scopeBaron}
                    </td>
                    <td className="px-3 py-3 text-gray-900">
                      {person.scopeOthers}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                      {person.caapLicExpiry || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                      {person.hfTrainingExpiry}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                      {person.typeTrainingCessna || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-900 whitespace-nowrap">
                      {person.typeTrainingBaron || (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openViewModal(person)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="View details"
                          aria-label="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openViewEditModal(person)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePersonnel(person.id)}
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
                    colSpan={15}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No personnel found matching your search criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - same pattern as Aircraft Fleet Profile */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">Items per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Items per page"
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
              type="button"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
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
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`min-w-[2rem] px-3 py-1.5 rounded transition-colors ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2 text-gray-500">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  className="min-w-[2rem] px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* View Personnel Details Modal */}
      {viewingPersonnel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[4px]"
            onClick={() => setViewingPersonnel(null)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="view-personnel-title"
            className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2
                id="view-personnel-title"
                className="text-lg font-semibold text-gray-900 flex items-center gap-2"
              >
                View Personnel Details
              </h2>
              <button
                type="button"
                onClick={() => setViewingPersonnel(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <PersonnelDetailRow
                label="Authorization Number"
                value={viewingPersonnel.authorizationNo}
              />
              <PersonnelDetailRow label="Name" value={viewingPersonnel.name} />
              <PersonnelDetailRow
                label="Position"
                value={viewingPersonnel.position}
              />
              <PersonnelDetailRow
                label="License No / Type"
                value={viewingPersonnel.licNoType}
              />
              <PersonnelDetailRow
                label="Auth Initial DOI"
                value={viewingPersonnel.authInitialDOI}
              />
              <PersonnelDetailRow
                label="Auth Issue Date"
                value={viewingPersonnel.authIssueDate}
              />
              <PersonnelDetailRow
                label="Auth Expiry Date"
                value={viewingPersonnel.authExpiryDate}
              />
              <PersonnelDetailRow
                label="Scope (Cessna 150, 152, 172)"
                value={viewingPersonnel.scopeCessna}
              />
              <PersonnelDetailRow
                label="Scope (Baron 95-C55)"
                value={viewingPersonnel.scopeBaron}
              />
              <PersonnelDetailRow
                label="Scope (Others)"
                value={viewingPersonnel.scopeOthers}
              />
              <PersonnelDetailRow
                label="CAAP License Expiry"
                value={viewingPersonnel.caapLicExpiry}
              />
              <PersonnelDetailRow
                label="HF Training Expiry"
                value={viewingPersonnel.hfTrainingExpiry}
              />
              <PersonnelDetailRow
                label="Type Training (Cessna)"
                value={viewingPersonnel.typeTrainingCessna}
              />
              <PersonnelDetailRow
                label="Type Training (Baron)"
                value={viewingPersonnel.typeTrainingBaron}
              />
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPersonnel(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Personnel Authorization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[4px]"
            onClick={closeCreateModal}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-personnel-title"
            className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2
                id="create-personnel-title"
                className="text-lg font-semibold text-gray-900"
              >
                {editingPersonnel
                  ? "Edit Personnel Authorization"
                  : "Personnel Authorization"}
              </h2>
              <button
                type="button"
                onClick={closeCreateModal}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-4">
                {/* Authorization Number - dynamic: select existing or enter new */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="auth-number-list"
                    value={createForm.authorizationNumber}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        authorizationNumber: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="Select number or enter new"
                  />
                  <datalist id="auth-number-list">
                    {existingAuthNumbers.map((num) => (
                      <option key={num} value={num} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="Enter Name"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.position}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        position: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="Enter Position"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    License No / Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.licenseNoType}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        licenseNoType: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="Enter License No/Type"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Initial DOI (Date of Issuance)
                  </label>
                  <input
                    type="date"
                    value={createForm.authInitialDOI}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        authInitialDOI: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Issue Date{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={createForm.authIssueDate}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        authIssueDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Expiry Date
                  </label>
                  <input
                    type="text"
                    value={createForm.authExpiryDate}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        authExpiryDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="REF. ISSUE DATE"
                  />
                </div>

                {/* Authorization Scope (Cessna 150, 152, 172) */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Scope (Cessna 150, 152, 172)
                  </label>
                  <select
                    value={createForm.scopeCessna}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        scopeCessna: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                  >
                    <option value="">Select Scope</option>
                    {SCOPE_CESSNA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Authorization Scope (Baron 95-C55) */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Scope (Baron 95-C55)
                  </label>
                  <select
                    value={createForm.scopeBaron}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        scopeBaron: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                  >
                    <option value="">Select Scope</option>
                    {SCOPE_BARON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Authorization Scope (Others) */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Scope (Others)
                  </label>
                  <select
                    value={createForm.scopeOthers}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        scopeOthers: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8"
                  >
                    <option value="">Select Scope</option>
                    {SCOPE_OTHERS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    CAAP License Expiry
                  </label>
                  <input
                    type="date"
                    value={createForm.caapLicExpiry}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        caapLicExpiry: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Human Factors Training Expiry
                  </label>
                  <input
                    type="date"
                    value={createForm.hfTrainingExpiry}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        hfTrainingExpiry: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Type Training Expiry (Cessna 150, 152, 172)
                  </label>
                  <input
                    type="date"
                    value={createForm.typeTrainingCessna}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        typeTrainingCessna: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Type Training Expiry (Baron 95-C55)
                  </label>
                  <input
                    type="date"
                    value={createForm.typeTrainingBaron}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        typeTrainingBaron: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Web Link
                  </label>
                  <input
                    type="url"
                    value={createForm.webLink}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        webLink: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                    placeholder="Enter Web Link"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Upload Document
                  </label>
                  <label className="flex flex-col items-center justify-center w-full min-h-[100px] border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors py-4">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleCreateFileChange}
                    />
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      Choose file or drag here
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                      PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                    </span>
                    {createForm.uploadedFile && (
                      <span className="text-sm text-gray-700 mt-2 font-medium truncate max-w-[200px]">
                        {createForm.uploadedFile.name}
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={closeCreateModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleCreateSubmit}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
