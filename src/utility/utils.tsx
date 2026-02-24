export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function snakeAllKeys<T>(data: T): any {
  if (Array.isArray(data)) {
    return data.map((item) => snakeAllKeys(item));
  }

  if (data !== null && typeof data === "object") {
    const result: Record<string, any> = {};

    Object.entries(data as Record<string, any>).forEach(([key, value]) => {
      const newKey = camelToSnake(key);
      result[newKey] = snakeAllKeys(value);
    });

    return result;
  }

  return data;
}

export function toCamel<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const key in obj) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = obj[key];
  }
  return result;
}

export const dateToday = new Date().toISOString().split("T")[0];

/**
 * Format time from API to HH:MM format (24-hour)
 * @param timeStr - Time string in HHMM format (4 digits) or HH:MM format
 * @returns Formatted time string in HH:MM format or "-" if invalid/empty
 */
export function formatTimeZulu(timeStr: string | undefined | null): string {
  if (!timeStr) return "-";
  try {
    // Remove any existing "Z" suffix, colons, and whitespace
    const cleaned = timeStr.replace(/[Z\s:]/g, "");

    // Handle HHMM format (4 digits) - convert to HH:MM
    if (cleaned.length === 4 && /^\d{4}$/.test(cleaned)) {
      const hours = cleaned.substring(0, 2);
      const minutes = cleaned.substring(2, 4);
      // Validate hours (0-23) and minutes (0-59)
      const hoursNum = parseInt(hours, 10);
      const minutesNum = parseInt(minutes, 10);
      if (
        hoursNum >= 0 &&
        hoursNum <= 23 &&
        minutesNum >= 0 &&
        minutesNum <= 59
      ) {
        return `${hours}:${minutes}`;
      }
    }

    // Handle HH:MM format - return as is (after validation)
    if (timeStr.includes(":")) {
      const parts = timeStr.split(":");
      if (parts.length >= 2) {
        const hours = parts[0].padStart(2, "0");
        const minutes = parts[1].padStart(2, "0");
        // Validate hours (0-23) and minutes (0-59)
        const hoursNum = parseInt(hours, 10);
        const minutesNum = parseInt(minutes, 10);
        if (
          hoursNum >= 0 &&
          hoursNum <= 23 &&
          minutesNum >= 0 &&
          minutesNum <= 59
        ) {
          return `${hours}:${minutes}`;
        }
      }
    }

    return "-";
  } catch {
    return "-";
  }
}

/**
 * Format time for VIEW as military time (24-hour, 4 digits HHMM, no colon)
 * e.g. "14:30" -> "1430", "23:17" -> "2317"
 */
export function formatTimeZuluMilitary(
  timeStr: string | undefined | null
): string {
  const formatted = formatTimeZulu(timeStr);
  if (formatted === "-") return "-";
  return formatted.replace(":", "");
}

/**
 * Parse Zulu time to minutes since midnight.
 * Supports: HH:MM, HHMM, HH:MM:SS, HHMMSS, full ISO (YYYY-MM-DDTHH:MM:SS).
 */
function parseZuluTimeToMinutes(t: string): number {
  const s = String(t || "").trim();
  if (!s) return -1;

  // Full ISO or datetime: extract time part
  const isoMatch = s.match(/T(\d{1,2}):?(\d{2})(?::?(\d{2}))?/);
  if (isoMatch) {
    const h = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
  }

  // Time-only: HH:MM, HH:MM:SS, HHMM, HHMMSS
  const cleaned = s.replace(/[Z\s]/g, "").replace(/:/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length >= 4) {
    const h = parseInt(digits.slice(0, 2), 10);
    const m = parseInt(digits.slice(2, 4), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
  }

  return -1;
}

/**
 * Compute total flight time (decimal hours) from origin and destination Zulu times.
 * Formula: DESTINATION TIME - ORIGIN TIME
 * @returns Decimal hours (e.g. 2.25) or 0 if invalid/empty
 */
export function computeTotalFlightHoursDecimal(
  originTime?: string,
  destinationTime?: string
): number {
  if (!originTime || !destinationTime) return 0;

  const start = parseZuluTimeToMinutes(originTime);
  const end = parseZuluTimeToMinutes(destinationTime);
  if (start === -1 || end === -1) return 0;

  let diff = end - start;
  if (diff < 0) diff += 1440;

  return Math.round((diff / 60) * 100) / 100;
}

/**
 * Compute total block time from origin and destination Zulu times.
 * Formula: DESTINATION TIME - ORIGIN TIME
 * @returns Time in H:MM format or "0" if invalid/empty
 */
export function computeTotalBlockTime(
  originTime: string | undefined,
  destinationTime: string | undefined
): string {
  if (!originTime || !destinationTime) return "0";

  const start = parseZuluTimeToMinutes(originTime);
  const end = parseZuluTimeToMinutes(destinationTime);
  if (start === -1 || end === -1) return "0";

  let diff = end - start;
  if (diff < 0) diff += 1440;

  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hrs}:${mins.toString().padStart(2, "0")}`;
}
