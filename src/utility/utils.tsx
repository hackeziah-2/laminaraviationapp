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
  const field = o.field != null ? String(o.field) : "";
  const message =
    typeof o.message === "string"
      ? o.message
      : typeof o.error === "string"
        ? o.error
        : "";
  if (row || field || message) {
    return [row, field, message].filter(Boolean).join(" — ");
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

/** errorMessage from import API when status is "failed". */
export function getMaintenanceImportErrorMessage(
  data: unknown
): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  if (maintenanceImportStatus(d) !== "failed") return undefined;
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
  const isNotValidInput =
    (failedErrorMessage != null && isNotValidDataInputMessage(failedErrorMessage)) ||
    summaryMessages.some(isNotValidDataInputMessage) ||
    (typeof detail === "string" && isNotValidDataInputMessage(detail));

  const validationLines = extractApiValidationLines(detail, data).filter(
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
    defaultTitle: "Import failed",
    validationTitle: "Validation error",
    fallbackMessage:
      options?.fallbackMessage ?? "Import failed. Please try again.",
  });
}
