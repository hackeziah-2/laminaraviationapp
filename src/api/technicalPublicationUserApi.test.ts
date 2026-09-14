import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("./accountApi", () => ({
  createAccount: vi.fn(),
  getAccountsPaged: vi.fn(),
  getAllAccounts: vi.fn(),
}));

vi.mock("./authApi", () => ({
  getMe: vi.fn(),
}));

vi.mock("./rolesApi", () => ({
  getRoles: vi.fn(),
}));

import { createAccount, getAccountsPaged } from "./accountApi";
import { getMe } from "./authApi";
import { getRoles } from "./rolesApi";
import {
  createTechnicalPublicationUser,
  getTechnicalPublicationAssignableRoles,
  listTechnicalPublicationUsers,
  TechnicalPublicationUserAccessError,
  TechnicalPublicationUserValidationError,
} from "./technicalPublicationUserApi";
import { EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM } from "../utility/technicalPublicationAddUser";

const validPayload = {
  ...EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM,
  firstName: "Jane",
  lastName: "Doe",
  username: "jdoe",
  email: "jane@aviation.com",
  designation: "Line Pilot",
  licenseNo: "LIC-1",
  roleId: 2,
  password: "secret",
  confirmPassword: "secret",
};

describe("createTechnicalPublicationUser", () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset();
    vi.mocked(getRoles).mockReset();
    vi.mocked(getAccountsPaged).mockReset();
    vi.mocked(createAccount).mockReset();
    vi.mocked(getMe).mockResolvedValue({
      id: 1,
      name: "TP User",
      email: "tp@aviation.com",
      role: "Technical Publication",
      status: "active",
      lastLogin: "",
      createdDate: "",
    });
    vi.mocked(getRoles).mockResolvedValue([
      { id: 2, name: "Pilot", description: "", userCount: 0 },
      { id: 4, name: "Mechanic", description: "", userCount: 0 },
      { id: 1, name: "Admin", description: "", userCount: 0 },
    ]);
    vi.mocked(getAccountsPaged).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pages: 1,
    });
    vi.mocked(createAccount).mockResolvedValue({
      id: 9,
      firstName: "Jane",
      lastName: "Doe",
      middleName: "",
      username: "jdoe",
      fullName: "Jane Doe",
      email: "jane@aviation.com",
      licenseNo: "LIC-1",
      designation: "Line Pilot",
      roleId: 2,
      status: true,
      createdAt: "",
      lastLogin: "",
    });
  });

  it("refuses callers who are not Technical Publication", async () => {
    vi.mocked(getMe).mockResolvedValue({
      id: 1,
      name: "Admin",
      email: "admin@aviation.com",
      role: "Admin",
      status: "active",
      lastLogin: "",
      createdDate: "",
    });

    await expect(createTechnicalPublicationUser(validPayload)).rejects.toBeInstanceOf(
      TechnicalPublicationUserAccessError
    );
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("rejects duplicate username before create", async () => {
    vi.mocked(getAccountsPaged).mockResolvedValue({
      items: [
        {
          id: 3,
          firstName: "Existing",
          lastName: "User",
          middleName: "",
          username: "jdoe",
          fullName: "Existing User",
          email: "other@aviation.com",
          licenseNo: "",
          designation: "",
          roleId: 2,
          status: true,
          createdAt: "",
          lastLogin: "",
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });

    await expect(createTechnicalPublicationUser(validPayload)).rejects.toMatchObject({
      name: "TechnicalPublicationUserValidationError",
      fields: { username: "Username is already taken" },
    });
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("rejects a role other than Pilot or Mechanic", async () => {
    await expect(
      createTechnicalPublicationUser({ ...validPayload, roleId: 1 })
    ).rejects.toBeInstanceOf(TechnicalPublicationUserValidationError);
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("creates the account when the caller is Technical Publication", async () => {
    await createTechnicalPublicationUser(validPayload);
    expect(createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "Jane",
        username: "jdoe",
        email: "jane@aviation.com",
        roleId: 2,
        password: "secret",
      })
    );
  });
});

describe("getTechnicalPublicationAssignableRoles", () => {
  it("returns Pilot and roles whose names contain Mechanic", async () => {
    vi.mocked(getMe).mockResolvedValue({
      id: 1,
      name: "TP User",
      email: "tp@aviation.com",
      role: "Technical Publication",
      status: "active",
      lastLogin: "",
      createdDate: "",
    });
    vi.mocked(getRoles).mockResolvedValue([
      { id: 2, name: "Pilot", description: "", userCount: 0 },
      { id: 1, name: "Admin", description: "", userCount: 0 },
      { id: 4, name: "Mechanic", description: "", userCount: 0 },
      { id: 5, name: "Line Mechanic", description: "", userCount: 0 },
    ]);

    await expect(getTechnicalPublicationAssignableRoles()).resolves.toEqual([
      { id: 2, name: "Pilot", description: "", userCount: 0 },
      { id: 4, name: "Mechanic", description: "", userCount: 0 },
      { id: 5, name: "Line Mechanic", description: "", userCount: 0 },
    ]);
  });
});

describe("listTechnicalPublicationUsers", () => {
  beforeEach(() => {
    vi.mocked(getMe).mockReset();
    vi.mocked(getRoles).mockReset();
    vi.mocked(getAccountsPaged).mockReset();
  });
  it("refuses callers who are not Technical Publication", async () => {
    vi.mocked(getMe).mockResolvedValue({
      id: 1,
      name: "Admin",
      email: "admin@aviation.com",
      role: "Admin",
      status: "active",
      lastLogin: "",
      createdDate: "",
    });

    await expect(listTechnicalPublicationUsers(1, 50, "jane")).rejects.toBeInstanceOf(
      TechnicalPublicationUserAccessError
    );
    expect(getAccountsPaged).not.toHaveBeenCalled();
  });

  it("lists Pilot and Mechanic-named roles and excludes other roles", async () => {
    vi.mocked(getMe).mockResolvedValue({
      id: 1,
      name: "TP User",
      email: "tp@aviation.com",
      role: "Technical Publication",
      status: "active",
      lastLogin: "",
      createdDate: "",
    });
    vi.mocked(getRoles).mockResolvedValue([
      { id: 2, name: "Pilot", description: "", userCount: 0 },
      { id: 4, name: "Mechanic", description: "", userCount: 0 },
      { id: 5, name: "Line Mechanic", description: "", userCount: 0 },
      { id: 1, name: "Admin", description: "", userCount: 0 },
    ]);
    vi.mocked(getAccountsPaged).mockImplementation(
      async (_page, _limit, _search, roles) => {
        const byRole: Record<
          string,
          Array<{
            id: number;
            firstName: string;
            lastName: string;
            middleName: string;
            username: string;
            fullName: string;
            email: string;
            licenseNo: string;
            designation: string;
            roleId: number;
            roleName?: string;
            status: boolean;
            createdAt: string;
            lastLogin: string;
          }>
        > = {
          Pilot: [
            {
              id: 10,
              firstName: "Jane",
              lastName: "Doe",
              middleName: "",
              username: "jdoe",
              fullName: "Jane Doe",
              email: "jane@aviation.com",
              licenseNo: "LIC-1",
              designation: "Line Pilot",
              roleId: 2,
              roleName: "Pilot",
              status: true,
              createdAt: "",
              lastLogin: "",
            },
          ],
          Mechanic: [
            {
              id: 12,
              firstName: "Mike",
              lastName: "Lee",
              middleName: "",
              username: "mlee",
              fullName: "Mike Lee",
              email: "mike@aviation.com",
              licenseNo: "LIC-2",
              designation: "Mechanic",
              roleId: 4,
              roleName: "Mechanic",
              status: true,
              createdAt: "",
              lastLogin: "",
            },
          ],
          "Line Mechanic": [
            {
              id: 13,
              firstName: "Pat",
              lastName: "Ng",
              middleName: "",
              username: "png",
              fullName: "Pat Ng",
              email: "pat@aviation.com",
              licenseNo: "LIC-3",
              designation: "Line Mechanic",
              roleId: 0,
              roleName: "Line Mechanic",
              status: true,
              createdAt: "",
              lastLogin: "",
            },
          ],
        };
        const items = byRole[roles ?? ""] ?? [
          {
            id: 11,
            firstName: "Admin",
            lastName: "User",
            middleName: "",
            username: "admin",
            fullName: "Admin User",
            email: "admin@aviation.com",
            licenseNo: "",
            designation: "",
            roleId: 1,
            roleName: "Admin",
            status: true,
            createdAt: "",
            lastLogin: "",
          },
        ];
        return { items, total: items.length, page: 1, pages: 1 };
      }
    );

    const result = await listTechnicalPublicationUsers(1, 50, "");

    expect(getAccountsPaged).toHaveBeenCalledWith(1, 500, "", "Pilot");
    expect(getAccountsPaged).toHaveBeenCalledWith(1, 500, "", "Mechanic");
    expect(getAccountsPaged).toHaveBeenCalledWith(
      1,
      500,
      "",
      "Line Mechanic"
    );
    expect(result.items.map((row) => row.roleName).sort()).toEqual([
      "Line Mechanic",
      "Mechanic",
      "Pilot",
    ]);
    expect(result.items.map((row) => row.id)).not.toContain(11);
    expect(result.total).toBe(3);
  });

  it("applies search across the Pilot/Mechanic list then paginates", async () => {
    vi.mocked(getMe).mockResolvedValue({
      id: 1,
      name: "TP User",
      email: "tp@aviation.com",
      role: "Technical Publication",
      status: "active",
      lastLogin: "",
      createdDate: "",
    });
    vi.mocked(getRoles).mockResolvedValue([
      { id: 2, name: "Pilot", description: "", userCount: 0 },
      { id: 4, name: "Mechanic", description: "", userCount: 0 },
    ]);
    vi.mocked(getAccountsPaged).mockResolvedValue({
      items: [
        {
          id: 10,
          firstName: "Jane",
          lastName: "Doe",
          middleName: "",
          username: "jdoe",
          fullName: "Jane Doe",
          email: "jane@aviation.com",
          licenseNo: "LIC-1",
          designation: "Line Pilot",
          roleId: 2,
          roleName: "Pilot",
          status: true,
          createdAt: "",
          lastLogin: "",
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });

    const result = await listTechnicalPublicationUsers(1, 50, "jane");
    expect(result.items.map((row) => row.id)).toEqual([10]);
    expect(result.page).toBe(1);
  });
});
