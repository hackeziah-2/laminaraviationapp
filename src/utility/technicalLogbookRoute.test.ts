import { describe, expect, it } from "vitest";
import {
  buildTechnicalLogbookAtlRoute,
  mergeTechnicalLogbookAtlFilters,
  parseTechnicalLogbookAtlFilters,
  resolveTechnicalLogbookAtlRoute,
} from "./technicalLogbookRoute";

describe("technicalLogbookRoute", () => {
  it("parses direct search query params", () => {
    expect(
      parseTechnicalLogbookAtlFilters(
        "/technical-logbook",
        "?sequence_no=ATL-12&aircraft_id=7&atl_batch_fk=3"
      )
    ).toEqual({
      sequenceNo: "ATL-12",
      aircraftId: "7",
      atlBatchFk: "3",
    });
  });

  it("builds direct search route with all ATL filters", () => {
    expect(
      buildTechnicalLogbookAtlRoute({
        sequenceNo: "ATL-12",
        aircraftId: 7,
        atlBatchFk: 3,
      })
    ).toBe(
      "/technical-logbook?sequence_no=ATL-12&aircraft_id=7&atl_batch_fk=3"
    );
  });

  it("merges metadata URL filters with notification overrides", () => {
    const fromUrl = {
      sequenceNo: "ATL-1",
      aircraftId: "",
      atlBatchFk: "",
    };

    expect(
      mergeTechnicalLogbookAtlFilters(fromUrl, {
        aircraftId: 9,
        atlBatchFk: 4,
      })
    ).toEqual({
      sequenceNo: "ATL-1",
      aircraftId: "9",
      atlBatchFk: "4",
    });
  });

  it("fills missing metadata URL params from notification fields", () => {
    expect(
      resolveTechnicalLogbookAtlRoute("/technical-logbook", {
        sequenceNo: "ATL-55",
        aircraftId: 2,
        atlBatchFk: 8,
      })
    ).toBe(
      "/technical-logbook?sequence_no=ATL-55&aircraft_id=2&atl_batch_fk=8"
    );
  });

  it("keeps metadata URL filters and supplements missing values", () => {
    expect(
      resolveTechnicalLogbookAtlRoute(
        "/technical-logbook?sequence_no=ATL-55&aircraft_id=2",
        { atlBatchFk: 8 }
      )
    ).toBe(
      "/technical-logbook?sequence_no=ATL-55&aircraft_id=2&atl_batch_fk=8"
    );
  });
});
