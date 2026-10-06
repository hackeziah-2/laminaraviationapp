// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TechnicalPublicationAddUser } from "./TechnicalPublicationAddUser";

vi.mock("../api/technicalPublicationUserApi", () => ({
  listTechnicalPublicationUsers: vi.fn(),
  getTechnicalPublicationAssignableRoles: vi.fn(),
  getTechnicalPublicationUserForEdit: vi.fn(),
  createTechnicalPublicationUser: vi.fn(),
  updateTechnicalPublicationUser: vi.fn(),
  TechnicalPublicationUserAccessError: class TechnicalPublicationUserAccessError extends Error {},
  TechnicalPublicationUserValidationError: class TechnicalPublicationUserValidationError extends Error {
    fields: Record<string, string>;
    constructor(fields: Record<string, string>) {
      super("Validation failed");
      this.fields = fields;
    }
  },
}));

import {
  createTechnicalPublicationUser,
  getTechnicalPublicationAssignableRoles,
  getTechnicalPublicationUserForEdit,
  listTechnicalPublicationUsers,
  updateTechnicalPublicationUser,
} from "../api/technicalPublicationUserApi";

const editForm = {
  firstName: "Jane",
  lastName: "Doe",
  middleName: "Q",
  username: "jdoe",
  email: "jane@aviation.com",
  designation: "Line Pilot",
  licenseNo: "LIC-1",
  authStamp: "STAMP-1",
  authInitialDoi: "2024-05-01",
  roleId: 2,
  password: "",
  confirmPassword: "",
};

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.mocked(listTechnicalPublicationUsers).mockReset();
  vi.mocked(getTechnicalPublicationAssignableRoles).mockReset();
  vi.mocked(getTechnicalPublicationUserForEdit).mockReset();
  vi.mocked(createTechnicalPublicationUser).mockReset();
  vi.mocked(updateTechnicalPublicationUser).mockReset();
  vi.mocked(listTechnicalPublicationUsers).mockResolvedValue({
    items: [
      {
        id: 9,
        name: "Jane Q Doe",
        username: "jdoe",
        email: "jane@aviation.com",
        designation: "Line Pilot",
        licenseNo: "LIC-1",
        roleName: "Pilot",
      },
    ],
    total: 1,
    page: 1,
    pages: 1,
  });
  vi.mocked(getTechnicalPublicationAssignableRoles).mockResolvedValue([
    { id: 2, name: "Pilot", description: "", userCount: 0 },
  ]);
  vi.mocked(getTechnicalPublicationUserForEdit).mockResolvedValue({
    id: 9,
    status: true,
    form: editForm,
  });
  vi.mocked(updateTechnicalPublicationUser).mockResolvedValue();
});

describe("TechnicalPublicationAddUser", () => {
  it("loads an existing user into the edit form and saves without a password", async () => {
    render(<TechnicalPublicationAddUser />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));

    expect(
      await screen.findByRole("heading", { name: "Edit User" })
    ).toBeTruthy();
    expect(screen.getByDisplayValue("Jane")).toBeTruthy();
    expect(screen.getByDisplayValue("jdoe")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Enter password")).toBeNull();

    fireEvent.change(screen.getByDisplayValue("Line Pilot"), {
      target: { value: "Captain" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(updateTechnicalPublicationUser).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          designation: "Captain",
          username: "jdoe",
          password: "",
        }),
        true
      );
    });
    expect(createTechnicalPublicationUser).not.toHaveBeenCalled();
    expect(await screen.findByText("User updated successfully.")).toBeTruthy();
  });
});
