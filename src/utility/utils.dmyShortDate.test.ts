import { describe, expect, it } from "vitest";
import {
  apiDateToDmyShortDisplay,
  formatDmyShortDateForApi,
  formatDmyShortDateInputDisplay,
  isCompleteDmyShortDisplayDate,
  normalizeDmyShortDateInputText,
} from "./utils";

describe("ATL DD/MM/YY display helpers", () => {
  it("formats API YYYY-MM-DD as DD/MM/YY without using YYYY in the input", () => {
    expect(apiDateToDmyShortDisplay("2026-02-09")).toBe("09/02/26");
    expect(apiDateToDmyShortDisplay("2026-09-02")).toBe("02/09/26");
    expect(apiDateToDmyShortDisplay("")).toBe("");
  });

  it("parses DD/MM/YY back to YYYY-MM-DD", () => {
    expect(formatDmyShortDateForApi("09/02/26")).toBe("2026-02-09");
    expect(formatDmyShortDateForApi("02/09/26")).toBe("2026-09-02");
  });

  it("keeps ISO storage values unchanged", () => {
    expect(formatDmyShortDateForApi("2026-02-09")).toBe("2026-02-09");
  });

  it("masks digits as DD/MM/YY and does not accept a four-digit year while typing", () => {
    expect(formatDmyShortDateInputDisplay("090226")).toBe("09/02/26");
    expect(formatDmyShortDateInputDisplay("09022026")).toBe("09/02/20");
    expect(formatDmyShortDateInputDisplay("09")).toBe("09");
    expect(formatDmyShortDateInputDisplay("0902")).toBe("09/02");
  });

  it("treats only DD/MM/YY as a complete display value", () => {
    expect(isCompleteDmyShortDisplayDate("09/02/26")).toBe(true);
    expect(isCompleteDmyShortDisplayDate("09/02/2026")).toBe(false);
    expect(isCompleteDmyShortDisplayDate("09/02")).toBe(false);
  });

  it("normalizes pasted four-digit years down to DD/MM/YY in the input", () => {
    expect(normalizeDmyShortDateInputText("2026-02-09")).toBe("09/02/26");
    expect(normalizeDmyShortDateInputText("09/02/2026")).toBe("09/02/26");
  });
});
