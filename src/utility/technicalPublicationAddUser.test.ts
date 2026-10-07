import { describe, expect, it } from "vitest";
import {
  accountConflictsWithUsernameOrEmail,
  accountMatchesTechnicalPublicationSearch,
  EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM,
  isAssignableTechnicalPublicationUserRole,
  pickAssignableTechnicalPublicationRoles,
  resolveTechnicalPublicationAccountRoleName,
  validateTechnicalPublicationAddUserForm,
} from "./technicalPublicationAddUser";

describe("isAssignableTechnicalPublicationUserRole", () => {
  it("allows Pilot and any role name that contains Mechanic except Maintenance Manager aliases", () => {
    expect(isAssignableTechnicalPublicationUserRole("Pilot")).toBe(true);
    expect(isAssignableTechnicalPublicationUserRole("mechanic")).toBe(true);
    expect(isAssignableTechnicalPublicationUserRole("Line Mechanic")).toBe(
      true
    );
    expect(isAssignableTechnicalPublicationUserRole("Admin")).toBe(false);
    expect(
      isAssignableTechnicalPublicationUserRole("Technical Publication")
    ).toBe(false);
    expect(
      isAssignableTechnicalPublicationUserRole("Maintenance Manager")
    ).toBe(false);
    expect(
      isAssignableTechnicalPublicationUserRole("Mechanic - Maintenance Manager")
    ).toBe(false);
  });
});

describe("resolveTechnicalPublicationAccountRoleName", () => {
  it("prefers the account role name, then the role id lookup", () => {
    expect(
      resolveTechnicalPublicationAccountRoleName({
        roleId: 9,
        roleName: "Line Mechanic",
      })
    ).toBe("Line Mechanic");
    expect(
      resolveTechnicalPublicationAccountRoleName(
        { roleId: 2, roleName: "" },
        new Map([[2, "Pilot"]])
      )
    ).toBe("Pilot");
  });
});

describe("pickAssignableTechnicalPublicationRoles", () => {
  it("returns Pilot first, then every Mechanic-named role except Maintenance Manager aliases", () => {
    const picked = pickAssignableTechnicalPublicationRoles([
      { id: 9, name: "Admin" },
      { id: 5, name: "Line Mechanic" },
      { id: 4, name: "Mechanic" },
      { id: 2, name: "Pilot" },
      { id: 10, name: "Maintenance Manager" },
      { id: 11, name: "Mechanic - Maintenance Manager" },
    ]);
    expect(picked.map((r) => r.name)).toEqual([
      "Pilot",
      "Line Mechanic",
      "Mechanic",
    ]);
  });
});

describe("accountConflictsWithUsernameOrEmail", () => {
  const accounts = [
    { username: "jdoe", email: "jane@aviation.com" },
    { username: "pilot1", email: "pilot@aviation.com" },
  ];

  it("flags exact username matches case-insensitively", () => {
    expect(accountConflictsWithUsernameOrEmail(accounts, "JDOE")).toEqual({
      username: "Username is already taken",
    });
  });

  it("returns empty when the username is unused", () => {
    expect(
      accountConflictsWithUsernameOrEmail(accounts, "newuser")
    ).toEqual({});
  });

  it("ignores the account being edited", () => {
    expect(
      accountConflictsWithUsernameOrEmail(
        [{ id: 9, username: "jdoe", email: "jane@aviation.com" }],
        "jdoe",
        9
      )
    ).toEqual({});
    expect(
      accountConflictsWithUsernameOrEmail(
        [{ id: 3, username: "jdoe", email: "other@aviation.com" }],
        "jdoe",
        9
      )
    ).toEqual({ username: "Username is already taken" });
  });
});

describe("accountMatchesTechnicalPublicationSearch", () => {
  const row = {
    name: "Jane Doe",
    username: "jdoe",
    email: "jane@aviation.com",
    designation: "Line Pilot",
    licenseNo: "LIC-1",
  };

  it("matches name, username, email, designation, and license number", () => {
    expect(accountMatchesTechnicalPublicationSearch(row, "jane")).toBe(true);
    expect(accountMatchesTechnicalPublicationSearch(row, "JDOE")).toBe(true);
    expect(accountMatchesTechnicalPublicationSearch(row, "aviation")).toBe(true);
    expect(accountMatchesTechnicalPublicationSearch(row, "line")).toBe(true);
    expect(accountMatchesTechnicalPublicationSearch(row, "lic-1")).toBe(true);
    expect(accountMatchesTechnicalPublicationSearch(row, "admin")).toBe(false);
  });
});

describe("validateTechnicalPublicationAddUserForm", () => {
  it("requires starred fields, email format, and matching passwords", () => {
    const errors = validateTechnicalPublicationAddUserForm(
      EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM
    );
    expect(errors.firstName).toBe("First name is required");
    expect(errors.lastName).toBe("Last name is required");
    expect(errors.username).toBe("Username is required");
    expect(errors.email).toBe("Email address is required");
    expect(errors.designation).toBe("Designation is required");
    expect(errors.licenseNo).toBe("License No. is required");
    expect(errors.roleId).toBe("Role is required");
    expect(errors.password).toBe("Password is required");
    expect(errors.confirmPassword).toBe("Confirm password is required");
  });

  it("rejects invalid email and mismatched passwords", () => {
    const errors = validateTechnicalPublicationAddUserForm({
      ...EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM,
      firstName: "Jane",
      lastName: "Doe",
      username: "jdoe",
      email: "not-an-email",
      designation: "Pilot",
      licenseNo: "123",
      roleId: 2,
      password: "secret",
      confirmPassword: "other",
    });
    expect(errors.email).toBe("Enter a valid email address");
    expect(errors.confirmPassword).toBe("Passwords do not match");
  });

  it("does not require a password when editing an existing user", () => {
    const errors = validateTechnicalPublicationAddUserForm(
      {
        ...EMPTY_TECHNICAL_PUBLICATION_ADD_USER_FORM,
        firstName: "Jane",
        lastName: "Doe",
        username: "jdoe",
        email: "jane@aviation.com",
        designation: "Line Pilot",
        licenseNo: "LIC-1",
        roleId: 2,
      },
      { requirePassword: false }
    );
    expect(errors).toEqual({});
  });
});
