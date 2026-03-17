import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Download,
  X,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  getAuthStampListFromAccountInformation,
  getAccountInformationById,
  type AuthStampOption,
} from "../api/accountApi";
import {
  getPersonnelAuthorizationsPaged,
  createPersonnelAuthorization,
  updatePersonnelAuthorization,
  deletePersonnelAuthorization,
  getPersonnelApiErrorMessage,
  type PersonnelAuthorizationRecord,
} from "../api/personnelAuthorizationApi";
import {
  getAuthorizationScopeCessnaList,
  getAuthorizationScopeBaronList,
  getAuthorizationScopeOthersList,
  createAuthorizationScopeCessna,
  createAuthorizationScopeBaron,
  createAuthorizationScopeOthers,
  type AuthorizationScopeOption,
} from "../api/authorizationScopeApi";
import { DataTablePagination } from "./ui/DataTablePagination";

/** Same shape as API record for view/edit. */
type Personnel = PersonnelAuthorizationRecord;

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

const AUTH_SEARCH_DEBOUNCE_MS = 350;
/** Request at least 10 options for Authorization Number dropdown (search is case-insensitive). */
const AUTH_STAMP_LIST_LIMIT = 10;

/** Normalize API date to YYYY-MM-DD for date inputs. */
function toDateOnly(value: string | undefined): string {
  if (!value || typeof value !== "string") return "";
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "";
}

