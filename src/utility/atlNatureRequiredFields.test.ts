import { describe, expect, it } from "vitest";
import {
  ATL_REQUIRED_FIELD_MESSAGE,
  assertAtlNatureRequiredFields,
  collectAtlNatureRequiredFieldErrors,
  natureRequiresPrfDetails,
  natureRequiresTachHobbsEnd,
} from "./atlNatureRequiredFields";

describe("collectAtlNatureRequiredFieldErrors", () => {
  it("requires Tach End and Hobbs End for TR and TR W/ PIREM", () => {
    for (const nature of ["TR", "TR_WITH_PIREM", "TR W/ PIREM"]) {
      expect(
        collectAtlNatureRequiredFieldErrors({
          natureOfFlight: nature,
          tachometerEnd: "",
          hobbsMeterEnd: null,
        })
      ).toEqual({
        tachometerEnd: ATL_REQUIRED_FIELD_MESSAGE,
        hobbsMeterEnd: ATL_REQUIRED_FIELD_MESSAGE,
      });
    }
  });

  it("requires Tach End and Hobbs End for EGR", () => {
    expect(
      collectAtlNatureRequiredFieldErrors({
        nature_of_flight: "EGR",
        tachometer_end: undefined,
        hobbs_meter_end: "  ",
      })
    ).toEqual({
      tachometerEnd: ATL_REQUIRED_FIELD_MESSAGE,
      hobbsMeterEnd: ATL_REQUIRED_FIELD_MESSAGE,
    });
  });

  it("allows 0 as a filled Tach/Hobbs End value", () => {
    expect(
      collectAtlNatureRequiredFieldErrors({
        natureOfFlight: "TR",
        tachometerEnd: 0,
        hobbsMeterEnd: "0",
      })
    ).toEqual({});
  });

  it("requires PRF off-blocks and RTS/pilot acceptance details", () => {
    expect(
      collectAtlNatureRequiredFieldErrors({
        natureOfFlight: "PRF",
        originDate: "",
        originTime: null,
        rtsSignedBy: 0,
        rtsDate: undefined,
        rtsTime: "",
        pilotFk: "",
        pilotAcceptDate: "  ",
        pilotAcceptTime: null,
      })
    ).toEqual({
      offBlocksDate: ATL_REQUIRED_FIELD_MESSAGE,
      offBlocksTime: ATL_REQUIRED_FIELD_MESSAGE,
      rtsSignedBy: ATL_REQUIRED_FIELD_MESSAGE,
      rtsDate: ATL_REQUIRED_FIELD_MESSAGE,
      rtsTime: ATL_REQUIRED_FIELD_MESSAGE,
      pilotFk: ATL_REQUIRED_FIELD_MESSAGE,
      pilotAcceptDate: ATL_REQUIRED_FIELD_MESSAGE,
      pilotAcceptTime: ATL_REQUIRED_FIELD_MESSAGE,
    });
  });

  it("accepts a complete PRF payload", () => {
    expect(
      collectAtlNatureRequiredFieldErrors({
        natureOfFlight: "PRF",
        originDate: "2026-09-22",
        originTime: "10:30",
        rts_signed_by: 12,
        rtsDate: "2026-09-22",
        rtsTime: "11:00",
        pilot_accepted_by: 8,
        pilotAcceptDate: "2026-09-22",
        pilotAcceptTime: "11:15",
      })
    ).toEqual({});
  });

  it("does not add extra required fields for PSF", () => {
    expect(
      collectAtlNatureRequiredFieldErrors({
        natureOfFlight: "PSF",
        tachometerEnd: "",
        originDate: "",
      })
    ).toEqual({});
  });

  it("treats omitted nature as TR on create", () => {
    expect(
      collectAtlNatureRequiredFieldErrors(
        { hobbsMeterEnd: "" },
        "create"
      ).hobbsMeterEnd
    ).toBe(ATL_REQUIRED_FIELD_MESSAGE);
  });

  it("skips nature rules on update when nature is omitted", () => {
    expect(
      collectAtlNatureRequiredFieldErrors(
        { work_status: "APPROVED", hobbsMeterEnd: "" },
        "update"
      )
    ).toEqual({});
  });
});

describe("assertAtlNatureRequiredFields", () => {
  it("throws a 422-style error that blocks save", () => {
    expect(() =>
      assertAtlNatureRequiredFields(
        { nature_of_flight: "TR", tachometer_end: null },
        "create"
      )
    ).toThrow(/required/i);
  });
});

describe("nature helpers", () => {
  it("flags TR/EGR meter natures and PRF details", () => {
    expect(natureRequiresTachHobbsEnd("TR")).toBe(true);
    expect(natureRequiresTachHobbsEnd("EGR")).toBe(true);
    expect(natureRequiresTachHobbsEnd("PRF")).toBe(false);
    expect(natureRequiresPrfDetails("PRF")).toBe(true);
    expect(natureRequiresPrfDetails("TR")).toBe(false);
  });
});
