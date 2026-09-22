import { describe, expect, it } from "vitest";
import { isReliabilityMonitoringNature } from "./reliabilityMonitoringNature";

describe("isReliabilityMonitoringNature", () => {
  it("includes ME and TR W/ PIREM aliases", () => {
    expect(isReliabilityMonitoringNature("ME")).toBe(true);
    expect(isReliabilityMonitoringNature("TR_WITH_PIREM")).toBe(true);
    expect(isReliabilityMonitoringNature("TR W/ PIREM")).toBe(true);
    expect(isReliabilityMonitoringNature("TR WITH PIREM")).toBe(true);
  });

  it("excludes every other Nature of Flight value", () => {
    for (const nature of [
      "TR",
      "PSF",
      "PRF",
      "EGR",
      "VOID",
      "ATL_REPL",
      "CANCELLED_FLT",
      "",
      null,
      undefined,
    ]) {
      expect(isReliabilityMonitoringNature(nature)).toBe(false);
    }
  });
});
