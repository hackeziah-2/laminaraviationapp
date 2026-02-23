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
      if (hoursNum >= 0 && hoursNum <= 23 && minutesNum >= 0 && minutesNum <= 59) {
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
        if (hoursNum >= 0 && hoursNum <= 23 && minutesNum >= 0 && minutesNum <= 59) {
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
export function formatTimeZuluMilitary(timeStr: string | undefined | null): string {
  const formatted = formatTimeZulu(timeStr);
  if (formatted === "-") return "-";
  return formatted.replace(":", "");
}

/**
 * Compute total block time from origin and destination times (HHMM format).
 * @returns Time in H:MM format or "0" if invalid/empty
 */
export function computeTotalBlockTime(
  originTime: string | undefined,
  destinationTime: string | undefined
): string {
  if (!originTime || !destinationTime) return "0";
  const parseMinutes = (t: string): number => {
    const cleaned = String(t).replace(/[: ]/g, "");
    if (cleaned.length !== 4 || !/^\d{4}$/.test(cleaned)) return -1;
    const h = parseInt(cleaned.substring(0, 2), 10);
    const m = parseInt(cleaned.substring(2, 4), 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
    return h * 60 + m;
  };
  const start = parseMinutes(originTime);
  const end = parseMinutes(destinationTime);
  if (start === -1 || end === -1) return "0";
  let diff = end - start;
  if (diff < 0) diff += 1440;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return `${hrs}:${mins.toString().padStart(2, "0")}`;
}
