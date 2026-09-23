import { describe, expect, it } from "vitest";
import { computeCpcpRow, getCpcpRemainingAlert } from "./cpcpFormulas";

describe("getCpcpRemainingAlert", () => {
  it("does not color remaining when the interval limit is 0", () => {
    expect(getCpcpRemainingAlert(0, -10)).toBe("default");
    expect(getCpcpRemainingAlert(0, 5)).toBe("default");
  });

  it("applies status colors when the interval limit is greater than 0", () => {
    expect(getCpcpRemainingAlert(100, 0)).toBe("red");
    expect(getCpcpRemainingAlert(100, 5)).toBe("orange");
    expect(getCpcpRemainingAlert(100, 15)).toBe("yellow");
    expect(getCpcpRemainingAlert(100, 30)).toBe("green");
    expect(getCpcpRemainingAlert(100, 50)).toBe("default");
  });
});

describe("computeCpcpRow zero intervals", () => {
  const lastDone = {
    date: "2024-01-01",
    tach: 100,
    aftf: 200,
  };

  it("shows dash remaining months when interval months is 0", () => {
    const result = computeCpcpRow(
      {
        lastDone,
        interval: { hours: 1500, months: 0 },
        remaining: { months: "3", days: "90", tach: "400", aftf: "400" },
      },
      250,
      350
    );
    expect(result.remaining.months).toBe("-");
    expect(result.remaining.days).toBe("-");
    expect(result.remaining.tach).not.toBe("-");
    expect(result.remaining.aftf).not.toBe("-");
  });

  it("shows dash remaining hours when interval hours is 0", () => {
    const result = computeCpcpRow(
      {
        lastDone,
        interval: { hours: 0, months: 12 },
        remaining: { months: "6", days: "180", tach: "10", aftf: "10" },
      },
      250,
      350
    );
    expect(result.remaining.tach).toBe("-");
    expect(result.remaining.aftf).toBe("-");
    expect(result.remaining.months).not.toBe("-");
    expect(result.remaining.days).not.toBe("-");
  });
});
