import apiClient from "../api/index";
import {
  ATL_WORK_STATUS_KEYS,
  type AtlWorkStatusKey,
  normalizeAtlWorkStatus,
} from "../utility/atlEditRbac";

export interface BulkAtlWorkStatusRequest {
  ids: number[];
  work_status: AtlWorkStatusKey;
  atomic?: boolean;
}

export interface BulkAtlWorkStatusFailedItem {
  id: number;
  reason: string;
}

export interface BulkAtlWorkStatusResponse {
  updated_count: number;
  failed_count: number;
  updated_ids: number[];
  failed_items: BulkAtlWorkStatusFailedItem[];
}

export class BulkAtlWorkStatusValidationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = "BulkAtlWorkStatusValidationError";
  }
}

/** Normalize request: non-empty unique ids, valid work_status, atomic default false. */
export function validateBulkAtlWorkStatusRequest(
  ids: unknown,
  work_status: unknown,
  atomic?: unknown
): BulkAtlWorkStatusRequest {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BulkAtlWorkStatusValidationError("ids must not be empty");
  }

  const numericIds = ids.map((id) => Number(id));
  if (numericIds.some((id) => !Number.isFinite(id) || id <= 0)) {
    throw new BulkAtlWorkStatusValidationError(
      "ids must contain valid ATL record ids"
    );
  }

  const uniqueIds = [...new Set(numericIds)];

  const status = normalizeAtlWorkStatus(String(work_status ?? ""));
  if (!status || !(ATL_WORK_STATUS_KEYS as readonly string[]).includes(status)) {
    throw new BulkAtlWorkStatusValidationError(
      "work_status must be a valid ATL work status"
    );
  }

  return {
    ids: uniqueIds,
    work_status: status,
    atomic: atomic === true,
  };
}

export function normalizeBulkAtlWorkStatusResponse(
  raw: unknown
): BulkAtlWorkStatusResponse {
  const obj =
    raw && typeof raw === "object"
      ? ((raw as Record<string, unknown>).data ?? raw)
      : {};
  const data = obj as Record<string, unknown>;

  const updatedIdsRaw = data.updated_ids ?? data.updatedIds ?? [];
  const failedItemsRaw = data.failed_items ?? data.failedItems ?? [];

  const updated_ids = (Array.isArray(updatedIdsRaw) ? updatedIdsRaw : [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const failed_items = (Array.isArray(failedItemsRaw) ? failedItemsRaw : [])
    .map((item) => {
      const row = item as Record<string, unknown>;
      const id = Number(row.id ?? 0);
      const reason = String(
        row.reason ?? row.message ?? row.detail ?? "Update failed"
      );
      return { id, reason };
    })
    .filter((item) => Number.isFinite(item.id) && item.id > 0);

  const updated_count = Number(
    data.updated_count ?? data.updatedCount ?? updated_ids.length
  );
  const failed_count = Number(
    data.failed_count ?? data.failedCount ?? failed_items.length
  );

  return {
    updated_count: Number.isFinite(updated_count)
      ? Math.max(0, updated_count)
      : updated_ids.length,
    failed_count: Number.isFinite(failed_count)
      ? Math.max(0, failed_count)
      : failed_items.length,
    updated_ids,
    failed_items,
  };
}

/**
 * PUT /api/v1/aircraft-technical-log/work-status/bulk
 */
export async function bulkUpdateAtlWorkStatus(
  request: BulkAtlWorkStatusRequest
): Promise<BulkAtlWorkStatusResponse> {
  const body = validateBulkAtlWorkStatusRequest(
    request.ids,
    request.work_status,
    request.atomic
  );

  try {
    const response = await apiClient.put(
      "aircraft-technical-log/work-status/bulk",
      {
        ids: body.ids,
        work_status: body.work_status,
        atomic: body.atomic ?? false,
      }
    );
    return normalizeBulkAtlWorkStatusResponse(response.data);
  } catch (err: unknown) {
    const axiosErr = err as {
      response?: { status?: number; data?: unknown };
    };
    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;

    if (status === 404) {
      throw new BulkAtlWorkStatusValidationError(
        "No matching ATL records were found.",
        404
      );
    }

    if (data && typeof data === "object") {
      const normalized = normalizeBulkAtlWorkStatusResponse(data);
      if (
        normalized.updated_count > 0 ||
        normalized.failed_count > 0 ||
        normalized.failed_items.length > 0
      ) {
        return normalized;
      }
      const detail = (data as Record<string, unknown>).detail;
      if (typeof detail === "string" && detail.trim()) {
        throw new BulkAtlWorkStatusValidationError(detail, status ?? 400);
      }
    }

    throw err;
  }
}
