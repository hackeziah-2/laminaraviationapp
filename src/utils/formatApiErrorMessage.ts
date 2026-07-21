/** Coerce FastAPI/axios errors to a safe string for UI (avoid React object child crashes). */
export function formatApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong."
): string {
  const anyErr = err as {
    response?: { data?: { detail?: unknown } };
    message?: string;
  };
  const detail = anyErr?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "string"
          ? item
          : typeof item?.msg === "string"
            ? item.msg
            : JSON.stringify(item)
      )
      .join("; ");
  }
  if (detail != null && typeof detail === "object") {
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) {
    return anyErr.message;
  }
  return fallback;
}
