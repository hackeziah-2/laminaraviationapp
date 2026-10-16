import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  default: { get: vi.fn() },
}));

import apiClient from "./index";
import {
  appendAtlBatchFilterParams,
  displayTSN,
  formatAtlListCell,
  getAircraftTechnicalLogs,
  getManagedAircraftTechnicalLogs,
  normalizeAtlPagedSortParam,
  normalizeAtlPilotAcceptanceNameForApi,
  parseAtlAssigneeIdForApi,
  pilotAcceptanceNameFieldsForApi,
} from "./aircraftTechnicalLogApi";
import { formatAtlFuelLeftRightForDisplay } from "../utility/utils";

describe("appendAtlBatchFilterParams", () => {
  it("sends atl_batch=all so assigned and unassigned rows are both included", () => {
    const params = new URLSearchParams();
    appendAtlBatchFilterParams(params, "all");
    expect(params.get("atl_batch")).toBe("all");
    expect(params.get("atl_batch_fk")).toBe("all");
  });

  it("sends a specific batch id for both batch params", () => {
    const params = new URLSearchParams();
    appendAtlBatchFilterParams(params, 8);
    expect(params.get("atl_batch")).toBe("8");
    expect(params.get("atl_batch_fk")).toBe("8");
  });

  it("omits the batch filter when no batch is provided", () => {
    const params = new URLSearchParams();
    appendAtlBatchFilterParams(params, undefined);
    expect(params.has("atl_batch")).toBe(false);
    expect(params.has("atl_batch_fk")).toBe(false);
  });
});

describe("getAircraftTechnicalLogs", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("loads every batch for the aircraft, highest sequence first, 50 per page", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, pages: 1 },
    });

    await getAircraftTechnicalLogs(
      1,
      50,
      "",
      12,
      "-sequence_no"
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      "aircraft-technical-log/paged?page=1&page_size=50&limit=50&aircraft_id=12&aircraft_fk=12&sort=-sequence_no"
    );
  });

  it("keeps the aircraft and sequence sort when requesting another page", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 80, page: 2, pages: 2 },
    });

    await getAircraftTechnicalLogs(
      2,
      50,
      "",
      12,
      "-sequence_no"
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      "aircraft-technical-log/paged?page=2&page_size=50&limit=50&aircraft_id=12&aircraft_fk=12&sort=-sequence_no"
    );
  });
});

describe("getManagedAircraftTechnicalLogs", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("loads every aircraft and batch, newest first, 50 per page", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, pages: 1 },
    });

    await getManagedAircraftTechnicalLogs(1, 50, "", undefined, "-created_at", undefined, "all");

    expect(apiClient.get).toHaveBeenCalledWith(
      "aircraft-technical-log/manage/paged?atl_batch=all&atl_batch_fk=all&page=1&page_size=50&limit=50&sort=-created_at"
    );
  });

  it("keeps the same filters when requesting another page", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 80, page: 2, pages: 2 },
    });

    await getManagedAircraftTechnicalLogs(2, 50, "", undefined, "-created_at", undefined, "all");

    expect(apiClient.get).toHaveBeenCalledWith(
      "aircraft-technical-log/manage/paged?atl_batch=all&atl_batch_fk=all&page=2&page_size=50&limit=50&sort=-created_at"
    );
  });
});

describe("normalizeAtlPagedSortParam", () => {
  it("passes ascending field unchanged", () => {
    expect(normalizeAtlPagedSortParam("sequence_no")).toBe("sequence_no");
  });

  it("passes descending field unchanged", () => {
    expect(normalizeAtlPagedSortParam("-created_at")).toBe("-created_at");
  });

  it("collapses accidental double prefix", () => {
    expect(normalizeAtlPagedSortParam("--sequence_no")).toBe("-sequence_no");
  });

  it("returns empty for blank sort", () => {
    expect(normalizeAtlPagedSortParam("")).toBe("");
    expect(normalizeAtlPagedSortParam("   ")).toBe("");
  });
});

describe("formatAtlListCell", () => {
  it("displays - for 0, null, undefined, and empty", () => {
    expect(formatAtlListCell(0)).toBe("-");
    expect(formatAtlListCell("0")).toBe("-");
    expect(formatAtlListCell("0.00")).toBe("-");
    expect(formatAtlListCell(null)).toBe("-");
    expect(formatAtlListCell(undefined)).toBe("-");
    expect(formatAtlListCell("")).toBe("-");
    expect(formatAtlListCell("  ")).toBe("-");
  });

  it("keeps valid non-zero values unchanged", () => {
    expect(formatAtlListCell(4)).toBe("4");
    expect(formatAtlListCell("12.50")).toBe("12.50");
    expect(formatAtlListCell("001")).toBe("001");
    expect(formatAtlListCell("FOR_REVIEW")).toBe("FOR_REVIEW");
  });
});

describe("displayTSN", () => {
  it("displays UNK when TSN is unknown, not -", () => {
    expect(displayTSN(null)).toBe("UNK");
    expect(displayTSN(undefined)).toBe("UNK");
    expect(displayTSN("")).toBe("UNK");
  });

  it("keeps a known TSN including 0", () => {
    expect(displayTSN(0)).toBe("0");
    expect(displayTSN("125.5")).toBe("125.5");
  });
});

describe("formatAtlFuelLeftRightForDisplay", () => {
  it("treats 0 as unassigned without changing non-zero sides", () => {
    expect(formatAtlFuelLeftRightForDisplay(0, 0)).toBe("-");
    expect(formatAtlFuelLeftRightForDisplay(0, 5)).toBe("5");
    expect(formatAtlFuelLeftRightForDisplay(4, 5)).toBe("4+5");
  });
});

describe("pilotAcceptanceNameFieldsForApi", () => {
  it("sends null when the field is cleared or a none sentinel", () => {
    expect(pilotAcceptanceNameFieldsForApi("")).toEqual({
      pilotFk: null,
      pilotAcceptedBy: null,
    });
    expect(pilotAcceptanceNameFieldsForApi("None")).toEqual({
      pilotFk: null,
      pilotAcceptedBy: null,
    });
    expect(pilotAcceptanceNameFieldsForApi(null)).toEqual({
      pilotFk: null,
      pilotAcceptedBy: null,
    });
  });

  it("sends the selected account id", () => {
    expect(pilotAcceptanceNameFieldsForApi("42")).toEqual({
      pilotFk: 42,
      pilotAcceptedBy: 42,
    });
  });
});

describe("normalizeAtlPilotAcceptanceNameForApi", () => {
  it("converts empty form values to null without touching other fields", () => {
    expect(
      normalizeAtlPilotAcceptanceNameForApi({
        pilot_accepted_by: "",
        pilot_fk: "None",
        pilot_accept_date: "2026-09-11",
      })
    ).toEqual({
      pilot_accepted_by: null,
      pilot_fk: null,
      pilot_accept_date: "2026-09-11",
    });
  });

  it("does not inject name fields onto partial updates", () => {
    expect(
      normalizeAtlPilotAcceptanceNameForApi({ work_status: "APPROVED" })
    ).toEqual({ work_status: "APPROVED" });
  });

  it("keeps an explicitly selected id", () => {
    expect(
      parseAtlAssigneeIdForApi(
        normalizeAtlPilotAcceptanceNameForApi({
          pilot_accepted_by: "15",
          pilot_fk: "15",
        }).pilot_accepted_by as number | null
      )
    ).toBe(15);
  });
});
