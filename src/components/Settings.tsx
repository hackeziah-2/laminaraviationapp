import React, { useState, useEffect, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import {
  Users,
  Shield,
  Grid3x3,
  Plus,
  Search,
  Edit2,
  Trash2,
  Lock,
  UserX,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Braces,
  SlidersHorizontal,
} from "lucide-react";
import {
  MODULE_SETTING_OPTIONS,
  type ModuleSettingKey,
} from "../constants/moduleSettingsOptions";
import { SettingsModuleSettings } from "./settings/SettingsModuleSettings";
import * as authApi from "../api/authApi";
import * as rolesApi from "../api/rolesApi";
import type { Permission } from "../api/rolesApi";
import * as accountApi from "../api/accountApi";
import * as modulesApi from "../api/modulesApi";
import { MODULE_PERMISSIONS_LIST } from "../constants/modulePermissions";
import { DataTablePagination } from "./ui/DataTablePagination";
import { useUserPermissions } from "../hooks/useUserPermissions";

interface User {
  id: number;
  name: string;
  email: string;
  designation: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  username?: string;
  licenseNo?: string;
  roleId?: number;
  role: string;
  status: "active" | "inactive";
  lastDone: string;
  createdDate: string;
  auth_initial_doi?: string;
}

/** Role (including user_count from GET /v1/roles/roles-list) */
type Role = rolesApi.Role;

/** Build permission list from modules (all false). Uses API modules when provided, else static list. */
function getDefaultModulePermissions(apiModules?: modulesApi.Module[]): Permission[] {
  if (apiModules?.length) {
    return apiModules.map((m) => ({
      module: m.name || m.code || String(m.id),
      read: false,
      create: false,
      update: false,
      delete: false,
    }));
  }
  return MODULE_PERMISSIONS_LIST.map(({ label }) => ({
    module: label,
    read: false,
    create: false,
    update: false,
    delete: false,
  }));
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: Role[];
  onAdd: (user: {
    first_name: string;
    last_name: string;
    middle_name: string;
    username: string;
    email: string;
    designation: string;
    license_no: string;
    role_id: number;
    status: boolean;
    password: string;
    confirmPassword: string;
    auth_initial_doi: string;
  }) => void | Promise<void>;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  roles: Role[];
  onUpdate: (user: User) => void | Promise<void>;
}

interface DeactivateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onConfirm: () => void | Promise<void>;
}

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onReset: (newPassword: string, forceChange: boolean) => void | Promise<void>;
}

interface EditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  /** Modules from API (module-list) for permission rows; used to merge with role's permissions. */
  moduleList: Array<{ id?: number; name: string; code?: string }>;
  permissions: Permission[];
  onUpdate: (role: Role, permissions: Permission[]) => void | Promise<void>;
}

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Modules from API (modules-list) for permission rows; falls back to static list when empty. */
  moduleList: Array<{ id?: number; name: string; code?: string }>;
  onCreate: (role: Role, permissions: Permission[]) => void | Promise<void>;
}

const SELECT_BASE_CLASS =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-9 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat";

const BULK_JSON_PLACEHOLDER = `[
  {
    "first_name": "string",
    "last_name": "string",
    "middle_name": "string",
    "username": "string",
    "email": "string",
    "designation": "string",
    "license_no": "string",
    "auth_stamp": "string",
    "auth_initial_doi": "2026-04-01",
    "role_id": 0,
    "status": true,
    "password": "string"
  }
]`;

const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Map one JSON object to POST /auth/register/ body (same shape as registerUser). */
function bulkJsonRowToAuthCreate(o: Record<string, unknown>): authApi.AuthUserCreate {
  const email = String(o.email ?? "").trim();
  const localPart =
    email.includes("@") ? email.slice(0, Math.max(0, email.indexOf("@"))) : email;
  const roleRaw = o.role_id;
  let role_id = 0;
  if (typeof roleRaw === "number" && !Number.isNaN(roleRaw)) role_id = roleRaw;
  else if (typeof roleRaw === "string" && roleRaw.trim() !== "") {
    const n = Number(roleRaw);
    if (!Number.isNaN(n)) role_id = n;
  }
  const statusRaw = o.status;
  const status =
    typeof statusRaw === "boolean" ? statusRaw : statusRaw == null ? true : Boolean(statusRaw);
  const auth_initial_doi = String(o.auth_initial_doi ?? "").trim();
  const auth_stamp = String(o.auth_stamp ?? "").trim();
  return {
    first_name: String(o.first_name ?? "").trim(),
    last_name: String(o.last_name ?? "").trim(),
    middle_name: String(o.middle_name ?? "").trim(),
    username: String(o.username ?? "").trim() || localPart || "user",
    email,
    designation: String(o.designation ?? "").trim(),
    license_no: String(o.license_no ?? "").trim(),
    role_id,
    status,
    password: String(o.password ?? ""),
    ...(auth_initial_doi ? { auth_initial_doi } : {}),
    ...(auth_stamp ? { auth_stamp } : {}),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBulkRegisterError(err: unknown): string {
  const e = err as {
    code?: string;
    message?: string;
    response?: { data?: { message?: string; detail?: unknown } };
  };
  if (e?.code === "ERR_NETWORK" || e?.message === "Network Error") {
    return "Failed to connect to server.";
  }
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : JSON.stringify(item)
      )
      .join("; ");
  }
  const msg = e?.response?.data?.message;
  if (typeof msg === "string") return msg;
  return e?.message || "Request failed";
}

interface AddUsersByJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
}

