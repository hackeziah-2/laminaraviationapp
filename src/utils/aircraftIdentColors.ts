/**
 * Background color for the Aircraft Fleet Daily Update A/C IDENT cell.
 * Existing registrations keep a fixed color. Any other registration receives
 * a color that is still free, and that choice is saved so the same aircraft
 * keeps it after refresh and on every later visit.
 */

export const AIRCRAFT_IDENT_COLOR_STORAGE_KEY = "laminar-aircraft-ident-colors";

/** Colors assigned to the current fleet. These are never given to another aircraft. */
export const RESERVED_AIRCRAFT_IDENT_COLORS: Readonly<Record<string, string>> = {
  "RP-C12": "#E1A491",
  "RP-C14": "#ADBDE2",
  "RP-C20": "#F6C695",
  "RP-C4088": "#FDA262",
  "RP-C603": "#97BCE3",
  "RP-C5288": "#AB98D2",
  "RP-C9012": "#DA99B8",
};

/**
 * Next colors for aircraft that are not in the reserved list.
 * Each one stays visually apart from the reserved colors and from the others.
 */
const NEW_AIRCRAFT_IDENT_COLORS = [
  "#C6D98A",
  "#8FCB8F",
  "#7DCFB6",
  "#D6C56A",
  "#B7A48A",
  "#E8C0D4",
  "#B5C9A8",
  "#DDE6B0",
  "#B8E0C8",
  "#F2E27A",
] as const;

const TEXT_DARK = "#111827";
const TEXT_LIGHT = "#FFFFFF";
/** New colors stay at least this far, in RGB distance, from colors already in use. */
const MIN_ASSIGN_DISTANCE = 32;

export type AircraftIdentStyle = {
  backgroundColor: string;
  color: string;
};

