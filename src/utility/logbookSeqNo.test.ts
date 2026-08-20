import { describe, expect, it } from "vitest";
import {
  getLogbookSeqNoPrefix,
  LOGBOOK_SEQ_NO_PREFIX,
} from "./logbookSeqNo";

describe("logbookSeqNo prefixes", () => {
  it("maps each maintenance logbook category", () => {
    expect(getLogbookSeqNoPrefix("AIRFRAME")).toBe("LAI-A-");
    expect(getLogbookSeqNoPrefix("AVIONICS")).toBe("LAI-AV-");
    expect(getLogbookSeqNoPrefix("ENGINE")).toBe("LAI-E-");
    expect(getLogbookSeqNoPrefix("PROPELLER")).toBe("LAI-P-");
    expect(LOGBOOK_SEQ_NO_PREFIX.AIRFRAME).toBe("LAI-A-");
  });
});