export function PersonnelAuthorization() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(
    null
  );
  const [viewingPersonnel, setViewingPersonnel] = useState<Personnel | null>(
    null
  );
  const [listLoading, setListLoading] = useState(false);

  // Authorization Number searchable dropdown
  const [authStampSearchTerm, setAuthStampSearchTerm] = useState("");
  const [debouncedAuthSearch, setDebouncedAuthSearch] = useState("");
  const [authStampOptions, setAuthStampOptions] = useState<AuthStampOption[]>(
    []
  );
  const [loadingAuthStamp, setLoadingAuthStamp] = useState(false);
  const [isAuthDropdownOpen, setIsAuthDropdownOpen] = useState(false);
  const authDropdownRef = useRef<HTMLDivElement>(null);

  // Scope options from API: { id, label } for dropdown (value=id, display=label)
  const [scopeCessnaOptions, setScopeCessnaOptions] = useState<
    AuthorizationScopeOption[]
  >([]);
  const [scopeBaronOptions, setScopeBaronOptions] = useState<
    AuthorizationScopeOption[]
  >([]);
  const [scopeOthersOptions, setScopeOthersOptions] = useState<
    AuthorizationScopeOption[]
  >([]);
  const [scopeListsLoading, setScopeListsLoading] = useState(false);
  const [showNewScopeModal, setShowNewScopeModal] = useState(false);
  const [newScopeType, setNewScopeType] = useState<
    "cessna" | "baron" | "others"
  >("cessna");
  const [newScopeValue, setNewScopeValue] = useState("");
  const [addingScope, setAddingScope] = useState(false);

  // Create form state (no web_link). accountInformationId from by-auth-stamp selection. Scope fields are IDs (0 = none).
  const [createForm, setCreateForm] = useState({
    accountInformationId: 0 as number,
    authorizationNumber: "",
    name: "",
    position: "",
    licenseNoType: "",
    authInitialDOI: "",
    authIssueDate: "",
    authExpiryDate: "",
    scopeCessnaId: 0 as number,
    scopeBaronId: 0 as number,
    scopeOthersId: 0 as number,
    caapLicExpiry: "",
    hfTrainingExpiry: "",
    typeTrainingCessna: "",
    typeTrainingBaron: "",
  });

  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving] = useState(false);

  const fetchPersonnel = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getPersonnelAuthorizationsPaged(
        currentPage,
        itemsPerPage
      );
      setPersonnel(res.items);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.pages));
    } catch {
      setPersonnel([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setListLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  // Fetch scope dropdown lists from API (authorization-scope-cessna/list, authorization-scope-baron/list, authorization-scope-others/list)
  useEffect(() => {
    setScopeListsLoading(true);
    Promise.all([
      getAuthorizationScopeCessnaList(),
      getAuthorizationScopeBaronList(),
      getAuthorizationScopeOthersList(),
    ])
      .then(([cessna, baron, others]) => {
        setScopeCessnaOptions(cessna);
        setScopeBaronOptions(baron);
        setScopeOthersOptions(others);
      })
      .catch(() => {
        setScopeCessnaOptions([]);
        setScopeBaronOptions([]);
        setScopeOthersOptions([]);
      })
      .finally(() => setScopeListsLoading(false));
  }, []);

  // Debounce auth stamp search
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedAuthSearch(authStampSearchTerm),
      AUTH_SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(t);
  }, [authStampSearchTerm]);

  // Authorization Number: get data from list of auth_stamp in account information
  useEffect(() => {
    if (!isAuthDropdownOpen) return;
    setLoadingAuthStamp(true);
    getAuthStampListFromAccountInformation(
      debouncedAuthSearch,
      AUTH_STAMP_LIST_LIMIT
    )
      .then(setAuthStampOptions)
      .catch(() => setAuthStampOptions([]))
      .finally(() => setLoadingAuthStamp(false));
  }, [isAuthDropdownOpen, debouncedAuthSearch]);

  // Close auth dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        authDropdownRef.current &&
        !authDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAuthDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setEditingPersonnel(null);
    setCreateForm({
      accountInformationId: 0,
      authorizationNumber: "",
      name: "",
      position: "",
      licenseNoType: "",
      authInitialDOI: "",
      authIssueDate: "",
      authExpiryDate: "",
      scopeCessnaId: 0,
      scopeBaronId: 0,
      scopeOthersId: 0,
      caapLicExpiry: "",
      hfTrainingExpiry: "",
      typeTrainingCessna: "",
      typeTrainingBaron: "",
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
      accountInformationId: person.accountInformationId ?? 0,
      authorizationNumber: person.authorizationNo,
      name: person.name,
      position: person.position,
      licenseNoType: person.licNoType || "",
      authInitialDOI: toDateInput(person.authInitialDOI),
      authIssueDate: toDateInput(person.authIssueDate),
      authExpiryDate: toDateInput(person.authExpiryDate),
      scopeCessnaId: person.scopeCessnaId ?? 0,
      scopeBaronId: person.scopeBaronId ?? 0,
      scopeOthersId: person.scopeOthersId ?? 0,
      caapLicExpiry: toDateInput(person.caapLicExpiry),
      hfTrainingExpiry: toDateInput(person.hfTrainingExpiry),
      typeTrainingCessna: toDateInput(person.typeTrainingCessna),
      typeTrainingBaron: toDateInput(person.typeTrainingBaron),
    });
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setEditingPersonnel(null);
  };

  const handleCreateSubmit = async () => {
    if (
      !createForm.authorizationNumber.trim() ||
      !createForm.name.trim() ||
      !createForm.position.trim()
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Required fields",
        text: "Authorization Number, Name, and Position are required.",
      });
      return;
    }
    setSaving(true);
    try {
      if (editingPersonnel) {
        const updatePayload = {
          authorization_no: createForm.authorizationNumber.trim(),
          name: createForm.name.trim(),
          position: createForm.position.trim(),
          license_no_type: createForm.licenseNoType.trim() || undefined,
          auth_initial_doi: createForm.authInitialDOI.trim() || undefined,
          auth_issue_date: createForm.authIssueDate.trim() || undefined,
          auth_expiry_date: createForm.authExpiryDate.trim() || undefined,
          authorization_scope_cessna_id: createForm.scopeCessnaId || 0,
          authorization_scope_baron_id: createForm.scopeBaronId || 0,
          authorization_scope_others_id: createForm.scopeOthersId || 0,
          caap_license_expiry: createForm.caapLicExpiry.trim() || undefined,
          human_factors_training_expiry:
            createForm.hfTrainingExpiry.trim() || undefined,
          type_training_expiry_cessna:
            createForm.typeTrainingCessna.trim() || undefined,
          type_training_expiry_baron:
            createForm.typeTrainingBaron.trim() || undefined,
          ...(createForm.accountInformationId > 0
            ? { account_information_id: createForm.accountInformationId }
            : {}),
        };
        await updatePersonnelAuthorization(editingPersonnel.id, updatePayload);
        await Swal.fire({
          icon: "success",
          title: "Updated",
          text: "Personnel authorization has been updated.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        const createPayload = {
          ...(createForm.accountInformationId > 0
            ? { account_information_id: createForm.accountInformationId }
            : {}),
          authorization_no: createForm.authorizationNumber.trim(),
          name: createForm.name.trim(),
          position: createForm.position.trim(),
          license_no_type: createForm.licenseNoType.trim() || undefined,
          auth_initial_doi: createForm.authInitialDOI.trim() || undefined,
          auth_issue_date: createForm.authIssueDate.trim() || undefined,
          auth_expiry_date: createForm.authExpiryDate.trim() || undefined,
          authorization_scope_cessna_id: createForm.scopeCessnaId || 0,
          authorization_scope_baron_id: createForm.scopeBaronId || 0,
          authorization_scope_others_id: createForm.scopeOthersId || 0,
          caap_license_expiry: createForm.caapLicExpiry.trim() || undefined,
          human_factors_training_expiry:
            createForm.hfTrainingExpiry.trim() || undefined,
          type_training_expiry_cessna:
            createForm.typeTrainingCessna.trim() || undefined,
          type_training_expiry_baron:
            createForm.typeTrainingBaron.trim() || undefined,
        };
        await createPersonnelAuthorization(createPayload);
        await Swal.fire({
          icon: "success",
          title: "Created",
          text: "Personnel authorization has been created.",
          timer: 2000,
          showConfirmButton: false,
        });
      }
      closeCreateModal();
      await fetchPersonnel();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: getPersonnelApiErrorMessage(
          err,
          "Failed to save personnel authorization."
        ),
      });
    } finally {
      setSaving(false);
    }
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
    try {
      await deletePersonnelAuthorization(id);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "The personnel record has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
      await fetchPersonnel();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: getPersonnelApiErrorMessage(
          err,
          "Failed to delete personnel authorization."
        ),
      });
    }
  };

  const getScopeTypeLabel = (type: "cessna" | "baron" | "others") => {
    switch (type) {
      case "cessna":
        return "Authorization Scope (Cessna 150, 152, 172)";
      case "baron":
        return "Authorization Scope (Baron 95-C55)";
      case "others":
        return "Authorization Scope (Others)";
    }
  };

  const refetchScopeList = async (type: "cessna" | "baron" | "others") => {
    if (type === "cessna") {
      const list = await getAuthorizationScopeCessnaList();
      setScopeCessnaOptions(list);
    } else if (type === "baron") {
      const list = await getAuthorizationScopeBaronList();
      setScopeBaronOptions(list);
    } else {
      const list = await getAuthorizationScopeOthersList();
      setScopeOthersOptions(list);
    }
  };

  const handleAddNewScope = async () => {
    const trimmed = newScopeValue.trim();
    if (!trimmed) {
      await Swal.fire({
        icon: "warning",
        title: "Required",
        text: "Please enter a scope value.",
      });
      return;
    }
    const scopeLabel = getScopeTypeLabel(newScopeType);
    const findIdByLabel = (opts: AuthorizationScopeOption[]) =>
      opts.find((o) => o.label === trimmed)?.id ?? 0;

    if (newScopeType === "cessna") {
      const existingId = findIdByLabel(scopeCessnaOptions);
      if (existingId) {
        setCreateForm((prev) => ({ ...prev, scopeCessnaId: existingId }));
        setShowNewScopeModal(false);
        setNewScopeValue("");
        await Swal.fire({
          icon: "info",
          title: "Scope selected",
          text: `"${trimmed}" is already in the list and has been selected for ${scopeLabel}.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        try {
          await createAuthorizationScopeCessna(trimmed);
          const list = await getAuthorizationScopeCessnaList();
          setScopeCessnaOptions(list);
          const newId = findIdByLabel(list);
          setCreateForm((prev) => ({ ...prev, scopeCessnaId: newId }));
          setShowNewScopeModal(false);
          setNewScopeValue("");
          await Swal.fire({
            icon: "success",
            title: "Created",
            text: `"${trimmed}" has been added to ${scopeLabel}.`,
            timer: 2000,
            showConfirmButton: false,
          });
        } catch (err) {
          await Swal.fire({
            icon: "error",
            title: "Error",
            text:
              err instanceof Error ? err.message : "Failed to create scope.",
          });
        }
      }
    } else if (newScopeType === "baron") {
      const existingId = findIdByLabel(scopeBaronOptions);
      if (existingId) {
        setCreateForm((prev) => ({ ...prev, scopeBaronId: existingId }));
        setShowNewScopeModal(false);
        setNewScopeValue("");
        await Swal.fire({
          icon: "info",
          title: "Scope selected",
          text: `"${trimmed}" is already in the list and has been selected for ${scopeLabel}.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        try {
          await createAuthorizationScopeBaron(trimmed);
          const list = await getAuthorizationScopeBaronList();
          setScopeBaronOptions(list);
          const newId = findIdByLabel(list);
          setCreateForm((prev) => ({ ...prev, scopeBaronId: newId }));
          setShowNewScopeModal(false);
          setNewScopeValue("");
          await Swal.fire({
            icon: "success",
            title: "Created",
            text: `"${trimmed}" has been added to ${scopeLabel}.`,
            timer: 2000,
            showConfirmButton: false,
          });
        } catch (err) {
          await Swal.fire({
            icon: "error",
            title: "Error",
            text:
              err instanceof Error ? err.message : "Failed to create scope.",
          });
        }
      }
    } else {
      const existingId = findIdByLabel(scopeOthersOptions);
      if (existingId) {
        setCreateForm((prev) => ({ ...prev, scopeOthersId: existingId }));
        setShowNewScopeModal(false);
        setNewScopeValue("");
        await Swal.fire({
          icon: "info",
          title: "Scope selected",
          text: `"${trimmed}" is already in the list and has been selected for ${scopeLabel}.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        try {
          await createAuthorizationScopeOthers(trimmed);
          const list = await getAuthorizationScopeOthersList();
          setScopeOthersOptions(list);
          const newId = findIdByLabel(list);
          setCreateForm((prev) => ({ ...prev, scopeOthersId: newId }));
          setShowNewScopeModal(false);
          setNewScopeValue("");
          await Swal.fire({
            icon: "success",
            title: "Created",
            text: `"${trimmed}" has been added to ${scopeLabel}.`,
            timer: 2000,
            showConfirmButton: false,
          });
        } catch (err) {
          await Swal.fire({
            icon: "error",
            title: "Error",
            text:
              err instanceof Error ? err.message : "Failed to create scope.",
          });
        }
      }
    }
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
                    HF TRAINING TYPE TRAINING
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
                    CESSNA 150, 152, 172 TYPE TRAINING
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
                    BARON 95-C55
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-[10px] text-gray-600 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {listLoading ? (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto inline-block" />
                    <p className="text-gray-500 mt-2 text-sm">
                      Loading personnel...
                    </p>
                  </td>
                </tr>
              ) : personnel.length > 0 ? (
                personnel.map((person) => (
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
                      {person.hfTrainingExpiry || (
                        <span className="text-gray-400">—</span>
                      )}
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
                    No personnel found
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
          totalLabel="personnel"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          disabled={listLoading}
        />
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
                {/* Authorization Number * - searchable dropdown select (case-insensitive, returns up to 10 options) */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Number <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Search or select from list (case-insensitive). Auto-fill:
                    Name, Position, License No/Type, Authorization Initial DOI.
                  </p>
                  <div className="relative" ref={authDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={
                          isAuthDropdownOpen
                            ? authStampSearchTerm
                            : createForm.authorizationNumber
                        }
                        onChange={(e) => {
                          setAuthStampSearchTerm(e.target.value);
                          setIsAuthDropdownOpen(true);
                          setCreateForm((prev) => ({
                            ...prev,
                            authorizationNumber: e.target.value,
                          }));
                        }}
                        onFocus={() => {
                          setIsAuthDropdownOpen(true);
                          setAuthStampSearchTerm(
                            createForm.authorizationNumber
                          );
                        }}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-900 text-sm"
                        placeholder="Search or select Authorization Number..."
                        aria-label="Authorization Number - search or select (case-insensitive)"
                        aria-expanded={isAuthDropdownOpen}
                        aria-haspopup="listbox"
                        aria-controls="auth-stamp-listbox"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsAuthDropdownOpen(!isAuthDropdownOpen);
                          if (!isAuthDropdownOpen)
                            setAuthStampSearchTerm(
                              createForm.authorizationNumber
                            );
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                        aria-label="Open Auth Stamp list"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            isAuthDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                    {isAuthDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-600 sticky top-0">
                          Select from list (up to {AUTH_STAMP_LIST_LIMIT}{" "}
                          results, search is case-insensitive)
                        </div>
                        {loadingAuthStamp ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                          </div>
                        ) : authStampOptions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {authStampSearchTerm
                              ? "No matches. Try different text (search is case-insensitive)."
                              : "Type to search or wait for list..."}
                          </div>
                        ) : (
                          <ul
                            id="auth-stamp-listbox"
                            className="py-1"
                            role="listbox"
                            aria-label="Auth Stamp list"
                          >
                            {authStampOptions.map((opt, idx) => (
                              <li
                                key={
                                  opt.auth_stamp
                                    ? `auth-${opt.auth_stamp}-${idx}`
                                    : `auth-idx-${idx}`
                                }
                                role="option"
                                onClick={async () => {
                                  const initialDoiFromOption = toDateOnly(
                                    opt.auth_initial_doi
                                  );
                                  setCreateForm((prev) => ({
                                    ...prev,
                                    accountInformationId:
                                      opt.account_information_id,
                                    authorizationNumber: opt.auth_stamp,
                                    name: opt.full_name,
                                    position: opt.designation,
                                    licenseNoType: opt.license_no,
                                    authInitialDOI:
                                      initialDoiFromOption ||
                                      prev.authInitialDOI,
                                  }));
                                  setAuthStampSearchTerm("");
                                  setIsAuthDropdownOpen(false);
                                  if (
                                    !initialDoiFromOption &&
                                    opt.account_information_id > 0
                                  ) {
                                    getAccountInformationById(
                                      opt.account_information_id
                                    )
                                      .then((info) => {
                                        const doi = toDateOnly(
                                          info.auth_initial_doi
                                        );
                                        if (doi)
                                          setCreateForm((prev) => ({
                                            ...prev,
                                            authInitialDOI: doi,
                                          }));
                                      })
                                      .catch(() => {});
                                  }
                                }}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-900"
                              >
                                <span className="font-medium">
                                  {opt.auth_stamp}
                                </span>
                                <span className="text-gray-500 block text-xs">
                                  {opt.full_name}
                                  {opt.designation
                                    ? ` · ${opt.designation}`
                                    : ""}
                                  {opt.license_no ? ` · ${opt.license_no}` : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name, Position, and License are based on the Authorization Number selected above */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm cursor-default"
                    placeholder="Select Authorization Number above"
                    aria-describedby="name-from-auth-hint"
                  />
                  <p
                    id="name-from-auth-hint"
                    className="text-xs text-gray-500 mt-0.5"
                  >
                    From selected Authorization Number
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Position <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.position}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm cursor-default"
                    placeholder="Select Authorization Number above"
                    aria-describedby="position-from-auth-hint"
                  />
                  <p
                    id="position-from-auth-hint"
                    className="text-xs text-gray-500 mt-0.5"
                  >
                    From selected Authorization Number
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    License No / Type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.licenseNoType}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 text-sm cursor-default"
                    placeholder="Select Authorization Number above"
                    aria-describedby="license-from-auth-hint"
                  />
                  <p
                    id="license-from-auth-hint"
                    className="text-xs text-gray-500 mt-0.5"
                  >
                    From selected Authorization Number
                  </p>
                </div>

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Initial DOI (Date of Issuance)
                  </label>
                  <input
                    type="date"
                    value={createForm.authInitialDOI}
                    readOnly
                    title="mm/dd/yyyy — From selected Authorization Number. Auto-filled (by-auth-stamp) when you select Authorization Number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-900 cursor-default [color-scheme:light]"
                    placeholder="Select Authorization Number above"
                    aria-describedby="auth-initial-doi-hint"
                  />
                  <p
                    id="auth-initial-doi-hint"
                    className="text-xs text-gray-500 mt-0.5"
                  >
                    From selected Authorization Number
                    <br />
                  </p>
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
                    type="date"
                    value={createForm.authExpiryDate}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        authExpiryDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 [color-scheme:light] focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  />
                </div>

                {/* Authorization Scope (Cessna 150, 152, 172) - value: id, display: label */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Scope (Cessna 150, 152, 172)
                  </label>
                  <select
                    value={createForm.scopeCessnaId || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__create_new__") {
                        setNewScopeType("cessna");
                        setNewScopeValue("");
                        setShowNewScopeModal(true);
                        return;
                      }
                      setCreateForm((prev) => ({
                        ...prev,
                        scopeCessnaId: v ? Number(v) : 0,
                      }));
                    }}
                    disabled={scopeListsLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8 disabled:opacity-60"
                  >
                    <option value="">
                      {scopeListsLoading ? "Loading..." : "Select Scope"}
                    </option>
                    {scopeCessnaOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__create_new__">— Create New —</option>
                  </select>
                </div>

                {/* Authorization Scope (Baron 95-C55) - value: id, display: label */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Scope (Baron 95-C55)
                  </label>
                  <select
                    value={createForm.scopeBaronId || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__create_new__") {
                        setNewScopeType("baron");
                        setNewScopeValue("");
                        setShowNewScopeModal(true);
                        return;
                      }
                      setCreateForm((prev) => ({
                        ...prev,
                        scopeBaronId: v ? Number(v) : 0,
                      }));
                    }}
                    disabled={scopeListsLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8 disabled:opacity-60"
                  >
                    <option value="">
                      {scopeListsLoading ? "Loading..." : "Select Scope"}
                    </option>
                    {scopeBaronOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__create_new__">— Create New —</option>
                  </select>
                </div>

                {/* Authorization Scope (Others) - value: id, display: label */}
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5">
                    Authorization Scope (Others)
                  </label>
                  <select
                    value={createForm.scopeOthersId || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__create_new__") {
                        setNewScopeType("others");
                        setNewScopeValue("");
                        setShowNewScopeModal(true);
                        return;
                      }
                      setCreateForm((prev) => ({
                        ...prev,
                        scopeOthersId: v ? Number(v) : 0,
                      }));
                    }}
                    disabled={scopeListsLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat pr-8 disabled:opacity-60"
                  >
                    <option value="">
                      {scopeListsLoading ? "Loading..." : "Select Scope"}
                    </option>
                    {scopeOthersOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__create_new__">— Create New —</option>
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
                type="button"
                onClick={handleCreateSubmit}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm inline-flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>

          {/* Add New Scope - pops up on top of Personnel Authorization modal */}
          {showNewScopeModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
                onClick={() => {
                  if (!addingScope) {
                    setShowNewScopeModal(false);
                    setNewScopeValue("");
                  }
                }}
                aria-hidden
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-scope-title"
                className="relative bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h2
                    id="new-scope-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    Add New Scope
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (!addingScope) {
                        setShowNewScopeModal(false);
                        setNewScopeValue("");
                      }
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <p className="text-sm text-gray-600">
                    {newScopeType === "cessna" &&
                      "Authorization Scope (Cessna 150, 152, 172)"}
                    {newScopeType === "baron" &&
                      "Authorization Scope (Baron 95-C55)"}
                    {newScopeType === "others" &&
                      "Authorization Scope (Others)"}
                  </p>
                  <label className="block text-gray-700 text-sm mb-1">
                    Scope value
                  </label>
                  <input
                    type="text"
                    value={newScopeValue}
                    onChange={(e) => setNewScopeValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                    placeholder="Enter scope value"
                  />
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (!addingScope) {
                        setShowNewScopeModal(false);
                        setNewScopeValue("");
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setAddingScope(true);
                      await handleAddNewScope();
                      setAddingScope(false);
                    }}
                    disabled={!newScopeValue.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
