import { useState, useEffect, useCallback } from "react";
import {
  User,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import Swal from "sweetalert2";
import { confirmSaveEntry } from "../utils/confirmSaveEntry";
import * as authApi from "../api/authApi";
import * as accountApi from "../api/accountApi";
import { useUserPermissions } from "../hooks/useUserPermissions";
import { SpinnerIcon } from "./ui/spinner";

function formatApiError(err: unknown): string {
  const e = err as {
    message?: string;
    response?: { data?: { message?: string; detail?: unknown } };
  };
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

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<void>;
}

function ChangePasswordModal({
  isOpen,
  onClose,
  onSubmit,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!currentPassword.trim()) {
      setError("Current password is required");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPassword.length > 72) {
      setError("New password must be at most 72 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(currentPassword, newPassword);
      onClose();
    } catch {
      // Stay open; parent shows Swal
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
          <p className="mt-1 text-sm text-gray-600">
            Enter your current password and choose a new one
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Current password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password (6–72 characters)"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Account id for PATCH /api/v1/account-information/{id} (JWT sub or /me). */
function resolveAccountId(user: authApi.AuthUser): number | null {
  const fromUser = user.accountInformationId ?? user.id;
  if (fromUser > 0) return fromUser;
  return authApi.getAccountIdFromAccessToken();
}

export function MyProfile() {
  const { user: meUser, loading: meLoading, refetch } = useUserPermissions();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [accountId, setAccountId] = useState<number | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!meUser) return;

    const id = resolveAccountId(meUser);
    setAccountId(id);

    const fallbackUsername =
      meUser.username?.trim() ||
      localStorage.getItem("auth_username")?.trim() ||
      "";
    setEmail(meUser.email?.trim() || "");
    setUsername(fallbackUsername);

    if (!id) return;

    setLoadingAccount(true);
    try {
      const acc = await accountApi.getAccount(id);
      if (acc.username?.trim()) setUsername(acc.username.trim());
      if (acc.email?.trim()) setEmail(acc.email.trim());
    } catch {
      // Keep /me and localStorage values
    } finally {
      setLoadingAccount(false);
    }
  }, [meUser]);

  useEffect(() => {
    if (!meLoading && meUser) {
      loadProfile();
    }
  }, [meLoading, meUser, loadProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meUser) return;

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) {
      await Swal.fire({
        icon: "error",
        title: "Validation",
        text: "Username is required.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }
    if (!trimmedEmail) {
      await Swal.fire({
        icon: "error",
        title: "Validation",
        text: "Email address is required.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    const id = accountId ?? resolveAccountId(meUser);
    if (!id) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Account information is not available. Please sign in again.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    if (saving) return;

    setSaving(true);
    try {
      await confirmSaveEntry(true, async () => {
        await accountApi.patchAccount(id, {
          username: trimmedUsername,
          email: trimmedEmail,
        });
        localStorage.setItem("auth_username", trimmedUsername);
        await refetch();
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    const id = accountId ?? (meUser ? resolveAccountId(meUser) : null);
    const loginUsername =
      meUser?.username?.trim() ||
      username.trim() ||
      localStorage.getItem("auth_username")?.trim() ||
      "";

    if (!id) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Account information is not available. Please sign in again.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }
    if (!loginUsername) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Username is required to verify your current password.",
        confirmButtonColor: "#1f2937",
      });
      return;
    }

    try {
      await authApi.changeMyPassword(
        id,
        loginUsername,
        currentPassword,
        newPassword
      );
      await Swal.fire({
        icon: "success",
        title: "Password updated",
        text: "Your password has been changed. Please sign in with your new password.",
        confirmButtonColor: "#1f2937",
      });
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_username");
      window.location.href = "/login";
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const plainMessage = (err as Error)?.message;
      const message =
        status === 401 || plainMessage === "Current password is incorrect"
          ? "Current password is incorrect."
          : plainMessage && !plainMessage.startsWith("Request failed")
          ? plainMessage
          : formatApiError(err);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: message,
        confirmButtonColor: "#1f2937",
      });
      throw err;
    }
  };

  if (meLoading || loadingAccount) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <SpinnerIcon size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account information and security
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <User className="h-6 w-6 text-blue-600" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                User Account
              </h2>
              <p className="text-sm text-gray-500">
                Manage your personal information
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="px-6 py-6">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="profile-username"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="profile-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="johndoe"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="user@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Profile"
              )}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between gap-4 border-t border-gray-100 px-6 py-5">
          <div>
            <p className="text-sm font-medium text-gray-700">Password</p>
            <p className="mt-1 font-mono text-sm tracking-widest text-gray-400">
              ••••••••••••
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Lock className="h-4 w-4" />
            Change Password
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSubmit={handleChangePassword}
      />
    </div>
  );
}
