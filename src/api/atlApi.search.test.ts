import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  default: { get: vi.fn() },
}));

vi.mock("./aircraftTechnicalLogApi", async () => {
  const actual = await vi.importActual<
    typeof import("./aircraftTechnicalLogApi")
  >("./aircraftTechnicalLogApi");
  return {
    ...actual,
    searchAircraftTechnicalLogBySequence: vi.fn(),
  };
});

import apiClient from "./index";
import { searchAircraftTechnicalLogBySequence } from "./aircraftTechnicalLogApi";
import { searchAtlOptionsForTcc } from "./atlApi";

describe("searchAtlOptionsForTcc", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(searchAircraftTechnicalLogBySequence).mockReset();
  });

  it("uses aircraft-technical-log search for a sequence query", async () => {
    vi.mocked(searchAircraftTechnicalLogBySequence).mockResolvedValue([
      {
        id: 21,
        sequenceNo: "210",
        aircraft: {
          id: 3,
          registration: "RP-C1",
          model: "",
          type: "",
        },
        natureOfFlight: "TR",
      },
    ]);

    const rows = await searchAtlOptionsForTcc("210", 3);

    expect(searchAircraftTechnicalLogBySequence).toHaveBeenCalledWith("210", 3);
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 21,
      sequenceNo: "210",
      aircraftRegistration: "RP-C1",
    });
  });

  it("keeps a row when search returns aircraft_fk as the matching id", async () => {
    vi.mocked(searchAircraftTechnicalLogBySequence).mockResolvedValue([
      {
        id: 22,
        sequenceNo: "220",
        aircraft: { id: 9, registration: "", model: "", type: "" },
      },
    ]);

    const rows = await searchAtlOptionsForTcc("220", 9);
    expect(rows.map((r) => r.id)).toEqual([22]);
  });

  it("does not hit technical-log search for a blank query", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [{ id: 1, sequence_no: "1", aircraft: { id: 4 } }] },
    });

    await searchAtlOptionsForTcc("  ", 4);

    expect(searchAircraftTechnicalLogBySequence).not.toHaveBeenCalled();
    expect(apiClient.get).toHaveBeenCalled();
  });
});
