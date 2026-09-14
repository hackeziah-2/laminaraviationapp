import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({
  default: { get: vi.fn() },
}));

import apiClient from "./index";
import {
  extractAircraftTechnicalLogSearchRows,
  mapAircraftTechnicalLogSearchItem,
  searchAircraftTechnicalLogBySequence,
} from "./aircraftTechnicalLogApi";

describe("extractAircraftTechnicalLogSearchRows", () => {
  it("reads nested data.data arrays used by the list envelope", () => {
    expect(
      extractAircraftTechnicalLogSearchRows({
        data: { data: [{ id: 1, sequence_no: "100" }] },
      })
    ).toEqual([{ id: 1, sequence_no: "100" }]);
  });

  it("reads items, results, and list keys", () => {
    expect(
      extractAircraftTechnicalLogSearchRows({
        data: { items: [{ id: 2, sequence_no: "200" }] },
      })
    ).toEqual([{ id: 2, sequence_no: "200" }]);
    expect(
      extractAircraftTechnicalLogSearchRows({
        results: [{ id: 3, sequence_no: "300" }],
      })
    ).toEqual([{ id: 3, sequence_no: "300" }]);
    expect(
      extractAircraftTechnicalLogSearchRows({
        list: [{ id: 4, sequence_no: "400" }],
      })
    ).toEqual([{ id: 4, sequence_no: "400" }]);
  });

  it("wraps a single sequence row", () => {
    expect(
      extractAircraftTechnicalLogSearchRows({
        id: 9,
        sequence_no: "900",
      })
    ).toEqual([{ id: 9, sequence_no: "900" }]);
  });
});

describe("mapAircraftTechnicalLogSearchItem", () => {
  it("keeps nested aircraft objects", () => {
    expect(
      mapAircraftTechnicalLogSearchItem({
        id: 11,
        sequence_no: "11",
        aircraft: { id: 7, registration: "RP-C1234", model: "C172", type: "A" },
      }).aircraft
    ).toEqual({
      id: 7,
      registration: "RP-C1234",
      model: "C172",
      type: "A",
    });
  });

  it("treats scalar aircraft_fk as the aircraft id", () => {
    const mapped = mapAircraftTechnicalLogSearchItem({
      pk: 12,
      sequence_number: 1200,
      aircraft_fk: 42,
      aircraft_registration: "RP-C9999",
    });
    expect(mapped.id).toBe(12);
    expect(mapped.sequenceNo).toBe("1200");
    expect(mapped.aircraft).toEqual({
      id: 42,
      registration: "RP-C9999",
      model: "",
      type: "",
    });
  });
});

describe("searchAircraftTechnicalLogBySequence", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("does not call the API for a blank search", async () => {
    await expect(searchAircraftTechnicalLogBySequence("  ")).resolves.toEqual(
      []
    );
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("GETs aircraft-technical-log/?search= with aircraft filters", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        data: {
          items: [{ id: 5, sequence_no: "55", aircraft_fk: 8 }],
        },
      },
    });

    const rows = await searchAircraftTechnicalLogBySequence("55", 8);

    expect(apiClient.get).toHaveBeenCalledWith(
      "aircraft-technical-log/?search=55&aircraft_id=8&aircraft_fk=8",
      { headers: { Accept: "application/json" } }
    );
    expect(rows).toEqual([
      {
        id: 5,
        sequenceNo: "55",
        aircraft: { id: 8, registration: "", model: "", type: "" },
        natureOfFlight: undefined,
        tachometerEnd: undefined,
        autoAirframeAftt: undefined,
        originDate: undefined,
      },
    ]);
  });
});
