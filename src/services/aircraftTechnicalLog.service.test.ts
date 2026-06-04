import { describe, expect, it, vi, beforeEach } from "vitest";
import apiClient from "../api/index";
import {
  BulkAtlWorkStatusValidationError,
  bulkUpdateAtlWorkStatus,
  normalizeBulkAtlWorkStatusResponse,
  validateBulkAtlWorkStatusRequest,
} from "./aircraftTechnicalLog.service";

vi.mock("../api/index", () => ({
  default: {
    put: vi.fn(),
  },
}));

describe("validateBulkAtlWorkStatusRequest", () => {
  it("accepts valid payload with deduped ids", () => {
    expect(
      validateBulkAtlWorkStatusRequest([101, 102, 101], "APPROVED", false)
    ).toEqual({
      ids: [101, 102],
      work_status: "APPROVED",
      atomic: false,
    });
  });

  it("rejects empty ids", () => {
    expect(() => validateBulkAtlWorkStatusRequest([], "APPROVED")).toThrow(
      BulkAtlWorkStatusValidationError
    );
  });

  it("rejects invalid work_status", () => {
    expect(() =>
      validateBulkAtlWorkStatusRequest([1], "NOT_A_STATUS")
    ).toThrow(BulkAtlWorkStatusValidationError);
  });
});

describe("normalizeBulkAtlWorkStatusResponse", () => {
  it("normalizes snake_case and camelCase", () => {
    expect(
      normalizeBulkAtlWorkStatusResponse({
        updated_count: 2,
        failed_count: 1,
        updated_ids: [1, 2],
        failed_items: [{ id: 3, reason: "Forbidden" }],
      })
    ).toEqual({
      updated_count: 2,
      failed_count: 1,
      updated_ids: [1, 2],
      failed_items: [{ id: 3, reason: "Forbidden" }],
    });
  });
});

describe("bulkUpdateAtlWorkStatus", () => {
  beforeEach(() => {
    vi.mocked(apiClient.put).mockReset();
  });

  it("calls bulk endpoint and returns normalized success", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        updated_count: 2,
        failed_count: 0,
        updated_ids: [101, 102],
        failed_items: [],
      },
    });

    const result = await bulkUpdateAtlWorkStatus({
      ids: [101, 102],
      work_status: "APPROVED",
      atomic: false,
    });

    expect(apiClient.put).toHaveBeenCalledWith(
      "aircraft-technical-log/work-status/bulk",
      {
        ids: [101, 102],
        work_status: "APPROVED",
        atomic: false,
      }
    );
    expect(result.updated_count).toBe(2);
    expect(result.failed_count).toBe(0);
  });

  it("returns partial success payload when API responds with failed_items", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        updated_count: 1,
        failed_count: 1,
        updated_ids: [101],
        failed_items: [{ id: 102, reason: "Invalid transition" }],
      },
    });

    const result = await bulkUpdateAtlWorkStatus({
      ids: [101, 102],
      work_status: "APPROVED",
      atomic: false,
    });

    expect(result.updated_count).toBe(1);
    expect(result.failed_count).toBe(1);
    expect(result.failed_items[0].reason).toContain("Invalid transition");
  });

  it("throws validation error on 404", async () => {
    vi.mocked(apiClient.put).mockRejectedValue({
      response: { status: 404, data: { detail: "Not found" } },
    });

    await expect(
      bulkUpdateAtlWorkStatus({
        ids: [999],
        work_status: "APPROVED",
        atomic: true,
      })
    ).rejects.toMatchObject({
      message: "No matching ATL records were found.",
      statusCode: 404,
    });
  });
});
