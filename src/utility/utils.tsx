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

/** Recursively snake_case → camelCase for nested API objects (e.g. engine.tso). */
export function toCamelDeep(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => toCamelDeep(item));
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value;
  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) =>
      c.toUpperCase()
    );
    const v = obj[key];
    if (Array.isArray(v)) {
      result[camelKey] = v.map((item) => toCamelDeep(item));
    } else if (
      v !== null &&
      typeof v === "object" &&
      !(v instanceof Date)
    ) {
      result[camelKey] = toCamelDeep(v);
    } else {
      result[camelKey] = v;
    }
  }
  return result;
}

export const dateToday = new Date().toISOString().split("T")[0];

/** Empty is allowed; otherwise must be a valid http(s) URL. */
export function isValidWebLink(value: string | null | undefined): boolean {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return true;
  try {
    const url =
      v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Normalize Web Link for API: valid URL string or null. Adds https:// if missing. */
export function normalizeWebLink(value: string | null | undefined): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  try {
    const url =
      v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`;
    new URL(url);
    return url;
  } catch {
    return null;
  }
}

/** Restrict typing to digits and at most one decimal point (integer/float entry). */
export function sanitizeIntegerOrFloatInput(raw: string): string {
  let s = String(raw ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s =
      s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s;
}

/** True when empty or a complete integer/float (rejects incomplete values like `12.`). */
export function isOptionalIntegerOrFloat(
  value: string | null | undefined
): boolean {
  const s = String(value ?? "").trim();
  if (!s) return true;
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)) return false;
  return Number.isFinite(parseFloat(s));
}

/** Parse a date string for display (ISO date, datetime, or parseable value). */
export function parseDisplayDate(
  value: string | null | undefined
): Date | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;

  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?/);
  if (isoDate) {
    const y = Number(isoDate[1]);
    const m = Number(isoDate[2]);
    const day = Number(isoDate[3]);
    const d = new Date(y, m - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const d = new Date(year, month - 1, day);
      if (
        d.getFullYear() === year &&
        d.getMonth() === month - 1 &&
        d.getDate() === day
      ) {
        return d;
      }
    }
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a Date as dd/mm/yyyy (en-GB). */
export function formatDisplayDateFromDate(
  d: Date,
  options?: { timeZone?: string }
): string {
  if (Number.isNaN(d.getTime())) return "-";
  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  if (options?.timeZone) opts.timeZone = options.timeZone;
  return d.toLocaleDateString("en-GB", opts);
}

/** Placeholder / prompt for date text inputs (display format). */
export const DISPLAY_DATE_PLACEHOLDER = "DD/MM/YYYY";

/** Hint for date field labels and tooltips. */
export const DISPLAY_DATE_FORMAT_HINT =
  "Display: DD/MM/YYYY · Saved as YYYY-MM-DD";

/**
 * Format digits while typing into DD/MM/YYYY (max 8 digits: ddmmyyyy).
 */
export function formatDateInputDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** True when display text is a full DD/MM/YYYY value (10 characters). */
export function isCompleteDisplayDate(value: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(value.trim());
}

/** Normalize typed or pasted text to DD/MM/YYYY display. */
export function normalizeDateInputText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Complete display dates and ISO/API pastes normalize to canonical DD/MM/YYYY.
  if (
    isCompleteDisplayDate(trimmed) ||
    /^\d{4}-\d{2}-\d{2}/.test(trimmed)
  ) {
    const api = formatDateForApi(trimmed);
    if (api) return apiDateToDisplay(api);
  }

  return formatDateInputDisplay(trimmed);
}

/**
 * Normalize any supported date string to YYYY-MM-DD for API payloads and DateInput value.
 */
export function formatDateForApi(
  value: string | null | undefined
): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s || s === "-" || s === "—") return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const probe = new Date(year, month - 1, day);
      if (
        probe.getFullYear() === year &&
        probe.getMonth() === month - 1 &&
        probe.getDate() === day
      ) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  const d = parseDisplayDate(s);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD → DD/MM/YYYY for DateInput text display. */
export function apiDateToDisplay(value: string | null | undefined): string {
  const api = formatDateForApi(value);
  if (!api) return "";
  const [y, m, d] = api.split("-");
  if (!y || !m || !d) return formatDisplayDate(api, { fallback: "" });
  return `${d}/${m}/${y}`;
}

/** Format a date value for display as dd/mm/yyyy. */
export function formatDisplayDate(
  value: string | null | undefined,
  options?: { fallback?: string }
): string {
  const fallback = options?.fallback ?? "-";
  const trimmed = value != null ? String(value).trim() : "";
  if (!trimmed) return fallback;
  const d = parseDisplayDate(trimmed);
  if (!d) return trimmed;
  return formatDisplayDateFromDate(d);
}

/** Format a date-time value: dd/mm/yyyy, HH:MM (24h, en-GB). */
export function formatDisplayDateTime(
  value: string | null | undefined,
  options?: { fallback?: string }
): string {
  const fallback = options?.fallback ?? "-";
  const trimmed = value != null ? String(value).trim() : "";
  if (!trimmed) return fallback;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Parse ATL API `date_time_reported` / ISO strings as UTC (Zulu). */
function parseAtlDateTimeAsUtc(raw: string): Date | null {
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/i);
  if (m) {
    const hh = m[2].padStart(2, "0");
    const mm = m[3].padStart(2, "0");
    const ss = (m[4] || "00").padStart(2, "0");
    const d = new Date(`${m[1]}T${hh}:${mm}:${ss}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const normalized = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)
    ? s
    : `${s.replace(/\.\d+$/, "")}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

const ATL_DATE_REPORTED_LOCALE = "en-PH";
const ATL_DATE_REPORTED_TIME_ZONE = "Asia/Manila";

/** Shared en-PH / Asia/Manila realtime datetime format (24-hour, with seconds). */
export const PHILIPPINES_DATETIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions =
  {
    timeZone: ATL_DATE_REPORTED_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };

/** Current Philippines datetime string — use for live display and create/update stamps. */
export function formatPhilippinesDateTime(now = new Date()): string {
  return now.toLocaleString(
    ATL_DATE_REPORTED_LOCALE,
    PHILIPPINES_DATETIME_FORMAT_OPTIONS
  );
}

/** Parse ATL `date_time_reported` — naive datetimes are Asia/Manila local. */
function parseAtlDateTimeReported(raw: string): Date | null {
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00+08:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/i);
  if (m) {
    const hh = m[2].padStart(2, "0");
    const mm = m[3].padStart(2, "0");
    const ss = (m[4] || "00").padStart(2, "0");
    const d = new Date(`${m[1]}T${hh}:${mm}:${ss}+08:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ATL Date Reported display (Philippines / Asia-Manila), e.g. "06/03/2024, 22:30:45".
 */
export function formatAtlDateReportedManila(raw?: string | null): string {
  if (raw == null || String(raw).trim() === "") return "-";
  const d = parseAtlDateTimeReported(String(raw).trim());
  if (!d) return String(raw).trim();
  return d.toLocaleString(
    ATL_DATE_REPORTED_LOCALE,
    PHILIPPINES_DATETIME_FORMAT_OPTIONS
  );
}

/**
 * Operation ATL list view date: DD-MM-YYYY.
 */
export function formatAtlListDate(
  raw?: string | null,
  emptyLabel = "-"
): string {
  if (raw == null || String(raw).trim() === "") return emptyLabel;
  const api = formatDateForApi(String(raw));
  if (!api) return String(raw).trim();
  const [y, m, d] = api.split("-");
  if (!y || !m || !d) return String(raw).trim();
  return `${d}-${m}-${y}`;
}

/**
 * Operation ATL list view datetime: DD-MM-YYYY | HH:MM (Asia/Manila, 24h).
 */
export function formatAtlListDateTime(
  raw?: string | null,
  emptyLabel = "-"
): string {
  if (raw == null || String(raw).trim() === "") return emptyLabel;
  const d = parseAtlDateTimeReported(String(raw).trim());
  if (!d) return String(raw).trim();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ATL_DATE_REPORTED_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} | ${get("hour")}:${get("minute")}`;
}

/** Current Date Reported string (en-PH, Asia/Manila) — e.g. for live display. */
export function formatAtlDateReportedManilaNow(now = new Date()): string {
  return formatPhilippinesDateTime(now);
}

/** Date/time parts in Asia/Manila for ATL Date Reported auto-set on upload/submit. */
export function getManilaDateTimeParts(now = new Date()): {
  date: string;
  time: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ATL_DATE_REPORTED_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const mo = get("month");
  const day = get("day");
  const hh = get("hour");
  const mm = get("minute");
  const ss = get("second");
  return { date: `${y}-${mo}-${day}`, time: `${hh}:${mm}:${ss}` };
}

/** Parse API `date_time_reported` into Manila form date + time (HH:MM:SS). */
export function splitAtlDateTimeReportedFromApi(raw?: string | null): {
  date: string;
  time: string;
} {
  if (raw == null || String(raw).trim() === "") return { date: "", time: "" };
  const d = parseAtlDateTimeReported(String(raw).trim());
  if (!d) return { date: "", time: "" };
  return getManilaDateTimeParts(d);
}

/**
 * ATL Date Reported display from form fields or API value (Asia/Manila).
 */
export function formatAtlDateReportedManilaFromParts(
  formDate?: string,
  formTime?: string,
  apiValue?: string | null
): string {
  if (apiValue != null && String(apiValue).trim() !== "") {
    return formatAtlDateReportedManila(apiValue);
  }
  if (!formDate?.trim()) return "";
  const time = formTime?.trim() || "00:00:00";
  const parts = time.split(":");
  const hh = (parts[0] || "00").padStart(2, "0");
  const mm = (parts[1] || "00").padStart(2, "0");
  const ss = (parts[2] || "00").padStart(2, "0");
  return formatAtlDateReportedManila(`${formDate.trim()}T${hh}:${mm}:${ss}`);
}

/**
 * ATL API UTC timestamp display (Philippines / Asia-Manila), e.g. "06/03/2024, 22:30:45".
 * Use for `updatedAt` / `createdAt` and other Zulu API datetimes.
 */
export function formatAtlUtcTimestampManila(raw?: string | null): string {
  if (raw == null || String(raw).trim() === "") return "-";
  const d = parseAtlDateTimeAsUtc(String(raw).trim());
  if (!d) return String(raw).trim();
  return d.toLocaleString(
    ATL_DATE_REPORTED_LOCALE,
    PHILIPPINES_DATETIME_FORMAT_OPTIONS
  );
}

/**
 * ATL Date Reported display, e.g. "29/02/2024 12:00 AM UTC".
 */
export function formatAtlDateTimeUtc(raw?: string | null): string {
  if (raw == null || String(raw).trim() === "") return "-";
  const d = parseAtlDateTimeAsUtc(String(raw).trim());
  if (!d) return String(raw).trim();
  const datePart = formatDisplayDateFromDate(d, { timeZone: "UTC" });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  return `${datePart} ${timePart} UTC`;
}

/** Format from form date/time fields or API value (TechPubView read-only display). */
export function formatAtlDateTimeUtcFromParts(
  formDate?: string,
  formTime?: string,
  apiValue?: string | null
): string {
  if (apiValue != null && String(apiValue).trim() !== "") {
    return formatAtlDateTimeUtc(apiValue);
  }
  if (!formDate?.trim()) return "";
  const time = formTime?.trim() || "00:00";
  const parts = time.split(":");
  const hh = (parts[0] || "00").padStart(2, "0");
  const mm = (parts[1] || "00").padStart(2, "0");
  return formatAtlDateTimeUtc(`${formDate.trim()}T${hh}:${mm}:00`);
}

/**
 * Format numeric values (e.g. tach/hobbs totals) to two decimal places for display.
 */
export function formatOptionalNumber2dp(
  value: unknown,
  fallback = "-"
): string {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : fallback;
}

/** Engine/propeller TBO display in ATL create & edit forms (1 decimal place). */
export function formatAtlTboDisplay1dp(
  value: unknown,
  fallback = ""
): string {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : fallback;
}

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

/** Shown when optional Zulu Time is non-empty but not strict HH:mm UTC. */
export const ZULU_TIME_VALIDATION_ERROR =
  "Invalid Zulu Time. Please use HH:mm format (00:00–23:59 UTC).";

/** Strict 24-hour UTC: HH:mm with leading zeros; 24:00 is not allowed. */
const ZULU_TIME_HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidZuluTimeHHmm(value: string): boolean {
  const t = value.trim();
  if (!t || t === "24:00") return false;
  return ZULU_TIME_HHMM_RE.test(t);
}

/** Optional field: empty is valid; otherwise must pass {@link isValidZuluTimeHHmm}. */
export function validateOptionalZuluTime(
  value: string | undefined | null
): string | undefined {
  const t = (value ?? "").trim();
  if (!t) return undefined;
  return isValidZuluTimeHHmm(t) ? undefined : ZULU_TIME_VALIDATION_ERROR;
}

/** HH:mm display value from API strings (24-hour, no AM/PM). */
export function zuluTimeToTimeInputValue(
  timeStr: string | undefined | null
): string {
  const formatted = formatTimeZulu(timeStr);
  return formatted === "-" ? "" : formatted;
}

/** Mask keystrokes to HH:mm (24-hour text field; strips AM/PM and non-digits). */
export function formatZuluTimeKeyboardInput(value: string): string {
  const stripped = value.replace(/\s*(AM|PM)\s*/gi, "").trim();
  if (stripped.includes(":")) {
    const [h = "", m = ""] = stripped.split(":");
    const hours = h.replace(/\D/g, "").slice(0, 2);
    const minutes = m.replace(/\D/g, "").slice(0, 2);
    if (!hours && !minutes) return "";
    return `${hours}:${minutes}`;
  }
  const numbers = stripped.replace(/\D/g, "").slice(0, 4);
  if (numbers.length > 2) {
    return `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
  }
  return numbers;
}

