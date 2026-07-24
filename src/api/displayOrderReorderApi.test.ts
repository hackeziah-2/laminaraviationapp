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
import {
  reorderAircraft,
  getAllAircraftOrdered,
  getAllAircraftForArrangement,
} from "./aircraftApi";
import {
  buildDisplayOrderReorderPayload,
  toAircraftReorderPayload,
} from "../utils/displayOrderReorder";

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

describe("reorderAircraft (shared Profile + Daily Update)", () => {
  beforeEach(() => {
    vi.mocked(apiClient.put).mockReset();
    vi.mocked(apiClient.put).mockResolvedValue({
      data: {
        items: [
          { id: 10, registration: "RP-12", display_order: 1 },
          { id: 4, registration: "RP-2323", display_order: 2 },
        ],
      },
    });
  });

  it("PUTs aircraft_id and display_order to aircraft/reorder", async () => {
    const payload = toAircraftReorderPayload(
      buildDisplayOrderReorderPayload([10, 4])
    );
    const res = await reorderAircraft(payload);

    expect(apiClient.put).toHaveBeenCalledWith(
      "aircraft/reorder",
      {
        items: [
          { aircraft_id: 10, display_order: 1 },
          { aircraft_id: 4, display_order: 2 },
        ],
      },
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
    expect(res.items.map((i) => i.id)).toEqual([10, 4]);
    expect(res.items.map((i) => i.displayOrder)).toEqual([1, 2]);
  });

  it("uses aircraft_id even when Daily Update record ids differ", async () => {
    // Daily Update rows: FDU id 99/88 map to aircraft 10/4
    const dailyUpdateRows = [
      { id: 99, aircraftId: 10 },
      { id: 88, aircraftId: 4 },
    ];
    const payload = toAircraftReorderPayload(
      buildDisplayOrderReorderPayload(
        dailyUpdateRows.map((row) => row.aircraftId)
      )
    );
    await reorderAircraft(payload);
    expect(apiClient.put).toHaveBeenCalledWith(
      "aircraft/reorder",
      {
        items: [
          { aircraft_id: 10, display_order: 1 },
          { aircraft_id: 4, display_order: 2 },
        ],
      },
      expect.any(Object)
    );
    const body = vi.mocked(apiClient.put).mock.calls[0][1] as {
      items: { aircraft_id: number }[];
    };
    expect(body.items.map((i) => i.aircraft_id)).not.toContain(99);
    expect(body.items.map((i) => i.aircraft_id)).not.toContain(88);
  });
});

describe("getAll* arrangement fetch", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("aggregates TCC pages for full ordered collection", async () => {
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

  it("loads aircraft list ordered by display_order", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        { id: 4, registration: "RP-B", display_order: 2 },
        { id: 10, registration: "RP-A", display_order: 1 },
      ],
    });

    const res = await getAllAircraftOrdered();
    expect(apiClient.get).toHaveBeenCalledWith("aircraft/list");
    expect(res.map((i) => i.id)).toEqual([10, 4]);
    expect(res.map((i) => i.displayOrder)).toEqual([1, 2]);
  });

  it("loads full aircraft rows for Arrange Aircraft mode", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        items: [
          {
            id: 10,
            registration: "RP-12",
            model: "C172",
            msn: "1",
            base: "MNL",
            status: "Active",
            display_order: 1,
          },
        ],
        total: 1,
        page: 1,
        pages: 1,
      },
    });

    const res = await getAllAircraftForArrangement();
    expect(res[0]?.registration).toBe("RP-12");
    expect(res[0]?.model).toBe("C172");
    expect(res[0]?.displayOrder).toBe(1);
  });
});
