import apiClient from "./index";
import { toCamel } from "../utility/utils";

const PUBLICATIONS_BASE = "oem-technical-publications";
const ITEM_TYPES_BASE = "oem-item-types";

/** Single OEM technical publication. */
export interface OemTechnicalPublication {
  id: number;
  itemFk: number;
  itemName: string;
  type: string;
  /** Category type e.g. SUBSCRIPTION, MANUAL (from API category_type). */
  categoryType: string | null;
  dateOfExpiration: string | null;
  expiry?: string;
  linkToManual: string;
  webLink?: string | null;
  isWithhold?: boolean;
}

/** Item type option for dropdowns. */
export interface OemItemTypeOption {
  id: number;
  name: string;
}

export type OemPublicationSortBy = "date_of_expiration" | "item__name";
export type SortOrder = "asc" | "desc";

export interface OemPublicationsPagedResponse {
  items: OemTechnicalPublication[];
  total: number;
  page: number;
  pages: number;
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: unknown } }).response;
    const data = res?.data;
    if (data && typeof data === "object") {
      const msg =
        (data as any).message ??
        (data as any).detail ??
        (Array.isArray((data as any).errors)
          ? (data as any).errors.join(" ")
          : null);
      if (msg && typeof msg === "string") return msg;
    }
  }
  return err instanceof Error ? err.message : fallback;
}

function normalizePublication(
  raw: Record<string, unknown> | null | undefined
): OemTechnicalPublication {
  if (raw == null || typeof raw !== "object") {
    return {
      id: 0,
      itemFk: 0,
      itemName: "",
      type: "",
      categoryType: null,
      dateOfExpiration: null,
      linkToManual: "#",
      isWithhold: false,
    };
  }
  const c = toCamel(raw as Record<string, any>) as Record<string, unknown>;
  const id = Number(c.id ?? raw.id ?? 0);
  const itemObj = raw.item ?? (c as any).item;
  const itemFk =
    typeof itemObj === "object" && itemObj != null && (itemObj as any).id != null
      ? Number((itemObj as any).id)
      : Number((raw as any).item_fk ?? (c as any).itemFk ?? 0);
  const itemName =
    typeof itemObj === "object" && itemObj != null && (itemObj as any).name != null
      ? String((itemObj as any).name)
      : String((c as any).itemName ?? (raw as any).item_name ?? "");
  const type = String(c.type ?? raw.type ?? "");
  const categoryType =
    (raw as any).category_type != null
      ? String((raw as any).category_type)
      : (c as any).categoryType != null
        ? String((c as any).categoryType)
        : type || null;
  const dateOfExpiration =
    (raw as any).date_of_expiration ??
    (c as any).dateOfExpiration ??
    (c as any).expiryDate ??
    null;
  const expiryStr =
    dateOfExpiration != null ? String(dateOfExpiration) : "";
  const webLinkVal = (c as any).webLink ?? (c as any).linkToManual ?? (raw as any).web_link ?? (raw as any).link_to_manual;
  const linkToManual =
    webLinkVal != null && String(webLinkVal).trim() !== "" && String(webLinkVal).trim() !== "#"
      ? String(webLinkVal).trim()
      : "#";
  return {
    id: isNaN(id) ? 0 : id,
    itemFk: isNaN(itemFk) ? 0 : itemFk,
    itemName: itemName || String(itemFk),
    type: type || "SUBSCRIPTION",
    categoryType: categoryType && categoryType.trim() ? categoryType : null,
    dateOfExpiration: dateOfExpiration != null ? String(dateOfExpiration) : null,
    expiry: expiryStr,
    linkToManual,
    webLink: linkToManual !== "#" ? linkToManual : null,
    isWithhold: Boolean((c as any).isWithhold ?? (raw as any).is_withhold ?? false),
  };
}

/**
 * GET list of OEM item types (for dropdown / Add Item Type).
 * API: /v1/oem-item-types/list
 */
export async function getOemItemTypesList(): Promise<OemItemTypeOption[]> {
  try {
    const res = await apiClient.get(`${ITEM_TYPES_BASE}/list`, {
      headers: { Accept: "application/json" },
    });
    const data = res.data?.results ?? res.data?.data ?? res.data;
    const list = Array.isArray(data) ? data : [];
    return list
      .map((item: Record<string, unknown>) => ({
        id: Number(item.id ?? (item as any).pk ?? 0),
        name: String(
          item.name ?? (item as any).item_name ?? (item as any).title ?? ""
        ),
      }))
      .filter((x) => x.id && x.name);
  } catch {
    return [];
  }
}

/**
 * POST create new OEM item type. /v1/oem-item-types/
 */
export async function createOemItemType(payload: {
  name: string;
}): Promise<OemItemTypeOption> {
  const res = await apiClient.post(
    `${ITEM_TYPES_BASE}/`,
    typeof payload === "object" && payload !== null ? payload : { name: String(payload) },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );
  const raw = res.data?.data ?? res.data;
  if (raw != null && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return {
      id: Number(obj.id ?? 0),
      name: String((obj as any).name ?? payload.name ?? ""),
    };
  }
  return { id: 0, name: payload.name };
}