export function normalizeAircraftIdent(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#([0-9A-F]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function normalizeHex(value: string): string | null {
  const rgb = hexToRgb(value);
  if (!rgb) return null;
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function srgbChannel(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [red, green, blue] = rgb;
  return (
    0.2126 * srgbChannel(red) +
    0.7152 * srgbChannel(green) +
    0.0722 * srgbChannel(blue)
  );
}

/** WCAG contrast ratio. Returns 1 when either color is not a 6-digit hex. */
export function identColorContrast(background: string, foreground: string): number {
  const backgroundLuminance = relativeLuminance(background);
  const foregroundLuminance = relativeLuminance(foreground);
  if (backgroundLuminance == null || foregroundLuminance == null) return 1;
  const lighter = Math.max(backgroundLuminance, foregroundLuminance);
  const darker = Math.min(backgroundLuminance, foregroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Dark text on the fleet pastels; white text when a saved color is dark. */
export function identTextColor(backgroundColor: string): string {
  const dark = identColorContrast(backgroundColor, TEXT_DARK);
  const light = identColorContrast(backgroundColor, TEXT_LIGHT);
  return dark >= light ? TEXT_DARK : TEXT_LIGHT;
}

function colorDistance(left: string, right: string): number {
  const leftRgb = hexToRgb(left);
  const rightRgb = hexToRgb(right);
  if (!leftRgb || !rightRgb) return 0;
  return Math.hypot(
    leftRgb[0] - rightRgb[0],
    leftRgb[1] - rightRgb[1],
    leftRgb[2] - rightRgb[2]
  );
}

function minDistance(hex: string, others: readonly string[]): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (const other of others) {
    const distance = colorDistance(hex, other);
    if (distance < nearest) nearest = distance;
  }
  return nearest;
}

function contrastIsReadable(hex: string): boolean {
  return (
    identColorContrast(hex, TEXT_DARK) >= 4.5 ||
    identColorContrast(hex, TEXT_LIGHT) >= 4.5
  );
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
}

function takeNextColor(used: string[]): string {
  for (const candidate of NEW_AIRCRAFT_IDENT_COLORS) {
    if (used.includes(candidate)) continue;
    if (minDistance(candidate, used) < MIN_ASSIGN_DISTANCE) continue;
    if (!contrastIsReadable(candidate)) continue;
    return candidate;
  }

  for (const minGap of [MIN_ASSIGN_DISTANCE, 24, 16, 8]) {
    for (let index = 0; index < 720; index += 1) {
      const hue = (index * 137.508) % 360;
      const saturation = 34 + (index % 4) * 8;
      const lightness = 70 + (index % 3) * 4;
      const hex = hslToHex(hue, saturation, lightness);
      if (used.includes(hex)) continue;
      if (minDistance(hex, used) < minGap) continue;
      if (!contrastIsReadable(hex)) continue;
      return hex;
    }
  }

  for (let index = used.length; index < used.length + 4096; index += 1) {
    const hex = `#${((index * 9973) & 0xffffff).toString(16).padStart(6, "0")}`.toUpperCase();
    if (!used.includes(hex) && contrastIsReadable(hex)) return hex;
  }

  return "#C6D98A";
}

function readStoredColors(): { colors: Record<string, string>; dirty: boolean } {
  try {
    const raw = localStorage.getItem(AIRCRAFT_IDENT_COLOR_STORAGE_KEY);
    if (!raw) return { colors: {}, dirty: false };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { colors: {}, dirty: true };
    }
    const colors: Record<string, string> = {};
    let dirty = false;
    for (const [key, value] of Object.entries(parsed)) {
      const ident = normalizeAircraftIdent(key);
      if (!ident || RESERVED_AIRCRAFT_IDENT_COLORS[ident] || typeof value !== "string") {
        dirty = true;
        continue;
      }
      const hex = normalizeHex(value);
      if (!hex) {
        dirty = true;
        continue;
      }
      if (key !== ident || value.toUpperCase() !== hex || colors[ident]) dirty = true;
      colors[ident] = hex;
    }
    return { colors, dirty };
  } catch {
    return { colors: {}, dirty: false };
  }
}

function writeStoredColors(colors: Record<string, string>): void {
  try {
    localStorage.setItem(
      AIRCRAFT_IDENT_COLOR_STORAGE_KEY,
      JSON.stringify(colors)
    );
  } catch {
    // Private-mode or quota failures still color the current view.
  }
}

function sameColorMap(
  left: Record<string, string>,
  right: Record<string, string>
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
}

function styleFor(backgroundColor: string): AircraftIdentStyle {
  return {
    backgroundColor,
    color: identTextColor(backgroundColor),
  };
}

/**
 * Colors for the registrations on screen.
 * Reserved aircraft always receive their fixed color.
 * A new registration receives the next free color, which is then saved.
 */
export function resolveAircraftIdentStyles(
  registrations: readonly unknown[]
): Record<string, AircraftIdentStyle> {
  const { colors: stored, dirty } = readStoredColors();
  const used = Object.values(RESERVED_AIRCRAFT_IDENT_COLORS).map((color) =>
    color.toUpperCase()
  );
  const nextStored: Record<string, string> = {};
  const needsColor: string[] = [];

  for (const key of Object.keys(stored)) {
    const color = stored[key];
    if (used.includes(color)) {
      needsColor.push(key);
      continue;
    }
    nextStored[key] = color;
    used.push(color);
  }

  for (const key of needsColor) {
    const color = takeNextColor(used);
    nextStored[key] = color;
    used.push(color);
  }

  const seen = new Set<string>();
  for (const registration of registrations) {
    const ident = normalizeAircraftIdent(registration);
    if (!ident || ident === "-" || RESERVED_AIRCRAFT_IDENT_COLORS[ident]) continue;
    if (nextStored[ident] || seen.has(ident)) continue;
    seen.add(ident);
    const color = takeNextColor(used);
    nextStored[ident] = color;
    used.push(color);
  }

  if (dirty || !sameColorMap(stored, nextStored)) {
    writeStoredColors(nextStored);
  }

  const styles: Record<string, AircraftIdentStyle> = {};
  for (const registration of registrations) {
    const ident = normalizeAircraftIdent(registration);
    if (!ident || ident === "-") continue;
    const reserved = RESERVED_AIRCRAFT_IDENT_COLORS[ident];
    const backgroundColor = reserved ?? nextStored[ident];
    if (!backgroundColor) continue;
    styles[ident] = styleFor(backgroundColor);
  }
  return styles;
}
