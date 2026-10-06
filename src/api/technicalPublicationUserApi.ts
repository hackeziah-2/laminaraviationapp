import {
  createAccount,
  getAccount,
  getAccountInformationById,
  getAccountsPaged,
  getAllAccounts,
  updateAccount,
} from "./accountApi";
import { getMe } from "./authApi";
import { getRoles, type Role } from "./rolesApi";
import {
  DEFAULT_API_PAGE_SIZE,
  MAX_API_PAGE_SIZE,
} from "../constants/pagination";
import { collectAllPagedItems } from "../utils/pagedQuery";
import { isTechnicalPublicationRole } from "../utility/atlEditRbac";
import {
  accountConflictsWithUsernameOrEmail,
  accountMatchesTechnicalPublicationSearch,
  isAssignableTechnicalPublicationUserRole,
  pickAssignableTechnicalPublicationRoles,
  resolveTechnicalPublicationAccountRoleName,
  technicalPublicationDateInputValue,
  validateTechnicalPublicationAddUserForm,
  type TechnicalPublicationAddUserFormValues,
} from "../utility/technicalPublicationAddUser";

export class TechnicalPublicationUserAccessError extends Error {
  constructor(
    message = "Only Technical Publication users can access this."
  ) {
    super(message);
    this.name = "TechnicalPublicationUserAccessError";
  }
}

export class TechnicalPublicationUserValidationError extends Error {
  fields: Record<string, string>;

  constructor(fields: Record<string, string>, message = "Validation failed") {
    super(message);
    this.name = "TechnicalPublicationUserValidationError";
    this.fields = fields;
  }
}

export type TechnicalPublicationCreateUserPayload =
  TechnicalPublicationAddUserFormValues;

export type TechnicalPublicationUserEditRecord = {
  id: number;
  status: boolean;
  form: TechnicalPublicationAddUserFormValues;
};

export type TechnicalPublicationUserListRow = {
  id: number;
  name: string;
  username: string;
  email: string;
  designation: string;
  licenseNo: string;
  roleName: string;
};

export type TechnicalPublicationUserListResponse = {
  items: TechnicalPublicationUserListRow[];
  total: number;
  page: number;
  pages: number;
};

function readApiFieldErrors(error: unknown): Record<string, string> {
  const data = (
    error as { response?: { data?: Record<string, unknown> } }
  )?.response?.data;
  if (!data || typeof data !== "object") return {};

  const fields: Record<string, string> = {};
  const take = (apiKey: string, formKey: string) => {
    const value = data[apiKey];
    if (typeof value === "string" && value.trim()) {
      fields[formKey] = value;
      return;
    }
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === "string" && first.trim()) fields[formKey] = first;
    }
  };

  take("username", "username");
  take("email", "email");
  take("first_name", "firstName");
  take("last_name", "lastName");
  take("license_no", "licenseNo");
  take("role_id", "roleId");
  take("password", "password");

  const detail = data.detail;
  if (typeof detail === "string") {
    const lower = detail.toLowerCase();
    if (lower.includes("username") && !fields.username)
      fields.username = detail;
    if (lower.includes("email") && !fields.email) fields.email = detail;
  }

  return fields;
}

async function loadAccountsForUniqueness(search: string) {
  try {
    const page = await getAccountsPaged(1, MAX_API_PAGE_SIZE, search);
    return page.items;
  } catch {
    try {
      return await getAllAccounts();
    } catch {
      return [];
    }
  }
}

export async function assertTechnicalPublicationCanManageUsers(): Promise<void> {
  const me = await getMe();
  if (!isTechnicalPublicationRole(me.role)) {
    throw new TechnicalPublicationUserAccessError();
  }
}

export async function getTechnicalPublicationAssignableRoles(): Promise<
  Role[]
> {
  await assertTechnicalPublicationCanManageUsers();
  const roles = await getRoles();
  return pickAssignableTechnicalPublicationRoles(roles);
}

export async function listTechnicalPublicationUsers(
  page = 1,
  limit = DEFAULT_API_PAGE_SIZE,
  search = ""
): Promise<TechnicalPublicationUserListResponse> {
  await assertTechnicalPublicationCanManageUsers();
  const roles = await getRoles();
  const assignable = pickAssignableTechnicalPublicationRoles(roles);
  const roleById = new Map(roles.map((role) => [role.id, role.name]));
  const q = search.trim();
  const safeLimit = Math.max(1, limit);

  const batches =
    assignable.length > 0
      ? await Promise.all(
          assignable.map((role) =>
            collectAllPagedItems((pageNum, pageSize) =>
              getAccountsPaged(pageNum, pageSize, q, role.name)
            )
          )
        )
      : [
          await collectAllPagedItems((pageNum, pageSize) =>
            getAccountsPaged(pageNum, pageSize, q)
          ),
        ];

  const byId = new Map<number, TechnicalPublicationUserListRow>();
  for (const batch of batches) {
    for (const account of batch) {
      if (!account?.id || byId.has(account.id)) continue;
      const roleName = resolveTechnicalPublicationAccountRoleName(
        account,
        roleById
      );
      if (!isAssignableTechnicalPublicationUserRole(roleName)) continue;
      const name =
        account.fullName.trim() ||
        `${account.firstName} ${account.lastName}`.trim();
      const row = {
        id: account.id,
        name,
        username: account.username,
        email: account.email,
        designation: account.designation,
        licenseNo: account.licenseNo,
        roleName,
      };
      if (!accountMatchesTechnicalPublicationSearch(row, q)) continue;
      byId.set(account.id, row);
    }
  }

  const filtered = Array.from(byId.values());
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit) || 1);
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * safeLimit;

  return {
    items: filtered.slice(start, start + safeLimit),
    total,
    page: safePage,
    pages,
  };
}

