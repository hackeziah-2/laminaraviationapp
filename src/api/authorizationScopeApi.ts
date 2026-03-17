import apiClient from "./index";

/** Scope option for dropdown: value is id, label is for display. */
export interface AuthorizationScopeOption {
  id: number;
  label: string;
}

/**
 * Fetch list of scope options for dropdown.
 * GET /api/v1/authorization-scope-{type}/list
 * Returns array of { id, label } (API may return id + name/value/label).
 */
async function fetchScopeList(type: "cessna" | "baron" | "others"): Promise<AuthorizationScopeOption[]> {
  const path = `authorization-scope-${type}/list`;
  const response = await apiClient.get(path, { headers: { Accept: "application/json" } });
  const raw = response.data;
  const data = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as any)?.results)
      ? (raw as any).results
      : Array.isArray((raw as any)?.items)
        ? (raw as any).items
        : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : [];
  const list = Array.isArray(data) ? data : [];
  return list
    .map((item: unknown, index: number): AuthorizationScopeOption | null => {
      if (item != null && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const id = Number(o.id ?? o.pk ?? index + 1);
        const label = String(o.name ?? o.value ?? o.label ?? o.scope ?? "").trim();
        if (label.length > 0 && Number.isFinite(id)) return { id, label };
      }
      if (typeof item === "string") {
        const label = (item as string).trim();
        if (label.length > 0) return { id: index + 1, label };
      }
      return null;
    })
    .filter((opt): opt is AuthorizationScopeOption => opt != null);
}

/** GET authorization-scope-cessna/list - for Authorization Scope (Cessna 150, 152, 172) dropdown */
export async function getAuthorizationScopeCessnaList(): Promise<AuthorizationScopeOption[]> {
  try {
    return await fetchScopeList("cessna");
  } catch {
    return [];
  }
}

/** GET authorization-scope-baron/list - for Authorization Scope (Baron 95-C55) dropdown */
export async function getAuthorizationScopeBaronList(): Promise<AuthorizationScopeOption[]> {
  try {
    return await fetchScopeList("baron");
  } catch {
    return [];
  }
}

/** GET authorization-scope-others/list - for Authorization Scope (Others) dropdown */
export async function getAuthorizationScopeOthersList(): Promise<AuthorizationScopeOption[]> {
  try {
    return await fetchScopeList("others");
  } catch {
    return [];
  }
}

/**
 * Create new scope: POST /api/v1/authorization-scope-{type}/
 * Body: { name: string } or { value: string }
 */
async function createScope(type: "cessna" | "baron" | "others", value: string): Promise<void> {
  const path = `authorization-scope-${type}/`;
  await apiClient.post(
    path,
    { name: value.trim(), value: value.trim() },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );
}

/** POST authorization-scope-cessna/ - create new Cessna scope */
export async function createAuthorizationScopeCessna(value: string): Promise<void> {
  await createScope("cessna", value);
}

/** POST authorization-scope-baron/ - create new Baron scope */
export async function createAuthorizationScopeBaron(value: string): Promise<void> {
  await createScope("baron", value);
}

/** POST authorization-scope-others/ - create new Others scope */
export async function createAuthorizationScopeOthers(value: string): Promise<void> {
  await createScope("others", value);
}
