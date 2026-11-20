import { describe, expect, it } from "vitest";
import {
  ATL_DATE_REQUIRED_MESSAGE,
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
          originDate: "2026-09-22",
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
        origin_date: "2026-09-22",
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
        originDate: "2026-09-22",
      })
    ).toEqual({});
  });

  it("requires PRF signature names and does not accept an untouched blank", () => {
    expect(
      collectAtlNatureRequiredFieldErrors({
        natureOfFlight: "PRF",
        originDate: "",
        originTime: null,
        rtsSignedBy: "",
        rtsDate: undefined,
        rtsTime: "",
        pilotFk: null,
        pilotAcceptDate: "  ",
        pilotAcceptTime: null,
      })
    ).toEqual({
      offBlocksDate: ATL_DATE_REQUIRED_MESSAGE,
      offBlocksTime: ATL_REQUIRED_FIELD_MESSAGE,
      rtsSignedBy: ATL_REQUIRED_FIELD_MESSAGE,
      pilotFk: ATL_REQUIRED_FIELD_MESSAGE,
    });
  });

  it("accepts explicit None for PRF signatures when Off-Blocks is filled", () => {
    expect(
      collectAtlNatureRequiredFieldErrors({
        natureOfFlight: "PRF",
        originDate: "2026-09-22",
        originTime: "10:30",
        rtsSignedBy: "None",
        rtsDate: "",
        rtsTime: null,
        pilot_accepted_by: " none ",
        pilotAcceptDate: "",
        pilotAcceptTime: "  ",
      })
    ).toEqual({});
    expect(
      collectAtlNatureRequiredFieldErrors(
        {
          natureOfFlight: "PRF",
          originDate: "2026-09-22",
          originTime: "10:30",
          rts_signed_by: "None",
          pilotFk: "None",
        },
        "update"
      )
    ).toEqual({});
  });

  it("rejects an untouched PRF signature on update", () => {
    expect(
      collectAtlNatureRequiredFieldErrors(
        {
          natureOfFlight: "PRF",
          originDate: "2026-09-22",
          originTime: "10:30",
          rts_signed_by: null,
          pilotFk: "",
        },
        "update"
      )
    ).toEqual({
      rtsSignedBy: ATL_REQUIRED_FIELD_MESSAGE,
      pilotFk: ATL_REQUIRED_FIELD_MESSAGE,
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
        originDate: "2026-09-22",
      })
    ).toEqual({});
  });

  it("requires the entry date for every nature of flight", () => {
    for (const nature of ["TR", "TR W/ PIREM", "EGR", "PRF", "PSF", "VOID"]) {
      expect(
        collectAtlNatureRequiredFieldErrors({
          natureOfFlight: nature,
          originDate: "",
          tachometerEnd: "1",
          hobbsMeterEnd: "1",
          originTime: "10:00",
          rtsSignedBy: 4,
          rtsDate: "2026-09-22",
          rtsTime: "10:30",
          pilotFk: 8,
          pilotAcceptDate: "2026-09-22",
          pilotAcceptTime: "11:00",
        }).offBlocksDate
      ).toBe(ATL_DATE_REQUIRED_MESSAGE);
    }
  });

  it("requires a blank entry date on update for every nature", () => {
    expect(
      collectAtlNatureRequiredFieldErrors(
        { natureOfFlight: "PSF", originDate: "  " },
        "update"
      )
    ).toEqual({ offBlocksDate: ATL_DATE_REQUIRED_MESSAGE });
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
        {
          nature_of_flight: "TR",
          tachometer_end: null,
          origin_date: "2026-09-22",
        },
        "create"
      )
    ).toThrow(/required/i);
  });

  it("blocks a PRF save when a signature name was left untouched", () => {
    expect(() =>
      assertAtlNatureRequiredFields(
        {
          nature_of_flight: "PRF",
          origin_date: "2026-09-22",
          origin_time: "10:30",
          rts_signed_by: null,
          pilot_accepted_by: "",
        },
        "create"
      )
    ).toThrow(/required/i);
    expect(() =>
      assertAtlNatureRequiredFields(
        {
          nature_of_flight: "PRF",
          origin_date: "2026-09-22",
          origin_time: "10:30",
          rts_signed_by: "None",
          pilot_fk: "None",
        },
        "update"
      )
    ).not.toThrow();
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
