import { useState, useEffect } from "react";
import { getAircraftAll, getAircrafts } from "../api/aircraftApi";

interface Aircraft {
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
}

export const useAircrafts = (
  page: number,
  limit: number,
  search: string,
  status: string,
  sortParam: any
) => {
  const [aircrafts, setAircrafts] = useState<Aircraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPage, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAircrafts(page, limit, search, status, sortParam)
      .then((res) => {
        setAircrafts(res.data.items);
        setTotalPages(res.data.pages);
        setTotalItems(res.data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() =>
        setTimeout(() => {
          setLoading(false);
        }, 360)
      );
  }, [page, limit, search, status, sortParam]);

  return { aircrafts, loading, error, totalItems, page, totalPage };
};

export const useAircraftPaged = (
  page: number,
  limit: number,
  search: string
) => {
  const [aircraftData, setAircrafts] = useState<Aircraft[]>([]);
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
      .finally(() => setLoading(false));
  }, [page, limit, search]);

  return { aircraftData, load, err, total };
};