function AddUsersByJsonModal({ isOpen, onClose, onComplete }: AddUsersByJsonModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  if (!isOpen) return null;

  const handleClose = () => {
    if (submitting) return;
    setJsonText("");
    setProgress({ current: 0, total: 0 });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText.trim() || "null");
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Invalid JSON",
        text: "Invalid JSON format. Please check your input.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    if (!Array.isArray(parsed)) {
      await Swal.fire({
        icon: "error",
        title: "Invalid JSON",
        text: "Invalid JSON format. Please check your input.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    if (parsed.length === 0) {
      await Swal.fire({
        icon: "error",
        title: "Invalid input",
        text: "Provide at least one user object in the array.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    const validationErrors: string[] = [];
    const rows: authApi.AuthUserCreate[] = [];

    parsed.forEach((item, index) => {
      const row = index + 1;
      if (item === null || typeof item !== "object") {
        validationErrors.push(`Row ${row}: must be an object.`);
        return;
      }
      const o = item as Record<string, unknown>;
      const email = String(o.email ?? "").trim();
      const password = String(o.password ?? "");
      if (!email) validationErrors.push(`Row ${row}: email is required.`);
      else if (!EMAIL_FORMAT_RE.test(email))
        validationErrors.push(`Row ${row}: invalid email format.`);
      if (!password) validationErrors.push(`Row ${row}: password is required.`);
      else if (password.length < 8)
        validationErrors.push(`Row ${row}: password must be at least 8 characters.`);
      if (
        email &&
        password.length >= 8 &&
        EMAIL_FORMAT_RE.test(email)
      ) {
        rows.push(bulkJsonRowToAuthCreate(o));
      }
    });

    if (validationErrors.length) {
      await Swal.fire({
        icon: "error",
        title: "Validation error",
        html: `<ul style="text-align:left;margin:0;padding-left:1.25rem;max-height:240px;overflow:auto;font-size:14px">${validationErrors.map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>`,
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    setSubmitting(true);
    setProgress({ current: 0, total: rows.length });
    const failures: { email: string; message: string }[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgress({ current: i + 1, total: rows.length });
      try {
        await authApi.registerUser(row);
        successCount += 1;
      } catch (err) {
        failures.push({ email: row.email, message: formatBulkRegisterError(err) });
      }
    }

    setSubmitting(false);
    setProgress({ current: 0, total: 0 });

    await Promise.resolve(onComplete());

    if (failures.length === 0) {
      setJsonText("");
      onClose();
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Users successfully created!",
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    if (successCount === 0) {
      const allNetwork = failures.every((f) => f.message === "Failed to connect to server.");
      if (allNetwork) {
        await Swal.fire({
          icon: "error",
          title: "Connection error",
          text: "Failed to connect to server.",
          confirmButtonColor: "#1f2937",
        });
      } else {
        await Swal.fire({
          icon: "error",
          title: "Could not create users",
          html: `<p style="margin-bottom:8px">Some users failed to create.</p><ul style="text-align:left;margin:0;padding-left:1.25rem;max-height:220px;overflow:auto;font-size:13px">${failures.map((f) => `<li><strong>${escapeHtml(f.email)}</strong> — ${escapeHtml(f.message)}</li>`).join("")}</ul>`,
          confirmButtonColor: "#1f2937",
        });
      }
      return;
    }

    await Swal.fire({
      icon: "warning",
      title: "Partial success",
      html: `<p>Some users failed to create.</p><p style="margin-top:8px;font-size:14px">${successCount} created, ${failures.length} failed.</p><ul style="text-align:left;margin:12px 0 0;padding-left:1.25rem;max-height:200px;overflow:auto;font-size:13px">${failures.map((f) => `<li><strong>${escapeHtml(f.email)}</strong> — ${escapeHtml(f.message)}</li>`).join("")}</ul>`,
      confirmButtonColor: "#1f2937",
    });
    setJsonText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-gray-100">
        <div className="px-8 pt-8 pb-6 border-b border-gray-200 shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Add Users via JSON
          </h2>
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">
            Paste a JSON array of user objects. Each entry must include{" "}
            <span className="font-semibold text-gray-900">email</span> and{" "}
            <span className="font-semibold text-gray-900">password</span>; email format is
            validated before requests run.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-8 py-6">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              JSON
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder={BULK_JSON_PLACEHOLDER}
              disabled={submitting}
              spellCheck={false}
              rows={16}
              className="w-full min-h-[280px] max-h-[min(420px,52vh)] px-4 py-3.5 border border-gray-300 rounded-xl text-sm font-mono text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 resize-y overflow-y-auto leading-relaxed"
            />
            {submitting && progress.total > 0 && (
              <p className="text-sm text-blue-700 mt-3">
                Creating users... ({progress.current}/{progress.total})
              </p>
            )}
          </div>

          <div className="flex gap-3 px-8 pb-8 pt-2 border-t border-gray-200 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-[9] px-4 py-3 border border-gray-300 text-gray-800 rounded-xl text-sm font-medium bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[11] px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : null}
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add User Modal
function AddUserModal({ isOpen, onClose, onAdd, roles }: AddUserModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    middle_name: "",
    username: "",
    email: "",
    designation: "",
    license_no: "",
    role_id: 0,
    status: true,
    password: "",
    confirmPassword: "",
    auth_initial_doi: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim())
      newErrors.first_name = "First name is required";
    if (!formData.last_name.trim())
      newErrors.last_name = "Last name is required";
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email format";
    if (!formData.designation.trim())
      newErrors.designation = "Designation is required";
    if (!formData.license_no.trim())
      newErrors.license_no = "License number is required";
    if (!formData.role_id) newErrors.role_id = "Role is required";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onAdd(formData));
      setFormData({
        first_name: "",
        last_name: "",
        middle_name: "",
        username: "",
        email: "",
        designation: "",
        license_no: "",
        role_id: 0,
        status: true,
        password: "",
        confirmPassword: "",
        auth_initial_doi: "",
      });
      setErrors({});
      onClose();
    } catch {
      // Stay open on error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New User</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create a new user account with role assignment
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              className={`w-full px-3 py-2 border ${
                errors.first_name ? "border-red-500" : "border-gray-300"
              } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter first name"
            />
            {errors.first_name && (
              <p className="text-xs text-red-600 mt-1">{errors.first_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              className={`w-full px-3 py-2 border ${
                errors.last_name ? "border-red-500" : "border-gray-300"
              } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter last name"
            />
            {errors.last_name && (
              <p className="text-xs text-red-600 mt-1">{errors.last_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            <input
              type="text"
              value={formData.middle_name}
              onChange={(e) =>
                setFormData({ ...formData, middle_name: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className={`w-full px-3 py-2 border ${
                errors.username ? "border-red-500" : "border-gray-300"
              } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={`w-full px-3 py-2 border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
              onChange={(e) =>
                setFormData({ ...formData, designation: e.target.value })
              }
              className={`w-full px-3 py-2 border ${
                errors.designation ? "border-red-500" : "border-gray-300"
              } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter designation"
            />
            {errors.designation && (
              <p className="text-xs text-red-600 mt-1">{errors.designation}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License No *
            </label>
            <input
              type="text"
              value={formData.license_no}
              onChange={(e) =>
                setFormData({ ...formData, license_no: e.target.value })
              }
              className={`w-full px-3 py-2 border ${
                errors.license_no ? "border-red-500" : "border-gray-300"
              } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter license number"
            />
            {errors.license_no && (
              <p className="text-xs text-red-600 mt-1">{errors.license_no}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authorization Initial DOI (Date of Issuance)
            </label>
            <input
              type="date"
              value={formData.auth_initial_doi}
              onChange={(e) =>
                setFormData({ ...formData, auth_initial_doi: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role_id}
              onChange={(e) =>
                setFormData({ ...formData, role_id: Number(e.target.value) })
              }
              className={`${SELECT_BASE_CLASS} ${
                errors.role_id ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value={0}>Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.role_id && (
              <p className="text-xs text-red-600 mt-1">{errors.role_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className={`w-full px-3 py-2 border ${
                  errors.password ? "border-red-500" : "border-gray-300"
                } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              className={`w-full px-3 py-2 border ${
                errors.confirmPassword ? "border-red-500" : "border-gray-300"
              } rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Re-enter password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              User will receive an email notification with their login
              credentials and will be prompted to change their password on first
              login.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                setFormData({
                  first_name: "",
                  last_name: "",
                  middle_name: "",
                  username: "",
                  email: "",
                  designation: "",
                  license_no: "",
                  role_id: 0,
                  status: true,
                  password: "",
                  confirmPassword: "",
                  auth_initial_doi: "",
                });
                setErrors({});
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : null}{" "}
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal
function EditUserModal({
  isOpen,
  onClose,
  user,
  onUpdate,
  roles,
}: EditUserModalProps) {
  const [formData, setFormData] = useState({
    first_name: user?.firstName || "",
    last_name: user?.lastName || "",
    middle_name: user?.middleName || "",
    username: user?.username || "",
    email: user?.email || "",
    designation: user?.designation || "",
    license_no: user?.licenseNo || "",
    role_id: user?.roleId || 0,
    status: user?.status || "active",
    auth_initial_doi: user?.auth_initial_doi || "",
  });
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        first_name: user.firstName || "",
        last_name: user.lastName || "",
        middle_name: user.middleName || "",
        username: user.username || "",
        email: user.email || "",
        designation: user.designation || "",
        license_no: user.licenseNo || "",
        role_id: user.roleId || 0,
        status: user.status || "active",
        auth_initial_doi: user.auth_initial_doi || "",
      }));
    }
  }, [user]);

  // Load auth_initial_doi when opening edit (not returned by list API)
  React.useEffect(() => {
    if (!isOpen || !user?.id) return;
    accountApi
      .getAccountInformationById(user.id)
      .then((info) => {
        setFormData((prev) => ({
          ...prev,
          auth_initial_doi: info.auth_initial_doi || "",
        }));
      })
      .catch(() => {});
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resolvedRole =
        roles.find((r) => r.id === formData.role_id)?.name || user.role;
      await Promise.resolve(
        onUpdate({
          ...user,
          name: `${formData.first_name} ${formData.middle_name} ${formData.last_name}`
            .replace(/\s+/g, " ")
            .trim(),
          firstName: formData.first_name,
          lastName: formData.last_name,
          middleName: formData.middle_name,
          username: formData.username,
          email: formData.email,
          designation: formData.designation,
          licenseNo: formData.license_no,
          roleId: formData.role_id,
          role: resolvedRole,
          status: formData.status as "active" | "inactive",
          auth_initial_doi: formData.auth_initial_doi || undefined,
        })
      );
      onClose();
    } catch {
      // Stay open on error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
          <p className="text-sm text-gray-600 mt-1">
            Update user account information and role assignment
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            <input
              type="text"
              value={formData.middle_name}
              onChange={(e) =>
                setFormData({ ...formData, middle_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation *
            </label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) =>
                setFormData({ ...formData, designation: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License No *
            </label>
            <input
              type="text"
              value={formData.license_no}
              onChange={(e) =>
                setFormData({ ...formData, license_no: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Authorization Initial DOI (Date of Issuance)
            </label>
            <input
              type="date"
              value={formData.auth_initial_doi}
              onChange={(e) =>
                setFormData({ ...formData, auth_initial_doi: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={formData.role_id}
              onChange={(e) =>
                setFormData({ ...formData, role_id: Number(e.target.value) })
              }
              className={SELECT_BASE_CLASS}
            >
              <option value={0}>Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "active" | "inactive",
                })
              }
              className={SELECT_BASE_CLASS}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : null}{" "}
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Deactivate / Activate User Modal
function DeactivateUserModal({
  isOpen,
  onClose,
  user,
  onConfirm,
}: DeactivateUserModalProps) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const isDeactivating = user.status === "active";
  const title = isDeactivating ? "Deactivate User?" : "Activate User?";
  const confirmLabel = isDeactivating ? "Deactivate User" : "Activate User";
  const accent = isDeactivating
    ? {
        bg: "bg-red-50",
        border: "border-red-200",
        iconBg: "bg-red-100",
        icon: "text-red-600",
        btn: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
        strip: "bg-red-600",
      }
    : {
        bg: "bg-green-50",
        border: "border-green-200",
        iconBg: "bg-green-100",
        icon: "text-green-600",
        btn: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
        strip: "bg-green-600",
      };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch {
      // Stay open on error; parent shows SweetAlert
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white rounded-xl max-w-md w-full shadow-xl border ${accent.border} overflow-hidden`}
        role="dialog"
        aria-labelledby="deactivate-modal-title"
      >
        {/* Accent strip */}
        <div className={`h-1 ${accent.strip}`} />

        <div className="p-6">
          <div
            className={`w-14 h-14 rounded-full ${accent.iconBg} flex items-center justify-center mx-auto mb-4`}
          >
            {isDeactivating ? (
              <AlertTriangle className={`w-7 h-7 ${accent.icon}`} />
            ) : (
              <UserPlus className={`w-7 h-7 ${accent.icon}`} />
            )}
          </div>

          <h2
            id="deactivate-modal-title"
            className="text-xl font-semibold text-gray-900 text-center mb-2"
          >
            {title}
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
            {isDeactivating
              ? `Are you sure you want to deactivate ${user.name}? They will lose access to the system immediately.`
              : `Are you sure you want to activate ${user.name}? They will regain access to the system.`}
          </p>

          <div
            className={`space-y-3 mb-6 rounded-lg p-4 ${accent.bg} ${accent.border} border`}
          >
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">User</span>
              <span className="font-medium text-gray-900">{user.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Email</span>
              <span
                className="font-medium text-gray-900 truncate max-w-[200px]"
                title={user.email}
              >
                {user.email}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Role</span>
              <span className="font-medium text-gray-900">{user.role}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-w-0 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting}
              style={{
                backgroundColor: isDeactivating ? "#dc2626" : "#16a34a",
                color: "#ffffff",
                border: "none",
                minHeight: "44px",
              }}
              className="flex-1 min-w-0 px-4 py-3 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : isDeactivating ? (
                <UserX className="w-4 h-4 shrink-0" />
              ) : (
                <UserPlus className="w-4 h-4 shrink-0" />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reset Password Modal
function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onReset,
}: ResetPasswordModalProps) {
  const [forceChange, setForceChange] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  if (!isOpen || !user) return null;

  const handleReset = async () => {
    setPasswordError("");
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      await Promise.resolve(onReset(newPassword, forceChange));
      onClose();
    } catch {
      // Stay open on error
    } finally {
      setSubmitting(false);
    }
  };

  const generatePassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Reset Password
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Reset password for {user.name}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError("");
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                onClick={generatePassword}
                type="button"
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-600 mt-1">{passwordError}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="forceChange"
              checked={forceChange}
              onChange={(e) => setForceChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="forceChange" className="text-sm text-gray-700">
              Force password change on next login
            </label>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">
              The user will receive an email with their new password. Make sure
              to securely communicate this password if email is not available.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              disabled={
                !newPassword.trim() || newPassword.length < 8 || submitting
              }
              type="button"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : null}{" "}
              Reset Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Merge API module list with role's existing permissions (match by module name/code). */
function mergePermissionsWithModuleList(
  moduleList: Array<{ id?: number; name: string; code?: string }>,
  permissions: Permission[]
): Permission[] {
  if (!moduleList?.length) return permissions;
  return moduleList.map((m) => {
    const moduleName = m.name || m.code || String(m.id ?? "");
    const existing = permissions.find(
      (p) =>
        p.module === moduleName ||
        p.module === m.name ||
        (m.code && p.module === m.code)
    );
    return {
      module: moduleName,
      read: existing?.read ?? false,
      create: existing?.create ?? false,
      update: existing?.update ?? false,
      delete: existing?.delete ?? false,
    };
  });
}

// Edit Role Modal
function EditRoleModal({
  isOpen,
  onClose,
  role,
  moduleList,
  permissions,
  onUpdate,
}: EditRoleModalProps) {
  const [formData, setFormData] = useState({
    name: role?.name || "",
    description: role?.description || "",
  });
  const merged = React.useMemo(
    () => mergePermissionsWithModuleList(moduleList, permissions),
    [moduleList, permissions]
  );
  const [rolePermissions, setRolePermissions] = useState<Permission[]>(merged);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description,
      });
      setRolePermissions(mergePermissionsWithModuleList(moduleList, permissions));
    }
  }, [role, permissions, moduleList]);

  if (!isOpen || !role) return null;

  const handleUpdate = async () => {
    setSubmitting(true);
    try {
      await Promise.resolve(
        onUpdate({ ...role, ...formData }, rolePermissions)
      );
      onClose();
    } catch {
      // Stay open on error
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (
    index: number,
    field: "read" | "create" | "update" | "delete"
  ) => {
    const updated = [...rolePermissions];
    updated[index] = { ...updated[index], [field]: !updated[index][field] };
    setRolePermissions(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Role</h2>
          <p className="text-sm text-gray-600 mt-1">
            Modify role details and permissions
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Count
              </label>
              <input
                type="text"
                value={`${role.userCount} users`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Module Permissions
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                      Module
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                      Read
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                      Create
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                      Update
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rolePermissions.map((perm, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {perm.module}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.read}
                          onChange={() => togglePermission(index, "read")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.create}
                          onChange={() => togglePermission(index, "create")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.update}
                          onChange={() => togglePermission(index, "update")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.delete}
                          onChange={() => togglePermission(index, "delete")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              type="button"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={submitting}
              type="button"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : null}{" "}
              Update Role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create Role Modal
function CreateRoleModal({ isOpen, onClose, moduleList, onCreate }: CreateRoleModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const defaultPerms = React.useMemo(
    () =>
      moduleList.length > 0
        ? moduleList.map((m) => ({
            module: m.name || m.code || String(m.id ?? ""),
            read: false,
            create: false,
            update: false,
            delete: false,
          }))
        : MODULE_PERMISSIONS_LIST.map(({ label }) => ({
            module: label,
            read: false,
            create: false,
            update: false,
            delete: false,
          })),
    [moduleList]
  );

  const [permissions, setPermissions] = useState<Permission[]>(defaultPerms);

  React.useEffect(() => {
    setPermissions(defaultPerms);
  }, [defaultPerms]);

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const togglePermission = (
    index: number,
    field: "read" | "create" | "update" | "delete"
  ) => {
    const updated = [...permissions];
    updated[index] = { ...updated[index], [field]: !updated[index][field] };
    setPermissions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await Promise.resolve(
        onCreate(
          {
            id: Date.now(),
            name: formData.name,
            description: formData.description,
            userCount: 0,
          },
          permissions
        )
      );
      setFormData({ name: "", description: "" });
      setPermissions(defaultPerms);
      onClose();
    } catch {
      // Stay open on error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Role
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Define a custom role with specific permissions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Senior Mechanic"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the role's responsibilities and access level"
                required
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Module Permissions
            </h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                      Module
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                      Read
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                      Create
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                      Update
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {permissions.map((perm, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {perm.module}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.read}
                          onChange={() => togglePermission(index, "read")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.create}
                          onChange={() => togglePermission(index, "create")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.update}
                          onChange={() => togglePermission(index, "update")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.delete}
                          onChange={() => togglePermission(index, "delete")}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                setFormData({ name: "", description: "" });
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin inline" />
              ) : null}{" "}
              Create Role
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Settings() {
  const { canUpdate, canCreate, canDelete } = useUserPermissions();
  const [activeSection, setActiveSection] = useState<
    "users" | "roles" | "matrix"
  >("users");
  const [moduleSettingKey, setModuleSettingKey] =
    useState<ModuleSettingKey>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedUserRoleFilter, setSelectedUserRoleFilter] =
    useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("Admin");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddUsersByJsonModal, setShowAddUsersByJsonModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<Role | null>(
    null
  );
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [customPermissions, setCustomPermissions] = useState<
    Record<string, Permission[]>
  >({});
  const [usersLoading, setUsersLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [modulesList, setModulesList] = useState<modulesApi.Module[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@aviation.com",
      designation: "Admin",
      role: "Admin",
      status: "active",
      lastDone: "2 hours ago",
      createdDate: "15-Jan-2024",
    },
    {
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.johnson@aviation.com",
      designation: "Planner",
      role: "Planner",
      status: "active",
      lastDone: "1 day ago",
      createdDate: "10-Jan-2024",
    },
    {
      id: 3,
      name: "Michael Chen",
      email: "michael.chen@aviation.com",
      designation: "Mechanic",
      role: "Mechanic",
      status: "active",
      lastDone: "3 hours ago",
      createdDate: "08-Jan-2024",
    },
    {
      id: 4,
      name: "Emily Davis",
      email: "emily.davis@aviation.com",
      designation: "Viewer",
      role: "Viewer",
      status: "active",
      lastDone: "5 days ago",
      createdDate: "05-Jan-2024",
    },
    {
      id: 5,
      name: "Robert Wilson",
      email: "robert.wilson@aviation.com",
      designation: "Auditor",
      role: "Auditor",
      status: "inactive",
      lastDone: "2 weeks ago",
      createdDate: "01-Dec-2023",
    },
  ]);

  const defaultRoles: Role[] = [
    {
      id: 1,
      name: "Admin",
      description: "Full system access with all privileges",
      userCount: 2,
    },
    {
      id: 2,
      name: "Planner",
      description: "Plan and schedule maintenance activities",
      userCount: 5,
    },
    {
      id: 3,
      name: "Mechanic",
      description: "Execute maintenance tasks and update logs",
      userCount: 12,
    },
    {
      id: 4,
      name: "Viewer",
      description: "Read-only access to system data",
      userCount: 8,
    },
    {
      id: 5,
      name: "Auditor",
      description: "Review and audit compliance records",
      userCount: 3,
    },
  ];

  const [roles, setRoles] = useState<Role[]>(defaultRoles);

  const formatReadableDateTime = useCallback((value?: string) => {
    if (!value) return "Never";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery);
      setCurrentPage(1);
      searchDebounceRef.current = null;
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const mapAccountToUser = useCallback(
    (acc: accountApi.Account): User => {
      const roleLabel = roles.find((r) => r.id === acc.roleId)?.name || "-";
      return {
        id: acc.id,
        name: acc.fullName || `${acc.firstName} ${acc.lastName}`.trim(),
        email:
          acc.email || `${(acc.username || "user").toLowerCase()}@aviation.com`,
        designation: acc.designation || "-",
        firstName: acc.firstName || "",
        lastName: acc.lastName || "",
        middleName: acc.middleName || "",
        username: acc.username || "",
        licenseNo: acc.licenseNo || "",
        roleId: acc.roleId || 0,
        role: roleLabel,
        status: acc.status ? "active" : "inactive",
        lastDone: formatReadableDateTime(acc.lastLogin),
        createdDate: acc.createdAt
          ? new Date(acc.createdAt).toLocaleDateString()
          : "-",
      };
    },
    [roles, formatReadableDateTime]
  );

  const fetchUsersList = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await accountApi.getAccountsPaged(
        currentPage,
        itemsPerPage,
        searchDebounced,
        selectedUserRoleFilter === "all" ? "" : selectedUserRoleFilter
      );
      setUsers(res.items.map(mapAccountToUser));
      setTotalUsers(res.total);
      setTotalPages(Math.max(1, res.pages));
    } catch (err) {
      const msg =
        (
          err as {
            response?: { data?: { message?: string; detail?: string } };
            message?: string;
          }
        )?.response?.data?.message ??
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ??
        (err as Error)?.message ??
        "Failed to load users";
      setUsersError(msg);
      setUsers((prev) => {
        setTotalUsers(prev.length);
        setTotalPages(Math.max(1, Math.ceil(prev.length / itemsPerPage)));
        return prev;
      });
    } finally {
      setUsersLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    mapAccountToUser,
    searchDebounced,
    selectedUserRoleFilter,
  ]);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUserRoleFilter]);

  const fetchRoles = useCallback(() => {
    setRolesLoading(true);
    setRolesError(null);
    rolesApi
      .getRoles()
      .then((data) => {
        setRoles(data.length ? data : defaultRoles);
        setRolesError(null);
      })
      .catch((err) => {
        setRoles(defaultRoles);
        setRolesError((err as Error)?.message ?? "Failed to load roles");
      })
      .finally(() => setRolesLoading(false));
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    // GET /api/v1/modules/module-list — for Create/Edit Role permission matrix
    modulesApi
      .getModulesList()
      .then((data) => setModulesList(Array.isArray(data) ? data : []))
      .catch(() => setModulesList([]));
  }, []);

  const permissionsByRole: Record<string, Permission[]> = {
    Admin: MODULE_PERMISSIONS_LIST.map(({ label }) => ({
      module: label,
      read: true,
      create: true,
      update: true,
      delete: true,
    })),
    Planner: [
      { module: "Dashboard", read: true, create: false, update: false, delete: false },
      { module: "General Information", read: true, create: true, update: true, delete: true },
      { module: "Operation", read: true, create: true, update: true, delete: true },
      { module: "Maintenance", read: true, create: true, update: true, delete: true },
      { module: "Logbook", read: true, create: true, update: true, delete: true },
      { module: "Certificate Monitoring", read: true, create: true, update: true, delete: true },
      { module: "Daily Update", read: true, create: true, update: true, delete: true },
      { module: "System Settings", read: false, create: false, update: false, delete: false },
    ],
    Mechanic: [
      { module: "Dashboard", read: true, create: false, update: false, delete: false },
      { module: "General Information", read: true, create: false, update: false, delete: false },
      { module: "Operation", read: true, create: false, update: false, delete: false },
      { module: "Maintenance", read: true, create: false, update: false, delete: false },
      { module: "Logbook", read: true, create: true, update: true, delete: true },
      { module: "Certificate Monitoring", read: true, create: false, update: false, delete: false },
      { module: "Daily Update", read: true, create: false, update: false, delete: false },
      { module: "System Settings", read: false, create: false, update: false, delete: false },
    ],
    Viewer: [
      { module: "Dashboard", read: true, create: false, update: false, delete: false },
      { module: "General Information", read: true, create: false, update: false, delete: false },
      { module: "Operation", read: true, create: false, update: false, delete: false },
      { module: "Maintenance", read: true, create: false, update: false, delete: false },
      { module: "Logbook", read: true, create: false, update: false, delete: false },
      { module: "Certificate Monitoring", read: true, create: false, update: false, delete: false },
      { module: "Daily Update", read: true, create: false, update: false, delete: false },
      { module: "System Settings", read: false, create: false, update: false, delete: false },
    ],
    Auditor: [
      { module: "Dashboard", read: true, create: false, update: false, delete: false },
      { module: "General Information", read: true, create: false, update: true, delete: false },
      { module: "Operation", read: true, create: false, update: false, delete: false },
      { module: "Maintenance", read: true, create: false, update: false, delete: false },
      { module: "Logbook", read: true, create: false, update: true, delete: false },
      { module: "Certificate Monitoring", read: true, create: false, update: true, delete: false },
      { module: "Daily Update", read: true, create: false, update: false, delete: false },
      { module: "System Settings", read: false, create: false, update: false, delete: false },
    ],
  };

  const matrixPermissions =
    customPermissions[selectedRole] ?? permissionsByRole[selectedRole] ?? [];

  const filteredUsers = users;
  const activeRoleLabel =
    selectedUserRoleFilter === "all"
      ? "All roles"
      : selectedUserRoleFilter;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-purple-100 text-purple-700";
      case "Planner":
        return "bg-blue-100 text-blue-700";
      case "Mechanic":
        return "bg-orange-100 text-orange-700";
      case "Viewer":
        return "bg-gray-100 text-gray-700";
      case "Auditor":
        return "bg-teal-100 text-teal-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleDeleteUser = async (user: User) => {
    const result = await Swal.fire({
      title: "Delete user?",
      text: `Delete ${user.name}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!result.isConfirmed) return;
    try {
      await accountApi.deleteAccount(user.id);
      await fetchUsersList();
      await Swal.fire({
        title: "Deleted!",
        text: `User ${user.name} has been deleted.`,
        icon: "success",
        confirmButtonColor: "#1f2937",
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; detail?: string } } })
          ?.response?.data?.message ||
        (err as { response?: { data?: { message?: string; detail?: string } } })
          ?.response?.data?.detail ||
        (err as Error)?.message ||
        "Failed to delete user";
      await Swal.fire({ icon: "error", title: "Error", text: msg });
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-gray-900">Settings</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage system settings, user access, and permissions
          </p>
        </div>
      </div>

      <div className="p-6">
        {/* Section Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setModuleSettingKey("");
              setActiveSection("users");
            }}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              !moduleSettingKey && activeSection === "users"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Users className="w-4 h-4" />
            User Accounts
          </button>
          <button
            onClick={() => {
              setModuleSettingKey("");
              setActiveSection("roles");
            }}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              !moduleSettingKey && activeSection === "roles"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Shield className="w-4 h-4" />
            Roles & Permissions
          </button>
          <button
            onClick={() => {
              setModuleSettingKey("");
              setActiveSection("matrix");
            }}
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
              !moduleSettingKey && activeSection === "matrix"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            Access Matrix
          </button>

          <div className="ml-auto flex min-w-[220px] items-center gap-2 pl-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-gray-500" />
            <label htmlFor="settings-module-select" className="sr-only">
              Module Settings
            </label>
            <select
              id="settings-module-select"
              value={moduleSettingKey}
              onChange={(e) =>
                setModuleSettingKey(e.target.value as ModuleSettingKey)
              }
              className={`${SELECT_BASE_CLASS} h-10 min-w-[200px] rounded-lg border-gray-300 bg-white px-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-100`}
              aria-label="Module Settings"
            >
              <option value="">Module Settings</option>
              {MODULE_SETTING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {moduleSettingKey ? (
          <SettingsModuleSettings
            moduleKey={
              moduleSettingKey as Exclude<ModuleSettingKey, "">
            }
          />
        ) : (
          <>
        {/* User Accounts Section */}
        {activeSection === "users" && (
          <div>
            {/* Search and Actions */}
            <div className="mb-6 rounded-[16px] border border-gray-200 bg-white px-6 py-5 shadow-sm sm:px-7">
              {/* Title row */}
              <div className="mb-4">
                <h2 className="text-[1.35rem] font-semibold leading-snug text-slate-900">
                  User Directory
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Search accounts and narrow results by assigned role.
                </p>
              </div>

              {/* Stat + quick filter row */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-blue-600">
                  {totalUsers} total users
                </span>
                <div className="relative">
                  <select
                    value={selectedUserRoleFilter}
                    onChange={(e) => setSelectedUserRoleFilter(e.target.value)}
                    className={`${SELECT_BASE_CLASS} h-9 rounded-lg border-gray-300 bg-white px-3 pr-8 text-sm text-slate-700 focus:ring-2 focus:ring-blue-500`}
                    aria-label="Quick role summary"
                  >
                    <option value="all">All roles</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search + filter + buttons row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-nowrap">
                {/* Search input */}
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Role filter */}
                <div className="sm:w-48 flex-none">
                  <select
                    value={selectedUserRoleFilter}
                    onChange={(e) => setSelectedUserRoleFilter(e.target.value)}
                    className={`${SELECT_BASE_CLASS} h-10 rounded-lg border-gray-300 bg-white px-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-100 w-full`}
                    aria-label="Filter users by role"
                  >
                    <option value="all">All roles</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action buttons */}
                {canCreate("settings") && (
                  <div className="flex gap-2 flex-none">
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      type="button"
                      className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
                    >
                      <Plus className="h-4 w-4" />
                      Add User
                    </button>
                    <button
                      onClick={() => setShowAddUsersByJsonModal(true)}
                      type="button"
                      className="flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Braces className="h-4 w-4" />
                      Add User by JSON
                    </button>
                  </div>
                )}
              </div>
            </div>

            {usersError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {usersError}
              </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {usersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                        Designation
                      </th>
                      <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                        Last Done
                      </th>
                      <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <React.Fragment key={user.id}>
                          <tr className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-700">
                                {user.designation || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                                  user.role
                                )}`}
                              >
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 rounded text-xs font-medium ${
                                  user.status === "active"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {user.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {user.lastDone}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {user.createdDate}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setExpandedUser(
                                      expandedUser === user.id ? null : user.id
                                    )
                                  }
                                  type="button"
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="More actions"
                                >
                                  {expandedUser === user.id ? (
                                    <ChevronUp className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  )}
                                </button>
                                {canUpdate("settings") && (
                                  <button
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setShowEditUserModal(true);
                                    }}
                                    type="button"
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Edit user"
                                  >
                                    <Edit2 className="w-4 h-4 text-gray-600" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowResetPasswordModal(true);
                                  }}
                                  type="button"
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Reset password"
                                >
                                  <Lock className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowDeactivateModal(true);
                                  }}
                                  type="button"
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    user.status === "active"
                                      ? "hover:bg-red-50 text-red-600"
                                      : "hover:bg-green-50 text-green-600"
                                  }`}
                                  title={
                                    user.status === "active"
                                      ? "Deactivate user"
                                      : "Activate user"
                                  }
                                >
                                  {user.status === "active" ? (
                                    <UserX className="w-4 h-4" />
                                  ) : (
                                    <UserPlus className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expandedUser === user.id && (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 bg-gray-50">
                                <div className="space-y-3">
                                  <div className="flex gap-3">
                                    <button
                                      type="button"
                                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                    >
                                      View Audit Trail
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="text-sm font-medium text-gray-700">
                            No users found
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            Try adjusting the search term or selected role.
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
              {!usersLoading &&
                (filteredUsers.length > 0 || totalUsers > 0) && (
                  <DataTablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalUsers}
                    totalLabel="items"
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={setItemsPerPage}
                    pageSizeOptions={[10, 20, 50]}
                  />
                )}
            </div>
          </div>
        )}

        {/* Roles & Permissions Section */}
        {activeSection === "roles" && (
          <div>
            {rolesError && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {rolesError}
              </div>
            )}

            {rolesLoading ? (
              <div className="flex items-center justify-center py-16 bg-white rounded-lg border border-gray-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {role.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {role.description}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                          role.name
                        )}`}
                      >
                        {role.userCount} users
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {canUpdate("settings") && (
                        <button
                          onClick={async () => {
                            try {
                              const roleWithPerms = await rolesApi.getRole(role.id);
                              const perms =
                                roleWithPerms.permissions?.length > 0
                                  ? roleWithPerms.permissions
                                  : getDefaultModulePermissions(modulesList);
                              setCustomPermissions((prev) => ({
                                ...prev,
                                [role.name]: perms,
                              }));
                              setSelectedRoleForEdit(role);
                              setShowEditRoleModal(true);
                            } catch {
                              setCustomPermissions((prev) => ({
                                ...prev,
                                [role.name]: getDefaultModulePermissions(modulesList),
                              }));
                              setSelectedRoleForEdit(role);
                              setShowEditRoleModal(true);
                            }
                          }}
                          type="button"
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Permissions
                        </button>
                      )}
                      {canDelete("settings") && (
                        <button
                          onClick={async () => {
                            const hasUsers = (role.userCount ?? 0) > 0;
                            const result = await Swal.fire({
                              title: "Delete role?",
                              html: hasUsers
                                ? `<p class="text-left">Role <strong>${role.name}</strong> has ${role.userCount} user(s). Deleting may affect their access.</p><p class="text-left mt-2">Are you sure you want to delete this role?</p>`
                                : `Remove role <strong>${role.name}</strong>? This cannot be undone.`,
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#dc2626",
                              cancelButtonColor: "#6b7280",
                              confirmButtonText: "Yes, delete",
                              cancelButtonText: "Cancel",
                            });
                            if (!result.isConfirmed) return;
                            try {
                              await rolesApi.deleteRole(role.id);
                              setCustomPermissions((prev) => {
                                const next = { ...prev };
                                delete next[role.name];
                                return next;
                              });
                              fetchRoles();
                              await Swal.fire({
                                title: "Deleted",
                                text: `Role ${role.name} has been removed.`,
                                icon: "success",
                                confirmButtonColor: "#1f2937",
                              });
                            } catch (err: unknown) {
                              const data = (err as { response?: { data?: { message?: string; detail?: string | unknown } } })?.response?.data;
                              const msg =
                                (typeof data?.message === "string" ? data.message : null) ||
                                (typeof data?.detail === "string" ? data.detail : null) ||
                                (Array.isArray(data?.detail) ? (data.detail as { msg?: string }[]).map((d) => d.msg ?? "").filter(Boolean).join(", ") || null : null) ||
                                (err as Error)?.message ||
                                "Failed to delete role";
                              await Swal.fire({ icon: "error", title: "Error", text: msg });
                            }
                          }}
                          type="button"
                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
                          title="Delete role"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Role */}
            {canCreate("settings") && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowCreateRoleModal(true)}
                onKeyDown={(e) =>
                  e.key === "Enter" && setShowCreateRoleModal(true)
                }
                className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
              >
                <Plus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <h3 className="text-gray-700 font-medium mb-1">
                  Create New Role
                </h3>
                <p className="text-sm text-gray-500">
                  Define custom roles with specific permissions
                </p>
              </div>
            )}
          </div>
        )}

        {/* Access Matrix Section */}
        {activeSection === "matrix" && (
          <div>
            {/* Role Selector */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select Role to View Permissions
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-9 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236B7280%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Permissions Matrix */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-gray-700 text-xs font-semibold uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-6 py-3 text-center text-gray-700 text-xs font-semibold uppercase tracking-wider">
                      Read
                    </th>
                    <th className="px-6 py-3 text-center text-gray-700 text-xs font-semibold uppercase tracking-wider">
                      Create
                    </th>
                    <th className="px-6 py-3 text-center text-gray-700 text-xs font-semibold uppercase tracking-wider">
                      Update
                    </th>
                    <th className="px-6 py-3 text-center text-gray-700 text-xs font-semibold uppercase tracking-wider">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {matrixPermissions.map((permission, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {permission.module}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {permission.read ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100">
                            <X className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {permission.create ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100">
                            <X className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {permission.update ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100">
                            <X className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {permission.delete ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100">
                            <Check className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100">
                            <X className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Override Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">
                    Permission Overrides
                  </h4>
                  <p className="text-sm text-blue-700">
                    Individual users can have permission overrides that differ
                    from their role. All overrides are logged in the audit
                    trail.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Modals */}
      <AddUsersByJsonModal
        isOpen={showAddUsersByJsonModal}
        onClose={() => setShowAddUsersByJsonModal(false)}
        onComplete={fetchUsersList}
      />

      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        roles={roles}
        onAdd={async (newUser) => {
          try {
            await accountApi.createAccount({
              firstName: newUser.first_name,
              lastName: newUser.last_name,
              middleName: newUser.middle_name,
              username: newUser.username,
              email: newUser.email,
              designation:
                newUser.designation ||
                roles.find((r) => r.id === newUser.role_id)?.name ||
                "",
              licenseNo: newUser.license_no,
              roleId: newUser.role_id,
              status: true,
              password: newUser.password,
              auth_initial_doi: newUser.auth_initial_doi?.trim() || undefined,
            });
            setShowAddUserModal(false);
            await fetchUsersList();
            await Swal.fire({
              title: "Success!",
              text: `User ${newUser.first_name} ${newUser.last_name} has been added successfully!`,
              icon: "success",
              confirmButtonColor: "#1f2937",
            });
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message ||
              (err as Error)?.message ||
              "Failed to add user";
            await Swal.fire({ icon: "error", title: "Error", text: msg });
            throw err;
          }
        }}
      />

      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        roles={roles}
        onUpdate={async (updatedUser) => {
          try {
            await accountApi.updateAccount(updatedUser.id, {
              firstName: updatedUser.firstName || "",
              middleName: updatedUser.middleName || "",
              lastName: updatedUser.lastName || "",
              username: updatedUser.username || "",
              email: updatedUser.email,
              designation: updatedUser.designation || updatedUser.role,
              licenseNo: updatedUser.licenseNo || "",
              roleId: updatedUser.roleId,
              status: updatedUser.status === "active",
              auth_initial_doi: updatedUser.auth_initial_doi ?? "",
            });
            setShowEditUserModal(false);
            setSelectedUser(null);
            await fetchUsersList();
            await Swal.fire({
              title: "Success!",
              text: `User ${updatedUser.name} has been updated successfully!`,
              icon: "success",
              confirmButtonColor: "#1f2937",
            });
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message ||
              (err as Error)?.message ||
              "Failed to update user";
            await Swal.fire({ icon: "error", title: "Error", text: msg });
            throw err;
          }
        }}
      />

      <DeactivateUserModal
        isOpen={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onConfirm={async () => {
          if (!selectedUser) return;
          try {
            const newStatus =
              selectedUser.status === "active" ? "inactive" : "active";
            await accountApi.updateAccount(selectedUser.id, {
              status: newStatus === "active",
            });
            setShowDeactivateModal(false);
            setSelectedUser(null);
            await fetchUsersList();
            await Swal.fire({
              title: "Success!",
              text: `User ${selectedUser.name} has been ${
                newStatus === "active" ? "activated" : "deactivated"
              }!`,
              icon: "success",
              confirmButtonColor: "#1f2937",
            });
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message ||
              (err as Error)?.message ||
              "Failed to update user status";
            await Swal.fire({ icon: "error", title: "Error", text: msg });
            throw err;
          }
        }}
      />

      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={() => {
          setShowResetPasswordModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onReset={async (newPassword, forceChange) => {
          if (!selectedUser) return;
          try {
            await authApi.resetUserPassword(
              selectedUser.id,
              newPassword,
              forceChange
            );
            setShowResetPasswordModal(false);
            setSelectedUser(null);
            await Swal.fire({
              title: "Success!",
              text: `Password reset email sent to ${
                selectedUser.name
              }. Force change on next login: ${forceChange ? "Yes" : "No"}`,
              icon: "success",
              confirmButtonColor: "#1f2937",
            });
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { message?: string } } })?.response
                ?.data?.message ||
              (err as Error)?.message ||
              "Failed to reset password";
            await Swal.fire({ icon: "error", title: "Error", text: msg });
            throw err;
          }
        }}
      />

      <EditRoleModal
        isOpen={showEditRoleModal}
        onClose={() => {
          setShowEditRoleModal(false);
          setSelectedRoleForEdit(null);
        }}
        role={selectedRoleForEdit}
        moduleList={modulesList.length > 0 ? modulesList : MODULE_PERMISSIONS_LIST.map((m) => ({ name: m.label, code: m.code }))}
        permissions={
          selectedRoleForEdit
            ? customPermissions[selectedRoleForEdit.name] ??
              permissionsByRole[selectedRoleForEdit.name] ??
              getDefaultModulePermissions(modulesList)
            : []
        }
        onUpdate={async (updatedRole, updatedPermissions) => {
          try {
            const result = await rolesApi.updateRole(
              updatedRole.id,
              { name: updatedRole.name, description: updatedRole.description },
              updatedPermissions
            );
            setRoles((prev) =>
              prev.map((r) => (r.id === updatedRole.id ? result : r))
            );
            fetchRoles();
            setCustomPermissions((prev) => {
              const next = { ...prev };
              const oldName = selectedRoleForEdit?.name;
              if (oldName && oldName !== updatedRole.name) delete next[oldName];
              next[updatedRole.name] = result.permissions?.length ? result.permissions : updatedPermissions;
              return next;
            });
            setShowEditRoleModal(false);
            setSelectedRoleForEdit(null);
            await Swal.fire({
              title: "Success!",
              text: `Role ${updatedRole.name} has been updated successfully!`,
              icon: "success",
              confirmButtonColor: "#1f2937",
            });
          } catch (err: unknown) {
            const data = (err as { response?: { data?: { message?: string; detail?: string | unknown } } })?.response?.data;
            const msg =
              (typeof data?.message === "string" ? data.message : null) ||
              (typeof data?.detail === "string" ? data.detail : null) ||
              (Array.isArray(data?.detail) ? (data.detail as { msg?: string }[]).map((d) => d.msg ?? "").filter(Boolean).join(", ") || null : null) ||
              (err as Error)?.message ||
              "Failed to update role";
            await Swal.fire({ icon: "error", title: "Error", text: msg });
            throw err;
          }
        }}
      />

      <CreateRoleModal
        isOpen={showCreateRoleModal}
        onClose={() => setShowCreateRoleModal(false)}
        moduleList={modulesList.length > 0 ? modulesList : MODULE_PERMISSIONS_LIST.map((m) => ({ name: m.label, code: m.code }))}
        onCreate={async (newRole, permissions) => {
          try {
            const created = await rolesApi.createRole(
              { name: newRole.name, description: newRole.description },
              permissions
            );
            setRoles((prev) => [...prev, created]);
            fetchRoles();
            setCustomPermissions((prev) => ({
              ...prev,
              [created.name]: created.permissions?.length ? created.permissions : permissions,
            }));
            setShowCreateRoleModal(false);
            await Swal.fire({
              title: "Success!",
              text: `Role ${created.name} has been created successfully!`,
              icon: "success",
              confirmButtonColor: "#1f2937",
            });
          } catch (err: unknown) {
            const data = (err as { response?: { data?: { message?: string; detail?: string | unknown } } })?.response?.data;
            const msg =
              (typeof data?.message === "string" ? data.message : null) ||
              (typeof data?.detail === "string" ? data.detail : null) ||
              (Array.isArray(data?.detail) ? (data.detail as { msg?: string }[]).map((d) => d.msg ?? "").filter(Boolean).join(", ") || null : null) ||
              (err as Error)?.message ||
              "Failed to create role";
            await Swal.fire({ icon: "error", title: "Error", text: msg });
            throw err;
          }
        }}
      />
    </div>
  );
}
