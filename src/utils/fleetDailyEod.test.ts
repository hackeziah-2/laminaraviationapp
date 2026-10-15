import { beforeEach, describe, expect, it } from "vitest";
import {
  formatTachReadingForEod,
  readAppliedOperationAtlId,
  resolveFleetDailyTachEod,
  writeAppliedOperationAtlId,
} from "./fleetDailyEod";

describe("formatTachReadingForEod", () => {
  it("keeps a finite tach including zero", () => {
    expect(formatTachReadingForEod(0)).toBe("0");
    expect(formatTachReadingForEod(8878.7)).toBe("8878.7");
    expect(formatTachReadingForEod("1,234.5")).toBe("1234.5");
  });

  it("returns blank for missing values", () => {
    expect(formatTachReadingForEod(null)).toBe("");
    expect(formatTachReadingForEod(undefined)).toBe("");
    expect(formatTachReadingForEod("")).toBe("");
    expect(formatTachReadingForEod("n/a")).toBe("");
  });
});

describe("resolveFleetDailyTachEod", () => {
  const currentEntry = { id: 10, tachEnd: 1500 };

  it("keeps the current EOD when no newer Operation entry exists", () => {
    expect(
      resolveFleetDailyTachEod({
        storedTachEod: 1400,
        latestEntry: currentEntry,
        appliedAtlId: null,
      })
    ).toEqual({ value: "1400", appliedAtlId: 10 });

    expect(
      resolveFleetDailyTachEod({
        storedTachEod: 1400,
        latestEntry: currentEntry,
        appliedAtlId: 10,
      })
    ).toEqual({ value: "1400", appliedAtlId: 10 });
  });

  it("replaces a zero EOD with the latest Operation Tach End", () => {
    expect(
      resolveFleetDailyTachEod({
        storedTachEod: 0,
        latestEntry: { id: 10, tachEnd: 1500 },
        appliedAtlId: 10,
      })
    ).toEqual({ value: "1500", appliedAtlId: 10 });

    expect(
      resolveFleetDailyTachEod({
        storedTachEod: "0.0",
        latestEntry: { id: 10, tachEnd: 1500 },
        appliedAtlId: null,
      })
    ).toEqual({ value: "1500", appliedAtlId: 10 });
  });

  it("keeps a zero EOD when the aircraft has no Tach End", () => {
    expect(
      resolveFleetDailyTachEod({
        storedTachEod: 0,
        latestEntry: null,
        appliedAtlId: null,
      })
    ).toEqual({ value: "0", appliedAtlId: null });
  });

  it("updates EOD from Tach End when a newer Operation entry exists", () => {
    expect(
      resolveFleetDailyTachEod({
        storedTachEod: 1400,
        latestEntry: { id: 11, tachEnd: 2261.8 },
        appliedAtlId: 10,
      })
    ).toEqual({ value: "2261.8", appliedAtlId: 10 });
  });

  it("fills an empty EOD from the latest Operation Tach End", () => {
    expect(
      resolveFleetDailyTachEod({
        storedTachEod: null,
        latestEntry: { id: 4, tachEnd: "1,100" },
        appliedAtlId: null,
      })
    ).toEqual({ value: "1100", appliedAtlId: 4 });
  });

  it("keeps the current EOD when the aircraft has no Operation entry", () => {
    expect(
      resolveFleetDailyTachEod({
        storedTachEod: 900,
        latestEntry: null,
        appliedAtlId: 3,
      })
    ).toEqual({ value: "900", appliedAtlId: 3 });
  });
});

describe("applied Operation entry memory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("remembers the Operation entry already reflected by EOD", () => {
    expect(readAppliedOperationAtlId(8)).toBeNull();
    writeAppliedOperationAtlId(8, 11);
    expect(readAppliedOperationAtlId(8)).toBe(11);
  });
});
