import apiClient from "./index";
import { Aircraft } from "../types/Aircraft";

function toCamel<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const key in obj) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = obj[key];
  }
  return result;
}

export const getAircrafts = (
  page = 1,
  limit = 10,
  search = "",
  status = ""
) => {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", limit.toString());

  if (search.trim() !== "") {
    params.append("search", search);
  }

  if (status) {
    params.append("status", status);
  }

  return apiClient.get(`aircraft/paged?${params.toString()}`);
};

export const getAircraftAll = (page = 1, limit = 10, search = "") =>
  apiClient.get(`aircraft/paged?limit=${limit}&page=${page}&search=${search}`);

export const updateAircraft = async (id: number, data: any) => {
  try {
    const response = await apiClient.put<Aircraft>(`/aircraft/${id}`, data);
    return toCamel(response.data);
  } catch (error) {
    // rethrow to be handled by caller
    throw error;
  }
};

export const getAircraftById = (id: number) => apiClient.get(`/aircraft/${id}`);
export const createAircraft = (data: any) => apiClient.post("/aircrafts", data);
export const deleteAircraft = (id: number) =>
  apiClient.delete(`/aircrafts/${id}`);