export async function createTechnicalPublicationUser(
  payload: TechnicalPublicationCreateUserPayload
): Promise<void> {
  await assertTechnicalPublicationCanManageUsers();

  const formErrors = validateTechnicalPublicationAddUserForm(payload);
  if (Object.keys(formErrors).length > 0) {
    throw new TechnicalPublicationUserValidationError(formErrors);
  }

  const username = payload.username.trim();
  const email = payload.email.trim();
  const [userHits, emailHits, roles] = await Promise.all([
    loadAccountsForUniqueness(username),
    email.toLowerCase() === username.toLowerCase()
      ? Promise.resolve([])
      : loadAccountsForUniqueness(email),
    getRoles(),
  ]);

  const conflicts = accountConflictsWithUsernameOrEmail(
    [...userHits, ...emailHits],
    username,
    email
  );
  if (conflicts.username || conflicts.email) {
    throw new TechnicalPublicationUserValidationError({
      ...(conflicts.username ? { username: conflicts.username } : {}),
      ...(conflicts.email ? { email: conflicts.email } : {}),
    });
  }

  const assignable = pickAssignableTechnicalPublicationRoles(roles);
  const selected = assignable.find((role) => role.id === payload.roleId);
  if (
    !selected ||
    !isAssignableTechnicalPublicationUserRole(selected.name)
  ) {
    throw new TechnicalPublicationUserValidationError({
      roleId: "Role must be Pilot or a Mechanic role",
    });
  }

  try {
    await createAccount({
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      middleName: payload.middleName.trim(),
      username,
      email,
      designation: payload.designation.trim(),
      licenseNo: payload.licenseNo.trim(),
      roleId: selected.id,
      status: true,
      password: payload.password,
      auth_initial_doi: payload.authInitialDoi.trim() || undefined,
      auth_stamp: payload.authStamp.trim() || undefined,
    });
  } catch (error) {
    const fields = readApiFieldErrors(error);
    if (Object.keys(fields).length > 0) {
      throw new TechnicalPublicationUserValidationError(fields);
    }
    throw error;
  }
}

async function assertAssignableRole(roleId: number) {
  const roles = await getRoles();
  const assignable = pickAssignableTechnicalPublicationRoles(roles);
  const selected = assignable.find((role) => role.id === roleId);
  if (!selected || !isAssignableTechnicalPublicationUserRole(selected.name)) {
    throw new TechnicalPublicationUserValidationError({
      roleId: "Role must be Pilot or a Mechanic role",
    });
  }
  return selected;
}

export async function getTechnicalPublicationUserForEdit(
  accountId: number
): Promise<TechnicalPublicationUserEditRecord> {
  await assertTechnicalPublicationCanManageUsers();
  const [account, info] = await Promise.all([
    getAccount(accountId),
    getAccountInformationById(accountId),
  ]);
  return {
    id: account.id || accountId,
    status: account.status,
    form: {
      firstName: account.firstName ?? "",
      lastName: account.lastName ?? "",
      middleName: account.middleName ?? "",
      username: account.username ?? "",
      email: account.email ?? "",
      designation: account.designation ?? "",
      licenseNo: account.licenseNo ?? "",
      authStamp: info.auth_stamp ?? account.authStamp ?? "",
      authInitialDoi: technicalPublicationDateInputValue(
        info.auth_initial_doi
      ),
      roleId: account.roleId ?? 0,
      password: "",
      confirmPassword: "",
    },
  };
}

export async function updateTechnicalPublicationUser(
  accountId: number,
  payload: TechnicalPublicationCreateUserPayload,
  status = true
): Promise<void> {
  await assertTechnicalPublicationCanManageUsers();

  const formErrors = validateTechnicalPublicationAddUserForm(payload, {
    requirePassword: false,
  });
  if (Object.keys(formErrors).length > 0) {
    throw new TechnicalPublicationUserValidationError(formErrors);
  }

  const username = payload.username.trim();
  const email = payload.email.trim();
  const [userHits, emailHits, selected] = await Promise.all([
    loadAccountsForUniqueness(username),
    email.toLowerCase() === username.toLowerCase()
      ? Promise.resolve([])
      : loadAccountsForUniqueness(email),
    assertAssignableRole(payload.roleId),
  ]);

  const conflicts = accountConflictsWithUsernameOrEmail(
    [...userHits, ...emailHits],
    username,
    email,
    accountId
  );
  if (conflicts.username || conflicts.email) {
    throw new TechnicalPublicationUserValidationError({
      ...(conflicts.username ? { username: conflicts.username } : {}),
      ...(conflicts.email ? { email: conflicts.email } : {}),
    });
  }

  try {
    await updateAccount(accountId, {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      middleName: payload.middleName.trim(),
      username,
      email,
      designation: payload.designation.trim(),
      licenseNo: payload.licenseNo.trim(),
      roleId: selected.id,
      status,
      auth_initial_doi: payload.authInitialDoi.trim() || null,
      auth_stamp: payload.authStamp.trim() || null,
    });
  } catch (error) {
    if (error instanceof TechnicalPublicationUserValidationError) throw error;
    const fields = readApiFieldErrors(error);
    if (Object.keys(fields).length > 0) {
      throw new TechnicalPublicationUserValidationError(fields);
    }
    throw error;
  }
}
