import { describe, expect, it } from "vitest";
import {
  ATL_FORM_UPPERCASE_SKIP_KEYS,
  COMPONENT_RECORD_UPPERCASE_SKIP_KEYS,
  MAINTENANCE_LOGBOOK_FORM_UPPERCASE_SKIP_KEYS,
  toUppercaseInput,
  uppercaseComponentRecords,
  uppercaseOptionalText,
  uppercaseRecordStringFields,
  wrapUppercaseFormSetter,
} from "./uppercaseTextInput";

describe("toUppercaseInput", () => {
  it("uppercases mixed-case letters", () => {
    expect(toUppercaseInput("rnav approach")).toBe("RNAV APPROACH");
  });

  it("leaves already-uppercase text unchanged", () => {
    expect(toUppercaseInput("OIL LEAK")).toBe("OIL LEAK");
  });

  it("leaves digits, punctuation, and empty strings unchanged", () => {
    expect(toUppercaseInput("12.50")).toBe("12.50");
    expect(toUppercaseInput("")).toBe("");
    expect(toUppercaseInput("P/N-123")).toBe("P/N-123");
  });
});

describe("uppercaseRecordStringFields", () => {
  it("uppercases text keys and skips denylisted keys", () => {
    const next = uppercaseRecordStringFields(
      {
        description: "oil leak",
        webLink: "https://example.com/Path",
        qty: "2",
      },
      new Set(["webLink"])
    );
    expect(next.description).toBe("OIL LEAK");
    expect(next.webLink).toBe("https://example.com/Path");
    expect(next.qty).toBe("2");
  });

  it("does not alter non-string values", () => {
    const file = new File(["x"], "photo.png");
    const next = uppercaseRecordStringFields(
      { whiteAtl: file, count: 3, empty: null },
      new Set()
    );
    expect(next.whiteAtl).toBe(file);
    expect(next.count).toBe(3);
    expect(next.empty).toBeNull();
  });
});

describe("uppercase skip sets", () => {
  it("skips ATL URLs, dates, and ids", () => {
    expect(ATL_FORM_UPPERCASE_SKIP_KEYS.has("whiteAtlWebLink")).toBe(true);
    expect(ATL_FORM_UPPERCASE_SKIP_KEYS.has("offBlocksDate")).toBe(true);
    expect(ATL_FORM_UPPERCASE_SKIP_KEYS.has("seqNo")).toBe(true);
    expect(ATL_FORM_UPPERCASE_SKIP_KEYS.has("fuelQtyLeftUpliftQty")).toBe(true);
    expect(ATL_FORM_UPPERCASE_SKIP_KEYS.has("offBlocksStation")).toBe(false);
    expect(ATL_FORM_UPPERCASE_SKIP_KEYS.has("pilotReport")).toBe(false);
  });

  it("skips maintenance logbook ids, dates, numbers, and web links", () => {
    expect(MAINTENANCE_LOGBOOK_FORM_UPPERCASE_SKIP_KEYS.has("webLink")).toBe(
      true
    );
    expect(MAINTENANCE_LOGBOOK_FORM_UPPERCASE_SKIP_KEYS.has("logbookSeqNo")).toBe(
      true
    );
    expect(MAINTENANCE_LOGBOOK_FORM_UPPERCASE_SKIP_KEYS.has("description")).toBe(
      false
    );
    expect(COMPONENT_RECORD_UPPERCASE_SKIP_KEYS.has("qty")).toBe(true);
    expect(COMPONENT_RECORD_UPPERCASE_SKIP_KEYS.has("nomenclature")).toBe(false);
  });
});

describe("uppercaseOptionalText", () => {
  it("returns undefined for nullish and uppercases strings", () => {
    expect(uppercaseOptionalText(undefined)).toBeUndefined();
    expect(uppercaseOptionalText("leak")).toBe("LEAK");
  });
});

describe("wrapUppercaseFormSetter", () => {
  it("uppercases object and functional updates while skipping denylisted keys", () => {
    let state = { description: "oil leak", webLink: "https://example.com/Path" };
    const setState = (
      update:
        | typeof state
        | ((prev: typeof state) => typeof state)
    ) => {
      state =
        typeof update === "function" ? update(state) : update;
    };
    const setFormData = wrapUppercaseFormSetter(
      setState,
      new Set(["webLink"])
    );

    setFormData({ description: "rnav approach", webLink: "https://Keep/Case" });
    expect(state).toEqual({
      description: "RNAV APPROACH",
      webLink: "https://Keep/Case",
    });

    setFormData((prev) => ({ ...prev, description: "oil leak" }));
    expect(state.description).toBe("OIL LEAK");
    expect(state.webLink).toBe("https://Keep/Case");
  });
});

describe("uppercaseComponentRecords", () => {
  it("uppercases part text and leaves ids and qty unchanged", () => {
    const next = uppercaseComponentRecords([
      {
        id: "cr-keep",
        qty: "2",
        unit: "ea",
        nomenclature: "oil filter",
      },
    ]);
    expect(next[0]).toEqual({
      id: "cr-keep",
      qty: "2",
      unit: "EA",
      nomenclature: "OIL FILTER",
    });
  });
});
