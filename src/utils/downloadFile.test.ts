import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCsvContent,
  downloadBlobFile,
  downloadCsvFile,
  downloadXlsxFromAoa,
  escapeCsvCell,
} from "./downloadFile";

describe("escapeCsvCell", () => {
  it("quotes values and doubles inner quotes", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("buildCsvContent", () => {
  it("prefixes a UTF-8 BOM and joins escaped rows", () => {
    const csv = buildCsvContent([
      ["A", "B"],
      ["1", 'x"y'],
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"A","B"');
    expect(csv).toContain('"1","x""y"');
  });
});

describe("downloadBlobFile", () => {
  const click = vi.fn();
  const createObjectURL = vi.fn(() => "blob:test");
  const revokeObjectURL = vi.fn();
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    click.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") {
        return {
          href: "",
          download: "",
          rel: "",
          style: { display: "" },
          click,
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    });
    vi.spyOn(document.body, "appendChild").mockImplementation(
      (node) => node as Node
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      (node) => node as Node
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("clicks a download link and revokes the object URL", () => {
    downloadBlobFile(new Blob(["x"]), "file.csv");
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });

  it("still revokes the object URL if click throws", () => {
    click.mockImplementation(() => {
      throw new Error("extension intercept");
    });
    expect(() => downloadBlobFile(new Blob(["x"]), "file.csv")).toThrow(
      "extension intercept"
    );
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});

describe("spreadsheet helpers", () => {
  const click = vi.fn();
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    click.mockReset();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:sheet"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      if (tag === "a") {
        return {
          href: "",
          download: "",
          rel: "",
          style: { display: "" },
          click,
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    });
    vi.spyOn(document.body, "appendChild").mockImplementation(
      (node) => node as Node
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      (node) => node as Node
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("downloads CSV and XLSX without using extension messaging", () => {
    downloadCsvFile([["H"], ["v"]], "rows.csv");
    downloadXlsxFromAoa([["H"], ["v"]], "Sheet", "rows.xlsx");
    expect(click).toHaveBeenCalledTimes(2);
  });
});
