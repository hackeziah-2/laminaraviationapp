import { describe, expect, it } from "vitest";
import { toUppercaseInput } from "../utils/uppercaseTextInput";
import {
  applyAtlRemarksText,
  assignAtlRemarksText,
  atlVisibleRemarksText,
  firstMultilineText,
  normalizeMultilineText,
  readAtlActionsTaken,
} from "./atlMultilineText";

const PASTED = "OIL LEAK AT COWL\nSECURED PANEL\nOPS CHECK OK";

describe("normalizeMultilineText", () => {
  it("keeps every line and a trailing newline from Enter", () => {
    expect(normalizeMultilineText("line one\nline two\n")).toBe(
      "line one\nline two\n"
    );
  });

  it("normalizes pasted CRLF and CR without dropping lines", () => {
    expect(normalizeMultilineText("line one\r\nline two\rline three")).toBe(
      "line one\nline two\nline three"
    );
  });

  it("treats null as empty and does not trim interior blank lines", () => {
    expect(normalizeMultilineText(null)).toBe("");
    expect(normalizeMultilineText("a\n\nb")).toBe("a\n\nb");
  });
});

describe("assignAtlRemarksText", () => {
  it("keeps a mid-sentence insert exactly where it was typed", () => {
    expect(assignAtlRemarksText("TR", "HELLXO WORLD")).toEqual({
      pilotReport: "HELLXO WORLD",
      maintenanceEntry: "",
    });
    expect(assignAtlRemarksText("PRF", "SECUcRED PANEL")).toEqual({
      pilotReport: "",
      maintenanceEntry: "SECUcRED PANEL",
    });
  });
});

describe("applyAtlRemarksText", () => {
  it("keeps a multiline Pilot Report on the pilot report field", () => {
    expect(applyAtlRemarksText("TR", PASTED)).toEqual({
      pilotReport: PASTED,
      maintenanceEntry: "",
    });
    expect(applyAtlRemarksText("TR_WITH_PIREM", `first\nsecond\n`)).toEqual({
      pilotReport: "first\nsecond\n",
      maintenanceEntry: "",
    });
  });

  it("keeps multiline text on the combined remarks field", () => {
    expect(applyAtlRemarksText("VOID", PASTED).pilotReport).toBe(PASTED);
  });

  it("keeps multiline maintenance text on the maintenance field", () => {
    expect(applyAtlRemarksText("PRF", PASTED)).toEqual({
      pilotReport: "",
      maintenanceEntry: PASTED,
    });
  });
});

describe("atlVisibleRemarksText", () => {
  it("round-trips typed, edited, and pasted Pilot Report lines", () => {
    const typed = applyAtlRemarksText("TR", "");
    const afterType = applyAtlRemarksText("TR", "LINE 1\n");
    const afterEdit = applyAtlRemarksText("TR", "LINE 1\nLINE 2");
    const afterPaste = applyAtlRemarksText("TR", PASTED);

    expect(atlVisibleRemarksText("TR", typed.pilotReport, typed.maintenanceEntry)).toBe(
      ""
    );
    expect(
      atlVisibleRemarksText(
        "TR",
        afterType.pilotReport,
        afterType.maintenanceEntry
      )
    ).toBe("LINE 1\n");
    expect(
      atlVisibleRemarksText(
        "TR",
        afterEdit.pilotReport,
        afterEdit.maintenanceEntry
      )
    ).toBe("LINE 1\nLINE 2");
    expect(
      atlVisibleRemarksText(
        "TR",
        afterPaste.pilotReport,
        afterPaste.maintenanceEntry
      )
    ).toBe(PASTED);
  });

  it("does not hide lines that used to be split into a second field", () => {
    const stored = "PILOT LINE\nSECOND LINE\nTHIRD LINE";
    const fields = applyAtlRemarksText("TR", stored);
    expect(atlVisibleRemarksText("TR", fields.pilotReport, fields.maintenanceEntry)).toBe(
      stored
    );
  });
});

describe("readAtlActionsTaken", () => {
  it("keeps multiline actions taken from either API key", () => {
    expect(readAtlActionsTaken({ actionsTaken: PASTED })).toBe(PASTED);
    expect(readAtlActionsTaken({ actionTaken: "first\nsecond\n" })).toBe(
      "first\nsecond\n"
    );
    expect(readAtlActionsTaken({ actions_taken: "one\r\ntwo" })).toBe("one\ntwo");
  });

  it("stays intact when the saved payload is uppercased", () => {
    const typed = normalizeMultilineText("oil leak\r\nsecured panel\n");
    expect(toUppercaseInput(typed)).toBe("OIL LEAK\nSECURED PANEL\n");
    const reloaded = applyAtlRemarksText("TR", toUppercaseInput(typed));
    expect(reloaded.pilotReport).toBe("OIL LEAK\nSECURED PANEL\n");
    expect(readAtlActionsTaken({ actionsTaken: toUppercaseInput(typed) })).toBe(
      "OIL LEAK\nSECURED PANEL\n"
    );
  });

  it("prefers a populated actionsTaken value", () => {
    expect(
      firstMultilineText("kept\nstill kept", "ignored")
    ).toBe("kept\nstill kept");
    expect(readAtlActionsTaken({ actionsTaken: "", actionTaken: "fallback\nline" })).toBe(
      "fallback\nline"
    );
  });
});
