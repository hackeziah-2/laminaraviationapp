import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  default: { put: vi.fn(), get: vi.fn() },
}));

import apiClient from "./index";
import {
  reorderAircraftTccMonitoring,
  getAllAircraftTccMonitoring,
} from "./tccMonitoringApi";
import {
  reorderCpcpMonitoring,
  getAllCpcpMonitoring,
} from "./cpcpMonitoringApi";
import { buildDisplayOrderReorderPayload } from "../utils/displayOrderReorder";

describe("reorderAircraftTccMonitoring", () => {
  beforeEach(() => {
    vi.mocked(apiClient.put).mockReset();
    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        items: [
          { id: 3, display_order: 1, description: "C" },
          { id: 1, display_order: 2, description: "A" },
          { id: 2, display_order: 3, description: "B" },
        ],
      },
    });
  });

  it("PUTs only id and display_order to maintenance-tcc/reorder", async () => {
    const payload = buildDisplayOrderReorderPayload([3, 1, 2]);
    const res = await reorderAircraftTccMonitoring(payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "maintenance-tcc/reorder",
      {
        items: [
          { id: 3, display_order: 1 },
          { id: 1, display_order: 2 },
          { id: 2, display_order: 3 },
        ],
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
    expect(res.items.map((i) => i.id)).toEqual([3, 1, 2]);
    expect(res.items.map((i) => i.displayOrder)).toEqual([1, 2, 3]);
  });
});

describe("reorderCpcpMonitoring", () => {
  beforeEach(() => {
    vi.mocked(apiClient.put).mockReset();
    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        items: [
          { id: 30, display_order: 1, description: "C" },
          { id: 10, display_order: 2, description: "A" },
        ],
      },
    });
  });

  it("PUTs only id and display_order to maintenance-cpcp/reorder", async () => {
    const payload = buildDisplayOrderReorderPayload([30, 10]);
    await reorderCpcpMonitoring(payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "maintenance-cpcp/reorder",
      {
        items: [
          { id: 30, display_order: 1 },
          { id: 10, display_order: 2 },
        ],
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });
});

describe("getAll* arrangement fetch", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("aggregates TCC pages for full ordered collection", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: {
          items: [
            { id: 1, display_order: 1, description: "A" },
            { id: 2, display_order: 2, description: "B" },
          ],
          total: 3,
          page: 1,
          pages: 2,
          limit: 2,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 3, display_order: 3, description: "C" }],
          total: 3,
          page: 2,
          pages: 2,
          limit: 2,
        },
      });

    // Force page size path: getAll uses limit 100; simulate multi-page via pages field
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [
          { id: 1, display_order: 1 },
          { id: 2, display_order: 2 },
          { id: 3, display_order: 3 },
        ],
        total: 3,
        page: 1,
        pages: 1,
      },
    });

    const res = await getAllAircraftTccMonitoring(42);
    expect(apiClient.get).toHaveBeenCalled();
    expect(res.items.map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it("aggregates CPCP pages for full ordered collection", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [
          { id: 10, display_order: 1 },
          { id: 20, display_order: 2 },
        ],
        total: 2,
        page: 1,
        pages: 1,
      },
    });

    const res = await getAllCpcpMonitoring("", 7);
    expect(res.items.map((i) => i.displayOrder)).toEqual([1, 2]);
  });
});
