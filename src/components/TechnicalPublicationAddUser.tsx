import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { DateInput } from "./ui/DateInput";
import { DataTablePagination } from "./ui/DataTablePagination";
import {
  API_PAGE_SIZE_OPTIONS,
  DEFAULT_API_PAGE_SIZE,
} from "../constants/pagination";
import {
  createTechnicalPublicationUser,
  getTechnicalPublicationAssignableRoles,
  listTechnicalPublicationUsers,
  TechnicalPublicationUserAccessError,
  TechnicalPublicationUserValidationError,
  type TechnicalPublicationUserListRow,
} from "../api/technicalPublicationUserApi";
import type { Role } from "../api/rolesApi";
import { formatApiErrorMessage } from "../utils/formatApiErrorMessage";
import {
  EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM,
  validateTechnicalPublicationAddUserForm,
  type TechnicalPublicationAddUserFormValues,
} from "../utility/technicalPublicationAddUser";
import { ModuleAccessDenied } from "./ModuleAccessDenied";
import { useOverlayEscape } from "../hooks/useOverlayEscape";

const SEARCH_DEBOUNCE_MS = 400;

const SELECT_CLASS =
  "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-9 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat";

function fieldClass(hasError: boolean): string {
  return `w-full px-3 py-2 border ${
    hasError ? "border-red-500" : "border-gray-300"
  } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`;
}

function TechnicalPublicationAddUserModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [formData, setFormData] = useState<TechnicalPublicationAddUserFormValues>(
    EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesError, setRolesError] = useState("");
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useOverlayEscape({
    enabled: isOpen,
    onClose: () => {
      if (submitting) return;
      onClose();
    },
    isBusy: submitting,
  });

  useEffect(() => {
    if (!isOpen) return;
    setFormData(EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM);
    setErrors({});
    setRolesError("");
    let cancelled = false;
    const load = async () => {
      setLoadingRoles(true);
      try {
        const list = await getTechnicalPublicationAssignableRoles();
        if (cancelled) return;
        setRoles(list);
        if (list.length === 0) {
          setRolesError("Pilot and Mechanic roles were not found.");
        }
      } catch (error) {
        if (cancelled) return;
        setRolesError(formatApiErrorMessage(error, "Failed to load roles."));
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const setField = <K extends keyof TechnicalPublicationAddUserFormValues>(
    key: K,
    value: TechnicalPublicationAddUserFormValues[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateTechnicalPublicationAddUserForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || submitting) return;

    setSubmitting(true);
    try {
      await createTechnicalPublicationUser(formData);
      onSaved();
    } catch (error) {
      if (error instanceof TechnicalPublicationUserValidationError) {
        setErrors(error.fields);
        return;
      }
      setErrors({
        form: formatApiErrorMessage(error, "Failed to save user."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && onClose()} />
      <div className="relative bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add User</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create a Pilot or Mechanic account
          </p>
        </div>
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="p-6 space-y-4"
          noValidate
        >
          {errors.form && (
            <p className="text-sm text-red-600">{errors.form}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className={fieldClass(Boolean(errors.firstName))}
              aria-invalid={Boolean(errors.firstName)}
              placeholder="Enter first name"
            />
            {errors.firstName && (
              <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className={fieldClass(Boolean(errors.lastName))}
              aria-invalid={Boolean(errors.lastName)}
              placeholder="Enter last name"
            />
            {errors.lastName && (
              <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            <input
              type="text"
              value={formData.middleName}
              onChange={(e) => setField("middleName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter middle name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setField("username", e.target.value)}
              className={fieldClass(Boolean(errors.username))}
              aria-invalid={Boolean(errors.username)}
              autoComplete="off"
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-xs text-red-600 mt-1">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setField("email", e.target.value)}
              className={fieldClass(Boolean(errors.email))}
              aria-invalid={Boolean(errors.email)}
              autoComplete="off"
              placeholder="user@aviation.com"
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation *
            </label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setField("designation", e.target.value)}
              className={fieldClass(Boolean(errors.designation))}
              aria-invalid={Boolean(errors.designation)}
              placeholder="Enter designation"
            />
            {errors.designation && (
              <p className="text-xs text-red-600 mt-1">{errors.designation}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License No. *
            </label>
            <input
              type="text"
              value={formData.licenseNo}
              onChange={(e) => setField("licenseNo", e.target.value)}
              className={fieldClass(Boolean(errors.licenseNo))}
              aria-invalid={Boolean(errors.licenseNo)}
              placeholder="Enter license number"
            />
            {errors.licenseNo && (
              <p className="text-xs text-red-600 mt-1">{errors.licenseNo}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auth No. / Auth Stamp
            </label>
            <input
              type="text"
              value={formData.authStamp}
              onChange={(e) => setField("authStamp", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter authorization number / stamp"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authorization Initial DOI (Date of Issuance)
            </label>
            <DateInput
              value={formData.authInitialDoi}
              onChange={(value) => setField("authInitialDoi", value)}
              inputClassName="border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.roleId}
              onChange={(e) => setField("roleId", Number(e.target.value))}
              disabled={loadingRoles}
              className={`${SELECT_CLASS} ${
                errors.roleId ? "border-red-500" : "border-gray-300"
              }`}
              aria-invalid={Boolean(errors.roleId)}
            >
              <option value={0}>
                {loadingRoles ? "Loading roles..." : "Select role"}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {(errors.roleId || rolesError) && (
              <p className="text-xs text-red-600 mt-1">
                {errors.roleId || rolesError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setField("password", e.target.value)}
              className={fieldClass(Boolean(errors.password))}
              aria-invalid={Boolean(errors.password)}
              autoComplete="new-password"
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
              className={fieldClass(Boolean(errors.confirmPassword))}
              aria-invalid={Boolean(errors.confirmPassword)}
              autoComplete="new-password"
              placeholder="Re-enter password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingRoles}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : null}{" "}
              Save User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TechnicalPublicationAddUser() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_API_PAGE_SIZE);
  const [users, setUsers] = useState<TechnicalPublicationUserListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchSeqRef = useRef(0);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
      searchTimeoutRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchTerm]);

  const fetchUsers = useCallback(async () => {
    const requestId = ++fetchSeqRef.current;
    setLoading(true);
    setError("");
    try {
      const response = await listTechnicalPublicationUsers(
        currentPage,
        itemsPerPage,
        debouncedSearch
      );
      if (fetchSeqRef.current !== requestId) return;
      setUsers(response.items);
      setTotal(response.total);
      setTotalPages(Math.max(1, response.pages));
    } catch (err) {
      if (fetchSeqRef.current !== requestId) return;
      if (err instanceof TechnicalPublicationUserAccessError) {
        setDenied(true);
        return;
      }
      setError(formatApiErrorMessage(err, "Failed to load users."));
    } finally {
      if (fetchSeqRef.current === requestId) setLoading(false);
    }
  }, [currentPage, itemsPerPage, debouncedSearch]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleSaved = () => {
    setShowAddModal(false);
    setSuccessMessage("User saved successfully.");
    void fetchUsers();
  };

  if (denied) {
    return (
      <div className="p-4 sm:p-6">
        <ModuleAccessDenied />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl sm:text-2xl">Add User</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Pilot and Mechanic accounts for Technical Publication
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSuccessMessage("");
            setShowAddModal(true);
          }}
          className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Add User
        </button>
      </div>

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
        >
          {successMessage}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSuccessMessage("");
          }}
          placeholder="Search by name, username, email, designation, or license number"
          className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                    License No.
                  </th>
                  <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {user.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {user.username || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {user.email || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {user.designation || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {user.licenseNo || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {user.roleName || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      No users found matching your search criteria
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
          totalLabel="users"
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[...API_PAGE_SIZE_OPTIONS]}
          disabled={loading}
        />
      </div>

      <TechnicalPublicationAddUserModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
