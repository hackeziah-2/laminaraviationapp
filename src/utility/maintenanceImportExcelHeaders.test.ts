import { describe, expect, it } from "vitest";
import { validateMaintenanceImportHeaderRow } from "./maintenanceImportExcelHeaders";

const TCC_BASE_HEADERS = [
  "Category",
  "Part Number",
  "Serial Number",
  "Description",
  "Component Method of Compliance",
  "Last Done Date",
  "Last Done Tach",
  "Last Done AFTT",
  "Last Done Method of Compliance",
  "Component Limit Years",
  "Component Limit Hours",
];

describe("validateMaintenanceImportHeaderRow maintenance-tcc", () => {
  it("passes with Sequence No.", () => {
    expect(
      validateMaintenanceImportHeaderRow("maintenance-tcc", [
        ...TCC_BASE_HEADERS,
        "Sequence No.",
      ])
    ).toEqual({ ok: true });
  });

  it("passes with ATL Ref", () => {
    expect(
      validateMaintenanceImportHeaderRow("maintenance-tcc", [
        ...TCC_BASE_HEADERS,
        "ATL Ref",
      ])
    ).toEqual({ ok: true });
  });

  it("fails when neither Sequence No. nor ATL Ref is present", () => {
    const result = validateMaintenanceImportHeaderRow("maintenance-tcc", [
      ...TCC_BASE_HEADERS,
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("Sequence No. or ATL Ref");
    }
  });
});

describe("validateMaintenanceImportHeaderRow maintenance-cpcp", () => {
  const CPCP_HEADERS = [
    "Inspection Operation",
    "Description",
    "Interval Hours",
    "Interval Months",
    "Last Done Tach",
    "Last Done AFTT",
    "Last Done Date",
    "Sequence No.",
  ];

  it("passes with required CPCP import headers", () => {
    expect(
      validateMaintenanceImportHeaderRow("maintenance-cpcp", CPCP_HEADERS)
    ).toEqual({ ok: true });
  });

  it("fails when required CPCP headers are missing", () => {
    const result = validateMaintenanceImportHeaderRow("maintenance-cpcp", [
      "Inspection Operation",
      "Description",
      "Last Done Date",
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("INTERVAL HOURS");
      expect(result.missing).toContain("SEQUENCE NO.");
    }
  });
});
