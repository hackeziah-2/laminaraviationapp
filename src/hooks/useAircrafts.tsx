import { useState, useEffect, useCallback } from "react";
import { getAircraftAll, getAircrafts } from "../api/aircraftApi";

export interface AircraftRow {
  id: number;
  registration: string;
  type: string;
  model: string;
  msn: string;
  base: string;
  ownership: string;
  status: "Active" | "Inactive" | "Maintenance";
  ownershipType: string;
  serviceManualYear: string;
  ipcYear: string;
  engineModel: string;
  engineSerialNumber: string;
  engineARC: string;
  propellerModel: string;
  propellerSerialNumber: string;
  propellerARC: string;
  created_at: string;
  /** 1-based persistent fleet arrangement */
  displayOrder?: number;
}

function normalizeAircraftRow(raw: unknown): AircraftRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const displayOrderRaw = o.display_order ?? o.displayOrder;
  const displayOrderNum = Number(displayOrderRaw);
  return {
    ...(o as unknown as AircraftRow),
    id,
    registration: String(o.registration ?? ""),
    model: String(o.model ?? ""),
    msn: String(o.msn ?? ""),
    base: String(o.base ?? ""),
    status: (o.status as AircraftRow["status"]) ?? "Active",
    displayOrder: Number.isFinite(displayOrderNum)
      ? displayOrderNum
      : undefined,
  };
}

export const useAircrafts = (
  page: number,
  limit: number,
  search: string,
  status: string,
  sortParam: any
) => {
  const [aircrafts, setAircrafts] = useState<AircraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPage, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getAircrafts(page, limit, search, status, sortParam)
      .then((res) => {
        const data = res?.data ?? {};
        const rawItems = data.items ?? data.results ?? data.data ?? [];
        const list = Array.isArray(rawItems) ? rawItems : [];
        const total = Number(data.total ?? data.count ?? list.length) || 0;
        const safeLimit = Number(limit) || 10;
        const pages = Math.max(
          1,
          Math.min(
            9999,
            Number(data.pages ?? data.total_pages) ||
              Math.ceil(total / safeLimit) ||
              1
          )
        );
        setAircrafts(
          list
            .map(normalizeAircraftRow)
            .filter((item): item is AircraftRow => item != null)
        );
        setTotalPages(pages);
        setTotalItems(total);
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to load aircraft");
        setAircrafts([]);
        setTotalPages(0);
        setTotalItems(0);
      })
      .finally(() => {
        setTimeout(() => setLoading(false), 360);
      });
  }, [page, limit, search, status, sortParam, refreshKey]);

  return {
    aircrafts,
    setAircrafts,
    loading,
    error,
    totalItems,
    page,
    totalPage,
    refresh,
  };
};

export const useAircraftPaged = (
  page: number,
  limit: number,
  search: string
) => {
  const [aircraftData, setAircrafts] = useState<AircraftRow[]>([]);
  const [load, setLoading] = useState(true);
  const [err, setError] = useState<string | null>(null);
  const [total, setTotalPages] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAircraftAll(page, limit, search)
      .then((res) => {
        setAircrafts(res.data);
        setTotalPages(res.data.total_pages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setTimeout(() => setLoading(false), 360));
  }, [page, limit, search]);

  return { aircraftData, load, err, total };
};