/**
 * GET paged OEM technical publications.
 * API: /v1/oem-technical-publications/paged?limit=10&page=1
 */
export async function getOemPublicationsPaged(
  page: number,
  pageSize: number,
  search: string,
  sortBy: OemPublicationSortBy,
  sortOrder: SortOrder
): Promise<OemPublicationsPagedResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(pageSize));
  if (search.trim()) params.set("search", search.trim());
  const orderPrefix = sortOrder === "desc" ? "-" : "";
  params.set("ordering", `${orderPrefix}${sortBy}`);

  const path = `${PUBLICATIONS_BASE}/paged?${params.toString()}`;
  const res = await apiClient.get(path, {
    headers: { Accept: "application/json" },
  });
  const data = res.data ?? {};
  const inner =
    data?.data && typeof data.data === "object" ? data.data : data;
  const rawItems =
    Array.isArray(data)
      ? data
      : Array.isArray(inner)
        ? inner
        : inner?.items ?? inner?.results ?? data?.items ?? data?.results ?? [];
  const list = Array.isArray(rawItems) ? rawItems : [];
  let items = list.map((item: unknown) =>
    normalizePublication((item as Record<string, unknown>) ?? {})
  );

  // Client-side sort so date_of_expiration and item__name order is correct
  const toDate = (s: string | null | undefined): number => {
    if (!s?.trim()) return 0;
    const t = new Date(s.trim()).getTime();
    return Number.isNaN(t) ? 0 : t;
  };
  items = [...items].sort((a, b) => {
    if (sortBy === "date_of_expiration") {
      const tA = toDate(a.dateOfExpiration ?? a.expiry);
      const tB = toDate(b.dateOfExpiration ?? b.expiry);
      // Null/empty expiry: last when asc, first when desc
      const nullLast = sortOrder === "asc" ? Infinity : -Infinity;
      const vA = tA || nullLast;
      const vB = tB || nullLast;
      const diff = sortOrder === "asc" ? vA - vB : vB - vA;
      if (diff !== 0) return diff;
    } else {
      const nameA = (a.itemName ?? "").toLowerCase();
      const nameB = (b.itemName ?? "").toLowerCase();
      const cmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      const diff = sortOrder === "asc" ? cmp : -cmp;
      if (diff !== 0) return diff;
    }
    return (a.id ?? 0) - (b.id ?? 0);
  });

  const total = Number(
    inner?.total ?? inner?.count ?? data?.total ?? data?.count ?? data?.total_count ?? items.length
  );
  const pages =
    Number(inner?.pages ?? data?.pages ?? data?.total_pages) ||
    Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pages };
}

/**
 * POST create OEM technical publication. /v1/oem-technical-publications/
 */
export async function createOemPublication(payload: {
  item: number;
  category_type?: string | null;
  date_of_expiration: string;
  web_link?: string | null;
}): Promise<OemTechnicalPublication> {
  const res = await apiClient.post(
    `${PUBLICATIONS_BASE}/`,
    {
      item_fk: payload.item,
      category_type: payload.category_type ?? null,
      date_of_expiration: payload.date_of_expiration,
      web_link: payload.web_link ?? null,
    },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );
  const raw = res.data?.data ?? res.data;
  if (raw != null && typeof raw === "object")
    return normalizePublication(raw as Record<string, unknown>);
  throw new Error("Invalid create response");
}

/**
 * PUT update OEM technical publication. PUT /v1/oem-technical-publications/{id}/
 * Sends flat body: { item_fk, category_type, date_of_expiration, web_link } (snake_case).
 */
export async function updateOemPublication(
  id: number,
  payload: {
    item: number;
    category_type?: string | null;
    date_of_expiration: string;
    web_link?: string | null;
  }
): Promise<OemTechnicalPublication> {
  const body: Record<string, unknown> = {
    item_fk: payload.item,
    category_type: payload.category_type ?? "",
    date_of_expiration: payload.date_of_expiration,
    web_link: payload.web_link ?? "",
  };

  const res = await apiClient.put(
    `${PUBLICATIONS_BASE}/${id}/`,
    body,
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );
  const data = res.data ?? {};
  const raw = data?.data ?? data;
  if (raw != null && typeof raw === "object")
    return normalizePublication(raw as Record<string, unknown>);
  return normalizePublication({ id, ...body } as Record<string, unknown>);
}

/**
 * DELETE OEM technical publication. /v1/oem-technical-publications/{id}/
 */
export async function deleteOemPublication(id: number): Promise<void> {
  await apiClient.delete(`${PUBLICATIONS_BASE}/${id}/`);
}

export { getApiErrorMessage as getOemApiErrorMessage };
