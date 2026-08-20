import { describe, expect, it } from "vitest";
import {
  ATL_TSN_UNKNOWN,
  EMPTY_MAINTENANCE_LOGBOOK_ATL_FIELDS,
  mapAtlOptionalMetricToLogbookField,
  mapAtlToMaintenanceLogbookFields,
  mapAtlTsnToLogbookField,
  parseLogbookOptionalNumber,
} from "./maintenanceLogbookAtlMapping";

describe("mapAtlTsnToLogbookField", () => {
  it("uses UNK only when engine_tsn / propeller_tsn is null or empty", () => {
    expect(mapAtlTsnToLogbookField(null)).toBe(ATL_TSN_UNKNOWN);
    expect(mapAtlTsnToLogbookField(undefined)).toBe(ATL_TSN_UNKNOWN);
    expect(mapAtlTsnToLogbookField("")).toBe(ATL_TSN_UNKNOWN);
    expect(mapAtlTsnToLogbookField("  ")).toBe(ATL_TSN_UNKNOWN);
  });

  it("keeps 0 and numeric TSN values", () => {
    expect(mapAtlTsnToLogbookField(0)).toBe("0");
    expect(mapAtlTsnToLogbookField(12.5)).toBe("12.5");
    expect(mapAtlTsnToLogbookField("100.0")).toBe("100.0");
  });
});

describe("mapAtlOptionalMetricToLogbookField", () => {
  it("does not substitute UNK for TSO / TBO / airframe", () => {
    expect(mapAtlOptionalMetricToLogbookField(null)).toBe("");
    expect(mapAtlOptionalMetricToLogbookField("")).toBe("");
    expect(mapAtlOptionalMetricToLogbookField(0)).toBe("0");
    expect(mapAtlOptionalMetricToLogbookField(42)).toBe("42");
  });
});

describe("mapAtlToMaintenanceLogbookFields", () => {
  it("maps ATL response fields onto Maintenance Logbook form fields", () => {
    expect(
      mapAtlToMaintenanceLogbookFields({
        engineTsn: 10,
        engineTso: 2,
        engineTbo: 2000,
        propellerTsn: 8,
        propellerTso: 1,
        propellerTbo: 1500,
        airframeAftt: 1234.5,
      })
    ).toEqual({
      engineTsn: "10",
      engineTso: "2",
      engineTbo: "2000",
      propellerTsn: "8",
      propellerTso: "1",
      propellerTbo: "1500",
      airframeTime: "1234.5",
      airframeTsn: "1234.5",
    });
  });

  it("replaces only missing engine_tsn and propeller_tsn with UNK", () => {
    expect(
      mapAtlToMaintenanceLogbookFields({
        engineTsn: null,
        engineTso: null,
        engineTbo: "",
        propellerTsn: undefined,
        propellerTso: 3,
        propellerTbo: null,
        airframeAftt: null,
      })
    ).toEqual({
      engineTsn: ATL_TSN_UNKNOWN,
      engineTso: "",
      engineTbo: "",
      propellerTsn: ATL_TSN_UNKNOWN,
      propellerTso: "3",
      propellerTbo: "",
      airframeTime: "",
      airframeTsn: "",
    });
  });
});

describe("parseLogbookOptionalNumber", () => {
  it("does not persist UNK", () => {
    expect(parseLogbookOptionalNumber("UNK")).toBeUndefined();
    expect(parseLogbookOptionalNumber("unk")).toBeUndefined();
    expect(parseLogbookOptionalNumber("")).toBeUndefined();
    expect(parseLogbookOptionalNumber("12.5")).toBe(12.5);
    expect(parseLogbookOptionalNumber("0")).toBe(0);
  });
});

describe("EMPTY_MAINTENANCE_LOGBOOK_ATL_FIELDS", () => {
  it("clears mapped fields without injecting UNK", () => {
    expect(EMPTY_MAINTENANCE_LOGBOOK_ATL_FIELDS.engineTsn).toBe("");
    expect(EMPTY_MAINTENANCE_LOGBOOK_ATL_FIELDS.propellerTsn).toBe("");
    expect(EMPTY_MAINTENANCE_LOGBOOK_ATL_FIELDS.airframeTime).toBe("");
    expect(EMPTY_MAINTENANCE_LOGBOOK_ATL_FIELDS.airframeTsn).toBe("");
  });
});
