import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_STATUS_REQUIRES_DAILY_UPDATE,
  operationalStatusToSave,
} from "./operationalStatusSync";

describe("operational status save", () => {
  it("writes a changed status only when a daily update exists", () => {
    expect(
      operationalStatusToSave({
        hasDailyUpdate: true,
        savedStatus: "Operational",
        draftStatus: "AOG",
      })
    ).toEqual({ status: "AOG", error: null });
  });

  it("does not write when the status is unchanged", () => {
    expect(
      operationalStatusToSave({
        hasDailyUpdate: true,
        savedStatus: "Ongoing Maintenance",
        draftStatus: "Ongoing Maintenance",
      })
    ).toEqual({ status: null, error: null });
  });

  it("requires a daily update before a status change", () => {
    expect(
      operationalStatusToSave({
        hasDailyUpdate: false,
        savedStatus: null,
        draftStatus: "Operational",
      }).error
    ).toBe(OPERATIONAL_STATUS_REQUIRES_DAILY_UPDATE);
  });

  it("allows the rest of the form to save when no daily update exists", () => {
    expect(
      operationalStatusToSave({
        hasDailyUpdate: false,
        savedStatus: null,
        draftStatus: "",
      })
    ).toEqual({ status: null, error: null });
  });
});
