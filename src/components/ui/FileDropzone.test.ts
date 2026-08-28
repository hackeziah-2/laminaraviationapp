import { describe, expect, it } from "vitest";
import {
  formatUploadFileSize,
  isSameSelectedFile,
  validateAtlUploadFile,
} from "./FileDropzone";

function makeFile(
  name: string,
  size: number,
  type = "application/pdf"
): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type, lastModified: 1 });
}

describe("validateAtlUploadFile", () => {
  it("accepts allowed types under 10MB", () => {
    expect(validateAtlUploadFile(makeFile("log.pdf", 1024))).toBeNull();
    expect(validateAtlUploadFile(makeFile("photo.PNG", 2048, "image/png"))).toBeNull();
  });

  it("rejects unsupported types", () => {
    expect(validateAtlUploadFile(makeFile("notes.txt", 100, "text/plain"))).toMatch(
      /not supported/i
    );
  });

  it("rejects files larger than 10MB", () => {
    expect(
      validateAtlUploadFile(makeFile("huge.pdf", 10 * 1024 * 1024 + 1))
    ).toMatch(/too large/i);
  });
});

describe("upload file helpers", () => {
  it("formats size for display", () => {
    expect(formatUploadFileSize(512)).toBe("512 B");
    expect(formatUploadFileSize(2048)).toBe("2.0 KB");
    expect(formatUploadFileSize(1048576)).toBe("1.0 MB");
  });

  it("detects the same selected file to prevent duplicate apply", () => {
    const a = makeFile("atl.pdf", 100);
    const b = makeFile("atl.pdf", 100);
    expect(isSameSelectedFile(a, b)).toBe(true);
    expect(isSameSelectedFile(a, makeFile("other.pdf", 100))).toBe(false);
    expect(isSameSelectedFile(null, a)).toBe(false);
  });
});