/** On blur: pad to strict HH:mm when the time is otherwise valid. */
export function normalizeOptionalZuluTimeInput(value: string): string {
  const t = value.trim();
  if (!t) return "";
  if (isValidZuluTimeHHmm(t)) return t;
  const formatted = formatTimeZulu(t);
  return formatted === "-" ? t : formatted;
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

/** Normalize API or form date strings to UTC calendar YYYY-MM-DD. */
function normalizeUtcDateInput(d: string | undefined): string {
  const t = (d || "").trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const head = t.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) return "";
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** UTC epoch ms at start of that calendar day + Zulu time (time-of-day only). */
function utcInstantFromYmdAndZulu(
  dateYmd: string,
  zuluTime: string
): number | null {
  const mins = parseZuluTimeToMinutes(zuluTime);
  if (mins === -1) return null;
  const [y, mo, day] = dateYmd.split("-").map((x) => parseInt(x, 10));
  if (
    Number.isNaN(y) ||
    Number.isNaN(mo) ||
    Number.isNaN(day) ||
    mo < 1 ||
    mo > 12
  ) {
    return null;
  }
  return Date.UTC(y, mo - 1, day, Math.floor(mins / 60), mins % 60, 0, 0);
}

/**
 * Total block/flight time from origin and destination UTC dates + Zulu times.
 * Uses full calendar span when both dates are present; otherwise falls back to
 * time-of-day difference with +24h wrap (same as {@link computeTotalBlockTime}).
 */
export function computeTotalBlockTimeFromUtc(
  originDate: string | undefined,
  originTime: string | undefined,
  destinationDate: string | undefined,
  destinationTime: string | undefined
): string {
  const ot = (originTime || "").trim();
  const dt = (destinationTime || "").trim();
  if (!ot || !dt) return "0";

  const od = normalizeUtcDateInput(originDate);
  const dd = normalizeUtcDateInput(destinationDate);
  if (!od || !dd) {
    return computeTotalBlockTime(ot, dt);
  }

  const originMs = utcInstantFromYmdAndZulu(od, ot);
  const destMs = utcInstantFromYmdAndZulu(dd, dt);
  if (originMs === null || destMs === null) {
    return computeTotalBlockTime(ot, dt);
  }

  let diffMin = Math.round((destMs - originMs) / 60000);
  if (diffMin < 0) {
    if (od === dd) {
      diffMin += 1440;
    } else {
      return "0";
    }
  }

  const hrs = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `${hrs}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Display-only: show total flight time with "+" instead of ":".
 * Does not mutate stored/API values (e.g. "1:56" → "1+56").
 */
export function formatTotalFlightTimeForDisplay(
  value?: string | number | null
): string {
  if (value == null || value === "") return "";
  const raw = String(value).trim();
  if (!raw) return "";
  // Keep empty placeholders as-is
  if (raw === "-" || raw === "—" || raw === "N/A") return raw;
  // Already in display format
  if (raw.includes("+")) return raw;
  return raw.replace(":", "+");
}

/**
 * ATL list/detail display for total flight hours.
 * Prefers API H:MM when present; otherwise computes from block times.
 * Always renders with "+" (never mutates stored/API values).
 */
export function formatAtlTotalFlightHoursForDisplay(
  record: {
    totalFlightHours?: string | number | null;
    originDate?: string | null;
    originTime?: string | null;
    destinationDate?: string | null;
    destinationTime?: string | null;
  },
  emptyLabel = "-"
): string {
  const apiRaw =
    record.totalFlightHours != null &&
    String(record.totalFlightHours).trim() !== ""
      ? String(record.totalFlightHours).trim()
      : "";

  if (apiRaw.includes(":") || apiRaw.includes("+")) {
    return formatTotalFlightTimeForDisplay(apiRaw) || emptyLabel;
  }

  const computed = computeTotalBlockTimeFromUtc(
    record.originDate || undefined,
    record.originTime || undefined,
    record.destinationDate || undefined,
    record.destinationTime || undefined
  );
  if (computed && computed !== "0") {
    return formatTotalFlightTimeForDisplay(computed) || emptyLabel;
  }

  if (apiRaw) {
    return formatTotalFlightTimeForDisplay(apiRaw) || emptyLabel;
  }
  return emptyLabel;
}

/**
 * Display-only: join fuel LEFT + RIGHT quantities (e.g. 4 and 5 → "4+5").
 * Does not mutate stored/API left/right values.
 */
export function formatAtlFuelLeftRightForDisplay(
  left?: string | number | null,
  right?: string | number | null,
  emptyLabel = "-"
): string {
  const l =
    left == null || String(left).trim() === "" ? "" : String(left).trim();
  const r =
    right == null || String(right).trim() === "" ? "" : String(right).trim();
  if (!l && !r) return emptyLabel;
  if (!l) return r;
  if (!r) return l;
  return `${l}+${r}`;
}

/**
 * Display-only account label: `{name} - {license_no}`.
 * Omits trailing hyphen when license is missing; never shows null/undefined.
 */
export function formatAccountNameLicense(
  fullName?: string | null,
  licenseNo?: string | null
): string {
  const name = String(fullName ?? "").trim();
  const license = String(licenseNo ?? "").trim();
  if (!name && !license) return "";
  if (!name) return license;
  if (!license) return name;
  return `${name} - ${license}`;
}

/** Resolve display label from an account-like object (nested API or Account). */
export function resolveAccountNameLicenseDisplay(
  account?: {
    fullName?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    licenseNo?: string | null;
    license_no?: string | null;
  } | null,
  emptyLabel = "-"
): string {
  if (!account) return emptyLabel;
  const fullName =
    String(account.fullName ?? "").trim() ||
    [account.firstName, account.middleName, account.lastName]
      .map((part) => String(part ?? "").trim())
      .filter(Boolean)
      .join(" ");
  const license = String(
    account.licenseNo ?? account.license_no ?? ""
  ).trim();
  return formatAccountNameLicense(fullName, license) || emptyLabel;
}

/**
 * ATL remark / action-taken person label from nested maintenance data,
 * then accounts map by maintenanceFk. Display only — does not change IDs.
 */
export function resolveAtlMaintenancePersonDisplay(
  record: {
    maintenanceFk?: number | null;
    maintenance?: {
      fullName?: string | null;
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
      licenseNo?: string | null;
      license_no?: string | null;
    } | null;
  } | null | undefined,
  accountsMap?: Map<
    number,
    {
      fullName?: string | null;
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
      licenseNo?: string | null;
    }
  > | null,
  emptyLabel = "-"
): string {
  if (!record) return emptyLabel;
  if (record.maintenance) {
    const fromNested = resolveAccountNameLicenseDisplay(
      record.maintenance,
      ""
    );
    if (fromNested) return fromNested;
  }
  const fk = record.maintenanceFk;
  if (fk != null && Number.isFinite(Number(fk)) && accountsMap?.has(Number(fk))) {
    return resolveAccountNameLicenseDisplay(
      accountsMap.get(Number(fk)),
      emptyLabel
    );
  }
  return emptyLabel;
}

/** Which remarks UI section to show for a Nature of Flight value (UI only). */
export type AtlRemarksSectionVisibility =
  | "pilotReport"
  | "maintenanceEntry"
  | "remarks";

/**
 * TR / TR W/ PIREM → Pilot Report
 * PRF / PSF / EGR / ME / ATL REPL → Maintenance Entry
 * All other (incl. null/empty) → Remarks
 * Matching is case-insensitive; display/API aliases are normalized.
 */
export function resolveAtlRemarksSectionVisibility(
  natureOfFlight?: string | null
): AtlRemarksSectionVisibility {
  const raw = String(natureOfFlight ?? "").trim();
  if (!raw) return "remarks";

  const normalized = raw
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ")
    .trim();

  if (
    normalized === "TR" ||
    normalized === "TR W/ PIREM" ||
    normalized === "TR WITH PIREM"
  ) {
    return "pilotReport";
  }

  if (
    normalized === "PRF" ||
    normalized === "PSF" ||
    normalized === "EGR" ||
    normalized === "ME" ||
    normalized === "ATL REPL"
  ) {
    return "maintenanceEntry";
  }

  return "remarks";
}

/**
 * Decimal flight hours from UTC dates + Zulu times (see {@link computeTotalBlockTimeFromUtc}).
 */
export function computeTotalFlightHoursDecimalFromUtc(
  originDate?: string,
  originTime?: string,
  destinationDate?: string,
  destinationTime?: string
): number {
  const block = computeTotalBlockTimeFromUtc(
    originDate,
    originTime,
    destinationDate,
    destinationTime
  );
  if (block === "0") return 0;
  const parts = block.split(":");
  if (parts.length !== 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return Math.round((h + m / 60) * 100) / 100;
}

export function escapeHtmlForSwal(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ApiErrorSwalContent = {
  icon: "error" | "warning";
  title: string;
  text?: string;
  html?: string;
};

function pushValidationLine(lines: string[], line: string) {
  const trimmed = line.trim();
  if (trimmed) lines.push(trimmed);
}

function formatValidationItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return String(item ?? "");
  const o = item as Record<string, unknown>;
  if (typeof o.msg === "string") {
    const loc = Array.isArray(o.loc)
      ? o.loc
          .filter((part) => part !== "body" && part !== "query")
          .map(String)
          .join(".")
      : "";
    return loc ? `${loc}: ${o.msg}` : o.msg;
  }
  const row = o.row != null ? `Row ${o.row}` : "";
  const field =
    o.column != null
      ? String(o.column)
      : o.field != null
        ? String(o.field)
        : "";
  const value =
    o.value != null && String(o.value).trim() !== "" ? String(o.value) : "";
  const message =
    typeof o.message === "string"
      ? o.message
      : typeof o.error === "string"
        ? o.error
        : "";
  const expected =
    typeof o.expected === "string" && o.expected.trim()
      ? `Expected: ${o.expected.trim()}.`
      : "";
  if (row || field || value || message) {
    const core = [row, field, value ? `value ${value}` : "", message]
      .filter(Boolean)
      .join(" — ");
    return expected ? `${core} ${expected}` : core;
  }
  return JSON.stringify(item);
}

/** Collect human-readable validation messages from FastAPI / import error payloads. */
export function extractApiValidationLines(
  detail: unknown,
  data?: Record<string, unknown>
): string[] {
  const lines: string[] = [];

  if (typeof detail === "string") {
    pushValidationLine(lines, detail);
  } else if (Array.isArray(detail)) {
    for (const item of detail) {
      pushValidationLine(lines, formatValidationItem(item));
    }
  } else if (detail && typeof detail === "object") {
    const d = detail as Record<string, unknown>;
    if (typeof d.message === "string") pushValidationLine(lines, d.message);
    const nested = d.errors ?? d.validation_errors ?? d.validationErrors;
    if (Array.isArray(nested)) {
      for (const item of nested) {
        pushValidationLine(lines, formatValidationItem(item));
      }
    }
  }

  const rootErrors = data?.errors ?? data?.validation_errors;
  if (Array.isArray(rootErrors)) {
    for (const item of rootErrors) {
      pushValidationLine(lines, formatValidationItem(item));
    }
  }

  return lines;
}

/** SweetAlert2 shape for API validation errors (e.g. HTTP 422). */
export function formatValidationErrorForSwal(
  message: string,
  title = "Validation Error"
): ApiErrorSwalContent {
  return {
    icon: "error",
    title,
    text: message.trim() || "Validation failed.",
  };
}

/** Build SweetAlert2 content for API errors; 422 uses Validation Error + text. */
export function formatApiErrorForSwal(
  err: unknown,
  options?: {
    defaultTitle?: string;
    validationTitle?: string;
    fallbackMessage?: string;
  }
): ApiErrorSwalContent {
  const defaultTitle = options?.defaultTitle ?? "Request failed";
  const validationTitle = options?.validationTitle ?? "Validation Error";
  const fallbackMessage =
    options?.fallbackMessage ?? "Something went wrong. Please try again.";

  const e = err as {
    response?: { status?: number; data?: Record<string, unknown> };
    message?: string;
  };
  const status = e?.response?.status;
  const data = e?.response?.data;
  const detail = data?.detail ?? data?.message;
  const validationLines = extractApiValidationLines(detail, data);

  if (
    validationLines.some(isNotValidDataInputMessage) ||
    (typeof detail === "string" && isNotValidDataInputMessage(detail)) ||
    (typeof data?.message === "string" && isNotValidDataInputMessage(data.message))
  ) {
    const title = "Not valid data input";
    const rowLines = validationLines.filter((line) => !isNotValidDataInputMessage(line));
    if (rowLines.length > 1) {
      return {
        icon: "error",
        title,
        html: `<p>Please correct the following rows and try again.</p><ul style="text-align:left;margin:0.75em 0 0;padding-left:1.25em">${rowLines
          .map((line) => `<li>${escapeHtmlForSwal(line)}</li>`)
          .join("")}</ul>`,
      };
    }
    if (rowLines.length === 1) {
      return { icon: "error", title, text: rowLines[0] };
    }
    const text =
      (typeof detail === "string" && detail.trim()) ||
      (typeof data?.message === "string" && data.message.trim()) ||
      "The Excel file contains invalid data. Please review the workbook and try again.";
    return { icon: "error", title, text };
  }

  if (status === 422) {
    if (validationLines.length > 0) {
      return formatValidationErrorForSwal(
        validationLines.join("\n"),
        validationTitle
      );
    }
    if (typeof detail === "string" && detail.trim()) {
      return formatValidationErrorForSwal(detail.trim(), validationTitle);
    }
    return formatValidationErrorForSwal(fallbackMessage, validationTitle);
  }

  const hasStructuredValidation =
    Array.isArray(detail) ||
    Array.isArray(data?.errors) ||
    Array.isArray(data?.validation_errors);

  if (validationLines.length > 0 && (status === 422 || hasStructuredValidation)) {
    return formatValidationErrorForSwal(
      validationLines.join("\n"),
      validationTitle
    );
  }

  if (validationLines.length === 1) {
    return { icon: "error", title: defaultTitle, text: validationLines[0] };
  }

  if (typeof detail === "string" && detail.trim()) {
    return { icon: "error", title: defaultTitle, text: detail.trim() };
  }

  const message =
    (typeof data?.message === "string" && data.message.trim()) ||
    e?.message?.trim() ||
    fallbackMessage;

  return { icon: "error", title: defaultTitle, text: message };
}

const NOT_VALID_DATA_INPUT_RE = /not valid data input/i;

export function isNotValidDataInputMessage(message: string): boolean {
  return NOT_VALID_DATA_INPUT_RE.test(message.trim());
}

function maintenanceImportStatus(data: Record<string, unknown>): string {
  return String(data.status ?? "").trim().toLowerCase();
}

/** errorMessage from import API (e.g. when status is "failed"). */
export function getMaintenanceImportErrorMessage(
  data: unknown
): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const msg = d.errorMessage ?? d.error_message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  return undefined;
}

function maintenanceImportFailureMessages(data: Record<string, unknown>): string[] {
  const candidates: unknown[] = [
    getMaintenanceImportErrorMessage(data),
    data.message,
    data.detail,
    data.error,
  ];
  if (data.detail && typeof data.detail === "object") {
    const nested = data.detail as Record<string, unknown>;
    candidates.push(nested.message, nested.error);
  }
  return candidates.filter((m): m is string => typeof m === "string" && m.trim().length > 0);
}

/** True when a 2xx maintenance import body still reports validation failure. */
export function maintenanceImportResponseIndicatesFailure(
  data: unknown
): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (maintenanceImportStatus(d) === "failed") return true;
  if (d.success === false || d.valid === false || d.ok === false) return true;
  return maintenanceImportFailureMessages(d).some(isNotValidDataInputMessage);
}

/** Throw an axios-shaped error so import handlers can show Swal consistently. */
export function throwIfMaintenanceImportResponseFailed(data: unknown): void {
  if (!maintenanceImportResponseIndicatesFailure(data)) return;
  const err = new Error("Maintenance import failed") as Error & {
    response?: { data?: unknown };
  };
  err.response = { data };
  throw err;
}

export type AtlExcelImportValidationError = {
  row?: number;
  column?: string;
  field?: string;
  value?: string;
  error?: string;
  expected?: string;
  message?: string;
};

/** Normalize backend ATL import progress status for comparisons. */
export function normalizeAtlExcelImportStatus(status: string | undefined): string {
  return (status ?? "").toUpperCase().replace(/\s+/g, "_");
}

/** True when an ATL async import job finished without importing rows. */
export function isAtlExcelImportFailureStatus(status: string | undefined): boolean {
  const s = normalizeAtlExcelImportStatus(status);
  return (
    s === "FAILED" ||
    s === "VALIDATION_FAILED" ||
    s === "ERROR" ||
    s === "CANCELLED" ||
    s === "ABORTED"
  );
}

export function formatAtlExcelImportValidationLine(
  item: AtlExcelImportValidationError
): string {
  const row = item.row != null ? `Row ${item.row}` : "";
  const column = item.column ?? item.field ?? "";
  const value =
    item.value != null && String(item.value).trim() !== ""
      ? `value ${item.value}`
      : "";
  const error = item.error ?? item.message ?? "";
  const expected =
    item.expected?.trim() ? `Expected: ${item.expected.trim()}.` : "";
  const core = [row, column, value, error].filter(Boolean).join(" — ");
  return expected ? `${core} ${expected}` : core;
}

/** SweetAlert content for ATL Excel async import validation failures. */
export function formatAtlExcelImportErrorForSwal(
  progress: {
    status?: string;
    message?: string;
    errors?: unknown;
  },
  options?: {
    defaultTitle?: string;
    validationTitle?: string;
    fallbackMessage?: string;
  }
): ApiErrorSwalContent {
  const validationTitle = options?.validationTitle ?? "Validation Error";
  const defaultTitle = options?.defaultTitle ?? "Import failed";
  const fallbackMessage =
    options?.fallbackMessage ??
    (progress.message?.trim() ||
      "The file contains validation errors. No records were imported.");

  const status = normalizeAtlExcelImportStatus(progress.status);
  const title =
    status === "VALIDATION_FAILED" ? validationTitle : defaultTitle;
  const errors = Array.isArray(progress.errors) ? progress.errors : [];
  const lines = errors
    .map((item) =>
      formatAtlExcelImportValidationLine(item as AtlExcelImportValidationError)
    )
    .filter((line) => line.trim().length > 0);

  if (lines.length > 1) {
    return {
      icon: "error",
      title,
      html: `<p>${escapeHtmlForSwal(fallbackMessage)}</p><ul style="text-align:left;margin:0.75em 0 0;padding-left:1.25em;max-height:240px;overflow:auto;font-size:14px">${lines
        .map((line) => `<li>${escapeHtmlForSwal(line)}</li>`)
        .join("")}</ul>`,
    };
  }

  if (lines.length === 1) {
    return { icon: "error", title, text: lines[0] };
  }

  return formatApiErrorForSwal(
    {
      response: {
        data: {
          detail: progress.message,
          message: progress.message,
          errors: progress.errors,
        },
      },
    },
    {
      defaultTitle,
      validationTitle,
      fallbackMessage,
    }
  );
}

/** SweetAlert content for maintenance Excel import errors (incl. "Not valid data input"). */
export function formatMaintenanceImportErrorForSwal(
  err: unknown,
  options?: { fallbackMessage?: string; defaultTitle?: string }
): ApiErrorSwalContent {
  const e = err as {
    response?: { status?: number; data?: Record<string, unknown> };
    message?: string;
  };
  const data = e?.response?.data;
  const failedErrorMessage = data ? getMaintenanceImportErrorMessage(data) : undefined;
  const detail = data?.detail ?? data?.message ?? failedErrorMessage;
  const summaryMessages = data ? maintenanceImportFailureMessages(data) : [];
  const validationLinesAll = extractApiValidationLines(detail, data);
  const isNotValidInput =
    (failedErrorMessage != null && isNotValidDataInputMessage(failedErrorMessage)) ||
    summaryMessages.some(isNotValidDataInputMessage) ||
    (typeof detail === "string" && isNotValidDataInputMessage(detail)) ||
    validationLinesAll.some(isNotValidDataInputMessage);

  const validationLines = validationLinesAll.filter(
    (line) =>
      !isNotValidDataInputMessage(line) &&
      line !== failedErrorMessage
  );

  if (failedErrorMessage) {
    const title = isNotValidInput
      ? "Not valid data input"
      : (options?.defaultTitle ?? "Import failed");
    if (validationLines.length > 1) {
      return {
        icon: "error",
        title,
        html: `<p>${escapeHtmlForSwal(failedErrorMessage)}</p><ul style="text-align:left;margin:0.75em 0 0;padding-left:1.25em">${validationLines
          .map((line) => `<li>${escapeHtmlForSwal(line)}</li>`)
          .join("")}</ul>`,
      };
    }
    if (validationLines.length === 1) {
      return {
        icon: "error",
        title,
        text: `${failedErrorMessage}\n${validationLines[0]}`,
      };
    }
    return { icon: "error", title, text: failedErrorMessage };
  }

  if (isNotValidInput) {
    const title = "Not valid data input";
    if (validationLines.length > 1) {
      return {
        icon: "error",
        title,
        html: `<p>Please correct the following rows and try again.</p><ul style="text-align:left;margin:0.75em 0 0;padding-left:1.25em">${validationLines
          .map((line) => `<li>${escapeHtmlForSwal(line)}</li>`)
          .join("")}</ul>`,
      };
    }
    if (validationLines.length === 1) {
      return { icon: "error", title, text: validationLines[0] };
    }
    return {
      icon: "error",
      title,
      text: "The Excel file contains invalid data. Please review the workbook and try again.",
    };
  }

  return formatApiErrorForSwal(err, {
    defaultTitle: options?.defaultTitle ?? "Import failed",
    validationTitle: "Validation error",
    fallbackMessage:
      options?.fallbackMessage ?? "Import failed. Please try again.",
  });
}
