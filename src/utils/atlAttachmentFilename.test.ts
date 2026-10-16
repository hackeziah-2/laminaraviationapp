import { describe, expect, it } from "vitest";
import {
  atlAttachmentFilename,
  originalFileExtension,
} from "./atlAttachmentFilename";

describe("atlAttachmentFilename", () => {
  it("keeps leading zeros and the original extension", () => {
    expect(
      atlAttachmentFilename({
        documentType: "ATL",
        sequenceNo: "00001",
        aircraftName: "RP-C1234",
        sourceFilename: "scan.PDF",
      })
    ).toBe("ATL 00001 - RP-C1234.PDF");

    expect(
      atlAttachmentFilename({
        documentType: "DFP",
        sequenceNo: "00001",
        aircraftName: "RP-C1234",
        sourceFilename: "uploads/dfp/photo.jpeg",
      })
    ).toBe("DFP 00001 - RP-C1234.jpeg");
  });

  it("does not turn a numeric-looking sequence into a shorter number", () => {
    expect(originalFileExtension("ATL.00001.pdf")).toBe("pdf");
    expect(
      atlAttachmentFilename({
        documentType: "ATL",
        sequenceNo: "00010",
        aircraftName: "RP-C20",
        sourceFilename: "note.png",
      })
    ).toBe("ATL 00010 - RP-C20.png");
  });
});
