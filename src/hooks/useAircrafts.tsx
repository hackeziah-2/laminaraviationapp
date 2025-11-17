import { useState, useEffect } from "react";
import { getAircrafts } from "../api/aircraftApi";

export const useAircrafts = (page: number, limit: number, search: string) => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPage, setTotalPages] = useState(0);

    
  useEffect(() => {
    setLoading(true);
    setError(null);
    getAircrafts(page, limit, search)
      .then(res => {
        setAircrafts(res.data);
        setTotalPages(res.data.total_pages);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, limit, search]);

  return { aircrafts, loading, error, totalPage };

};