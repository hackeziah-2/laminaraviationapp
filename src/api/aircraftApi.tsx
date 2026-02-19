import apiClient from "./index";
import { Aircraft } from "../types/Aircraft";
import { toCamel } from "../utility/utils";

export const getAircrafts = (
  page = 1,
  limit = 10,
  search = "",
  status = "",
  sortParam = ""
) => {
  const params = new URLSearchParams();

  params.append("page", page.toString());
  params.append("limit", limit.toString());

  if (search.trim() !== "") {
    params.append("search", search);
  }

  if (status && status !== "all") {
    params.append("status", status);
  }

  if (sortParam) {
    params.append("sort", sortParam);
  }

  return apiClient.get(`aircraft/paged?${params.toString()}`);
};

export const getAircraftAll = (page = 1, limit = 10, search = "") =>
  apiClient.get(`aircraft/paged?limit=${limit}&page=${page}&search=${search}`);

// export const updateAircraft = async (id: number, data: any) => {
//   try {
//     const response = await apiClient.put<Aircraft>(`/aircraft/${id}`, data);
//     return toCamel(response.data);
//   } catch (error) {
//     // rethrow to be handled by caller
//     throw error;
//   }
// };

export const updateAircraft = async (id: number, formData: FormData) => {
  try {
    const response = await apiClient.put<Aircraft>(`/aircraft/${id}`, formData);
    return toCamel(response.data);
  } catch (error) {
    // rethrow to be handled by caller
    throw error;
  }
};

export const getAircraftById = (id: number) => apiClient.get(`/aircraft/${id}`);
// export const createAircraft = (data: any) => apiClient.post("/aircrafts", data);
export const deleteAircraft = (id: number) =>
  apiClient.delete(`aircraft/${id}`);

export const createAircraft = async (formData: FormData) => {
  try {
    const response = await apiClient.post("/aircraft/", formData);
    return toCamel(response.data);
  } catch (error) {
    throw error;
  }
};

export const createReportAircraft = async (data: any): Promise<Blob> => {
  try {
    const response = await apiClient.post("aircraft/reports/excel", data, {
      responseType: "blob", // <- important
    });
    return response.data; // Axios returns the blob here
  } catch (error) {
    throw error;
  }
};

export const createReportPDFAircraft = async (
  data: any, // request payload
  headers: Record<string, string> = {} // optional headers
): Promise<Blob> => {
  try {
    const response = await apiClient.post("aircraft/reports/pdf", data, {
      headers, // headers go inside the third argument
      responseType: "blob", // important to get PDF as Blob
    });

    return response.data; // Blob of the PDF
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

/**
 * Import aircraft from Excel file.
 * POST api/v1/excel-data/aircraft/import
 */
export const importAircraftExcel = async (file: File): Promise<{ data?: unknown }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("excel-data/aircraft/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data ?? response;
};
