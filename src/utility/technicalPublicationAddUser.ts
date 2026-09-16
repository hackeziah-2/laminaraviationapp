const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type TechnicalPublicationAddUserFormValues = {
  firstName: string;
  lastName: string;
  middleName: string;
  username: string;
  email: string;
  designation: string;
  licenseNo: string;
  authStamp: string;
  authInitialDoi: string;
  roleId: number;
  password: string;
  confirmPassword: string;
};

export const EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM: TechnicalPublicationAddUserFormValues =
  {
    firstName: "",
    lastName: "",
    middleName: "",
    username: "",
    email: "",
    designation: "",
    licenseNo: "",
    authStamp: "",
    authInitialDoi: "",
    roleId: 0,
    password: "",
    confirmPassword: "",
  };

/** Pilot (exact) or any role whose name contains “Mechanic”. */
export function isAssignableTechnicalPublicationUserRole(
  name: string | undefined | null
): boolean {
  const n = String(name ?? "")
    .trim()
    .toLowerCase();
  if (!n) return false;
  return n === "pilot" || n.includes("mechanic");
}

export function resolveTechnicalPublicationAccountRoleName(
  account: { roleId?: number; roleName?: string },
  roleById?: Map<number, string>
): string {
  const fromAccount = String(account.roleName ?? "").trim();
  if (fromAccount) return fromAccount;
  const id = Number(account.roleId ?? 0);
  if (Number.isFinite(id) && id > 0 && roleById?.has(id)) {
    return roleById.get(id) ?? "";
  }
  return "";
}

export function pickAssignableTechnicalPublicationRoles<
  T extends { id?: number; name: string },
>(roles: T[]): T[] {
  const pilot = roles.find(
    (role) => role.name.trim().toLowerCase() === "pilot"
  );
  const mechanics = roles.filter((role) =>
    role.name.trim().toLowerCase().includes("mechanic")
  );
  const seen = new Set<string>();
  const out: T[] = [];
  for (const role of [pilot, ...mechanics]) {
    if (!role) continue;
    const key =
      role.id != null
        ? `id:${role.id}`
        : `name:${role.name.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(role);
  }
  return out;
}

export function accountConflictsWithUsernameOrEmail(
  accounts: Array<{ username?: string; email?: string }>,
  username: string,
  email: string
): Partial<Record<"username" | "email", string>> {
  const wantUser = username.trim().toLowerCase();
  const wantEmail = email.trim().toLowerCase();
  const fields: Partial<Record<"username" | "email", string>> = {};
  if (
    wantUser &&
    accounts.some(
      (a) => String(a.username ?? "").trim().toLowerCase() === wantUser
    )
  ) {
    fields.username = "Username is already taken";
  }
  if (
    wantEmail &&
    accounts.some(
      (a) => String(a.email ?? "").trim().toLowerCase() === wantEmail
    )
  ) {
    fields.email = "Email address is already taken";
  }
  return fields;
}

export function accountMatchesTechnicalPublicationSearch(
  row: {
    name?: string;
    username?: string;
    email?: string;
    designation?: string;
    licenseNo?: string;
  },
  search: string
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [
    row.name,
    row.username,
    row.email,
    row.designation,
    row.licenseNo,
  ].some((value) => String(value ?? "").toLowerCase().includes(q));
}

export function validateTechnicalPublicationAddUserForm(
  values: TechnicalPublicationAddUserFormValues
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.firstName.trim()) errors.firstName = "First name is required";
  if (!values.lastName.trim()) errors.lastName = "Last name is required";
  if (!values.username.trim()) errors.username = "Username is required";
  if (!values.email.trim()) errors.email = "Email address is required";
  else if (!EMAIL_FORMAT_RE.test(values.email.trim()))
    errors.email = "Enter a valid email address";
  if (!values.designation.trim())
    errors.designation = "Designation is required";
  if (!values.licenseNo.trim()) errors.licenseNo = "License No. is required";
  if (!values.roleId) errors.roleId = "Role is required";
  if (!values.password) errors.password = "Password is required";
  if (!values.confirmPassword)
    errors.confirmPassword = "Confirm password is required";
  else if (values.password !== values.confirmPassword)
    errors.confirmPassword = "Passwords do not match";

  return errors;
}
