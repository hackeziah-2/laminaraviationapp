import { describe, expect, it } from "vitest";
import {
  mimeFromFilename,
  preparePreviewBlob,
  resolveModuleDownloadPath,
} from "./moduleFilePreview";

describe("resolveModuleDownloadPath", () => {
  it("keeps each module file distinct after stripping its own folder", () => {
    expect(
      resolveModuleDownloadPath("white_atl", "white_atl/scan-atl.pdf")
    ).toBe("scan-atl.pdf");
    expect(resolveModuleDownloadPath("dfp", "dfp/flight-dfp.jpg")).toBe(
      "flight-dfp.jpg"
    );
  });

  it("uses the file after a copied download url", () => {
    expect(
      resolveModuleDownloadPath(
        "white_atl",
        "/api/v1/white_atl/download/white-atl.pdf"
      )
    ).toBe("white-atl.pdf");
  });
});

describe("preparePreviewBlob", () => {
  it("retypes an octet-stream PDF so the modal can render it", async () => {
    const source = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], {
      type: "application/octet-stream",
    });
    const prepared = await preparePreviewBlob(source, "white-atl.bin");
    expect(prepared.mimeType).toBe("application/pdf");
    expect(prepared.blob.type).toBe("application/pdf");
  });

  it("retypes an image from the selected filename", async () => {
    const source = new Blob([new Uint8Array([1, 2, 3, 4])], {
      type: "application/octet-stream",
    });
    const prepared = await preparePreviewBlob(source, "dfp/photo.PNG");
    expect(prepared.mimeType).toBe("image/png");
    expect(prepared.blob.type).toBe("image/png");
  });

  it("rejects an error body instead of previewing it", async () => {
    const source = new Blob(['{"detail":"File not found"}'], {
      type: "application/json",
    });
    await expect(preparePreviewBlob(source, "missing.pdf")).rejects.toThrow(
      "File not found"
    );
  });
});

describe("mimeFromFilename", () => {
  it("maps White ATL and DFP extensions", () => {
    expect(mimeFromFilename("white_atl/card.jpeg")).toBe("image/jpeg");
    expect(mimeFromFilename("sheet.pdf")).toBe("application/pdf");
  });
});
