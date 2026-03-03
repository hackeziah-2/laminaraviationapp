import apiClient from "./index";

export interface AtlItem {
  id: number;
  sequenceNo?: string;
  code?: string;
  reference?: string;
  /** Display label: sequence number or code/reference */
  label: string;
}

const ATL_PATH = "atl/";

/**
 * Get list of ATL for select/search dropdown. Search uses sequence number.
 * GET api/v1/atl/?sequence_number=  or  api/v1/aircraft/{id}/atl/?sequence_number=
 */
export const getAtlList = async (
  sequenceNumber = "",
  aircraftId?: number
): Promise<AtlItem[]> => {
  const params = new URLSearchParams();
  if (sequenceNumber.trim()) params.append("sequence_number", sequenceNumber.trim());
  const url = aircraftId != null && aircraftId > 0
    ? `aircraft/${aircraftId}/atl/?${params.toString()}`
    : `${ATL_PATH}?${params.toString()}`;
  try {
    const res = await apiClient.get(url, {
      headers: { Accept: "application/json" },
    });
    const data = res.data?.data ?? res.data;
    const raw = Array.isArray(data) ? data : data?.results ?? data?.items ?? [];
    const list = Array.isArray(raw) ? raw : [];
    return list.map((r: any) => {
      const id = r.id ?? r.pk ?? 0;
      const seqNo = r.sequence_no ?? r.sequence_number ?? r.sequenceNo ?? "";
      const code = r.code ?? r.atl_code ?? "";
      const ref = r.reference ?? r.atl_ref ?? r.atl_reference ?? "";
      const label = seqNo || [code, ref].filter(Boolean).join(" - ") || String(id);
      return { id, sequenceNo: seqNo, code, reference: ref, label };
    });
  } catch {
    return [];
  }
};
