import { describe, expect, it } from "vitest";
import {
  extractApiValidationLines,
  formatApiErrorForSwal,
  formatMaintenanceImportErrorForSwal,
  formatValidationErrorForSwal,
  getMaintenanceImportErrorMessage,
  isNotValidDataInputMessage,
  maintenanceImportResponseIndicatesFailure,
} from "./utils";

describe("formatValidationErrorForSwal", () => {
  it("returns error icon, Validation Error title, and text message", () => {
    expect(
      formatValidationErrorForSwal("Limit must be less than or equal to 100.")
    ).toEqual({
      icon: "error",
      title: "Validation Error",
      text: "Limit must be less than or equal to 100.",
    });
  });
});

describe("formatApiErrorForSwal", () => {
  it("maps HTTP 422 with string detail to Validation Error swal", () => {
    const content = formatApiErrorForSwal({
      response: {
        status: 422,
        data: { detail: "Limit must be less than or equal to 100." },
      },
    });
    expect(content).toEqual({
      icon: "error",
      title: "Validation Error",
      text: "Limit must be less than or equal to 100.",
    });
  });

  it("maps HTTP 422 with Pydantic detail array to joined text", () => {
    const content = formatApiErrorForSwal({
      response: {
        status: 422,
        data: {
          detail: [
            { loc: ["body", "limit"], msg: "Limit must be less than or equal to 100." },
            { loc: ["body", "page"], msg: "Page must be positive." },
          ],
        },
      },
    });
    expect(content.icon).toBe("error");
    expect(content.title).toBe("Validation Error");
    expect(content.text).toContain("Limit must be less than or equal to 100.");
    expect(content.text).toContain("Page must be positive.");
  });

  it("uses default title for non-validation errors", () => {
    const content = formatApiErrorForSwal(
      { response: { status: 500, data: { detail: "Server error" } } },
      { defaultTitle: "Import Failed" }
    );
    expect(content).toEqual({
      icon: "error",
      title: "Import Failed",
      text: "Server error",
    });
  });
});

describe("extractApiValidationLines", () => {
  it("extracts row/field messages from import error objects", () => {
    const lines = extractApiValidationLines([
      { row: 2, field: "base", message: "Base is required" },
    ]);
    expect(lines).toEqual(["Row 2 — base — Base is required"]);
  });

  it("includes row errors when detail is a summary string", () => {
    const lines = extractApiValidationLines("Not valid data input", {
      errors: [{ row: 3, field: "unit", message: "Unit is required" }],
    });
    expect(lines).toContain("Not valid data input");
    expect(lines).toContain("Row 3 — unit — Unit is required");
  });
});

describe("formatMaintenanceImportErrorForSwal", () => {
  it("shows Not valid data input title for HTTP 400 with that detail", () => {
    const content = formatMaintenanceImportErrorForSwal({
      response: {
        status: 400,
        data: { detail: "Not valid data input" },
      },
    });
    expect(content.title).toBe("Not valid data input");
    expect(content.icon).toBe("error");
  });

  it("lists row errors under Not valid data input title", () => {
    const content = formatMaintenanceImportErrorForSwal({
      response: {
        status: 400,
        data: {
          detail: "Not valid data input",
          errors: [
            { row: 2, field: "unit", message: "Invalid unit" },
            { row: 4, field: "unit", message: "Invalid unit" },
          ],
        },
      },
    });
    expect(content.title).toBe("Not valid data input");
    expect(content.html).toContain("Row 2");
    expect(content.html).toContain("Row 4");
  });
});

describe("maintenanceImportResponseIndicatesFailure", () => {
  it("detects not valid data input in 2xx body", () => {
    expect(
      maintenanceImportResponseIndicatesFailure({
        valid: false,
        message: "Not valid data input",
      })
    ).toBe(true);
    expect(isNotValidDataInputMessage("Not valid data input")).toBe(true);
  });

  it("detects status failed with errorMessage", () => {
    const body = {
      status: "failed",
      errorMessage: "Row 5: unit must be HRS or CYCLES",
    };
    expect(maintenanceImportResponseIndicatesFailure(body)).toBe(true);
    expect(getMaintenanceImportErrorMessage(body)).toBe(
      "Row 5: unit must be HRS or CYCLES"
    );
  });
});

describe("formatMaintenanceImportErrorForSwal status failed", () => {
  it("shows errorMessage when status is failed", () => {
    const content = formatMaintenanceImportErrorForSwal({
      response: {
        status: 200,
        data: {
          status: "failed",
          errorMessage: "Row 5: unit must be HRS or CYCLES",
        },
      },
    });
    expect(content).toEqual({
      icon: "error",
      title: "Import failed",
      text: "Row 5: unit must be HRS or CYCLES",
    });
  });

  it("uses Not valid data input title when errorMessage matches", () => {
    const content = formatMaintenanceImportErrorForSwal({
      response: {
        data: {
          status: "failed",
          errorMessage: "Not valid data input",
        },
      },
    });
    expect(content.title).toBe("Not valid data input");
    expect(content.text).toBe("Not valid data input");
  });
});
