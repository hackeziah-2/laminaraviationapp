import { describe, expect, it } from "vitest";
import { computeTccSchedulingSnapshot } from "./tccFormulas";

describe("computeTccSchedulingSnapshot zero limits", () => {
  const base = {
    lastDoneDate: "2024-01-01",
    lastDoneTach: "100",
    lastDoneAftt: "200",
    currentDate: new Date("2024-07-01"),
    currentTach: 250,
    currentAftt: 350,
  };

  it("does not calculate remaining years when the years limit is 0", () => {
    const result = computeTccSchedulingSnapshot({
      ...base,
      limitYears: "0",
      limitHours: "1500",
    });
    expect(result.remainingYear).toBeNull();
    expect(result.remainingDays).toBeNull();
    expect(result.nextDueDate).toBeNull();
    expect(result.remainingTach).toBe(1350);
    expect(result.remainingAftt).toBe(1350);
  });

  it("does not calculate remaining hours when the hours limit is 0", () => {
    const result = computeTccSchedulingSnapshot({
      ...base,
      limitYears: "6",
      limitHours: "0",
    });
    expect(result.remainingTach).toBeNull();
    expect(result.remainingAftt).toBeNull();
    expect(result.nextDueTach).toBeNull();
    expect(result.nextDueAftt).toBeNull();
    expect(result.remainingYear).not.toBeNull();
    expect(result.remainingDays).not.toBeNull();
  });

  it("still calculates remaining when both limits are greater than 0", () => {
    const result = computeTccSchedulingSnapshot({
      ...base,
      limitYears: "6",
      limitHours: "1500",
    });
    expect(result.remainingYear).not.toBeNull();
    expect(result.remainingTach).toBe(1350);
    expect(result.nextDueTach).toBe(1600);
  });
});
