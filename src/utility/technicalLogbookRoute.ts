export type TechnicalLogbookAtlFilters = {
  sequenceNo: string;
  aircraftId: string;
  atlBatchFk: string;
};

function parseSearchParams(search: string): URLSearchParams {
  const queryPart = search.startsWith("?") ? search.slice(1) : search;
  const normalizedQuery = queryPart.replace(/\//g, "&");
  return new URLSearchParams(normalizedQuery);
}

/** Parse ATL deep-link filters from technical-logbook URL query (and legacy path formats). */
export function parseTechnicalLogbookAtlFilters(
  pathname: string,
  search: string
): TechnicalLogbookAtlFilters {
  let sequenceNo = "";

  const sequenceEqMatch = pathname.match(
    /\/technical-logbook\/sequence_no=([^/?]+)/i
  );
  const sequenceSlashMatch = pathname.match(
    /\/technical-logbook\/sequence_no\/([^/?]+)/i
  );

  if (sequenceEqMatch?.[1]) {
    sequenceNo = decodeURIComponent(sequenceEqMatch[1]).trim();
  } else if (sequenceSlashMatch?.[1]) {
    sequenceNo = decodeURIComponent(sequenceSlashMatch[1]).trim();
  }

  const params = parseSearchParams(search);

  return {
    sequenceNo: sequenceNo || params.get("sequence_no")?.trim() || "",
    aircraftId: params.get("aircraft_id")?.trim() || "",
    atlBatchFk:
      params.get("atl_batch_fk")?.trim() ||
      params.get("atl_batch")?.trim() ||
      "",
  };
}

/** Build technical-logbook ATL filter route for notifications. */
export function buildTechnicalLogbookAtlRoute(args: {
  sequenceNo?: string | number | null;
  aircraftId?: string | number | null;
  atlBatchFk?: string | number | null;
}): string {
  const params = new URLSearchParams();

  const sequence =
    args.sequenceNo != null ? String(args.sequenceNo).trim() : "";
  if (sequence) {
    params.set("sequence_no", sequence);
  }
  if (args.aircraftId != null && String(args.aircraftId).trim() !== "") {
    params.set("aircraft_id", String(args.aircraftId).trim());
  }
  if (args.atlBatchFk != null && String(args.atlBatchFk).trim() !== "") {
    params.set("atl_batch_fk", String(args.atlBatchFk).trim());
  }

  const query = params.toString();
  return query ? `/technical-logbook?${query}` : "/technical-logbook";
}

/** Normalize backend/metadata URL for in-app navigation. */
export function normalizeTechnicalLogbookNavigatePath(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let path = trimmed;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  } else if (!path.startsWith("/")) {
    path = `/${path.replace(/^\/+/, "")}`;
  }

  if (!path.includes("/technical-logbook")) {
    return path;
  }

  const [pathname, rawSearch = ""] = path.split("?");
  const filters = parseTechnicalLogbookAtlFilters(
    pathname,
    rawSearch ? `?${rawSearch}` : ""
  );

  if (filters.sequenceNo || filters.aircraftId || filters.atlBatchFk) {
    return buildTechnicalLogbookAtlRoute(filters);
  }

  return pathname;
}

export function hasTechnicalLogbookAtlFilters(
  filters: TechnicalLogbookAtlFilters
): boolean {
  return Boolean(
    filters.sequenceNo || filters.aircraftId || filters.atlBatchFk
  );
}
