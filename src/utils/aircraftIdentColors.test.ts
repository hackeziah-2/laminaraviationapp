import { beforeEach, describe, expect, it } from "vitest";
import {
  AIRCRAFT_IDENT_COLOR_STORAGE_KEY,
  RESERVED_AIRCRAFT_IDENT_COLORS,
  identColorContrast,
  resolveAircraftIdentStyles,
} from "./aircraftIdentColors";

const RESERVED_IDENTS = Object.keys(RESERVED_AIRCRAFT_IDENT_COLORS);

describe("aircraft ident colors", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses the fixed background for each existing aircraft", () => {
    const styles = resolveAircraftIdentStyles(RESERVED_IDENTS);
    for (const ident of RESERVED_IDENTS) {
      expect(styles[ident]?.backgroundColor).toBe(
        RESERVED_AIRCRAFT_IDENT_COLORS[ident]
      );
    }
  });

  it("keeps existing aircraft colors when spacing and letter case differ", () => {
    const styles = resolveAircraftIdentStyles([" rp-c12 ", "rp-c9012"]);
    expect(styles["RP-C12"]?.backgroundColor).toBe("#E1A491");
    expect(styles["RP-C9012"]?.backgroundColor).toBe("#DA99B8");
  });

  it("uses dark text with sufficient contrast on every existing color", () => {
    const styles = resolveAircraftIdentStyles(RESERVED_IDENTS);
    for (const ident of RESERVED_IDENTS) {
      const style = styles[ident];
      expect(style?.color).toBe("#111827");
      expect(
        identColorContrast(style.backgroundColor, style.color)
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives a new aircraft a color that no other aircraft is using", () => {
    const styles = resolveAircraftIdentStyles([...RESERVED_IDENTS, "RP-C7777"]);
    const assigned = styles["RP-C7777"]?.backgroundColor;
    expect(assigned).toBeTruthy();
    expect(Object.values(RESERVED_AIRCRAFT_IDENT_COLORS)).not.toContain(
      assigned
    );
    expect(
      identColorContrast(assigned, styles["RP-C7777"].color)
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("saves a new aircraft color and reuses it on the next visit", () => {
    const first = resolveAircraftIdentStyles(["RP-C4242"]);
    const saved = JSON.parse(
      localStorage.getItem(AIRCRAFT_IDENT_COLOR_STORAGE_KEY) ?? "{}"
    ) as Record<string, string>;
    expect(saved["RP-C4242"]).toBe(first["RP-C4242"].backgroundColor);

    const second = resolveAircraftIdentStyles(["RP-C5000", "RP-C4242"]);
    expect(second["RP-C4242"].backgroundColor).toBe(
      first["RP-C4242"].backgroundColor
    );
    expect(second["RP-C5000"].backgroundColor).not.toBe(
      second["RP-C4242"].backgroundColor
    );
  });

  it("does not let a saved value replace an existing aircraft color", () => {
    localStorage.setItem(
      AIRCRAFT_IDENT_COLOR_STORAGE_KEY,
      JSON.stringify({ "RP-C12": "#000000", "rp-c14": "#FFFFFF" })
    );
    const styles = resolveAircraftIdentStyles(["RP-C12", "RP-C14"]);
    expect(styles["RP-C12"].backgroundColor).toBe("#E1A491");
    expect(styles["RP-C14"].backgroundColor).toBe("#ADBDE2");
    const saved = JSON.parse(
      localStorage.getItem(AIRCRAFT_IDENT_COLOR_STORAGE_KEY) ?? "{}"
    ) as Record<string, string>;
    expect(saved["RP-C12"]).toBeUndefined();
    expect(saved["RP-C14"]).toBeUndefined();
  });

  it("replaces a saved color that already belongs to an existing aircraft", () => {
    localStorage.setItem(
      AIRCRAFT_IDENT_COLOR_STORAGE_KEY,
      JSON.stringify({ "RP-C4242": "#E1A491" })
    );
    const styles = resolveAircraftIdentStyles(["RP-C12", "RP-C4242"]);
    expect(styles["RP-C12"].backgroundColor).toBe("#E1A491");
    expect(styles["RP-C4242"].backgroundColor).not.toBe("#E1A491");
  });

  it("keeps a previously saved color for a new aircraft", () => {
    localStorage.setItem(
      AIRCRAFT_IDENT_COLOR_STORAGE_KEY,
      JSON.stringify({ "RP-C4242": "#C6D98A" })
    );
    const styles = resolveAircraftIdentStyles(["RP-C5000", "RP-C4242"]);
    expect(styles["RP-C4242"].backgroundColor).toBe("#C6D98A");
    expect(styles["RP-C5000"].backgroundColor).not.toBe("#C6D98A");
  });

  it("assigns a different readable color to each new aircraft", () => {
    const registrations = Array.from(
      { length: 24 },
      (_, index) => `RP-C${3000 + index}`
    );
    const styles = resolveAircraftIdentStyles([
      ...RESERVED_IDENTS,
      ...registrations,
    ]);
    const colors = registrations.map(
      (ident) => styles[ident].backgroundColor
    );
    expect(new Set(colors).size).toBe(colors.length);
    for (const ident of registrations) {
      expect(
        identColorContrast(
          styles[ident].backgroundColor,
          styles[ident].color
        )
      ).toBeGreaterThanOrEqual(4.5);
    }
    for (const reserved of Object.values(RESERVED_AIRCRAFT_IDENT_COLORS)) {
      expect(colors).not.toContain(reserved);
    }
  });
});
