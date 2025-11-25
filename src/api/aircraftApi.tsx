import apiClient from "./index";

// export const getAircrafts = (page = 1, limit = 10, search="", status="") => 
// apiClient.get(`aircraft/paged?limit=${limit}&page=${page}&search=${search}&status=${status}`);


export const getAircrafts = (page = 1, limit = 10, search = "", status = "") => {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
  
    if (search.trim() !== "") {
      params.append("search", search);
    }
  
    if (status ) {
      params.append("status", status);
    }
  
    return apiClient.get(`aircraft/paged?${params.toString()}`);
  };

export const getAircraftAll = (page = 1, limit = 10, search="") => 
apiClient.get(`aircraft/paged?limit=${limit}&page=${page}&search=${search}`);

export const getAircraftById = (id: number) => apiClient.get(`/aircraft/${id}`);
export const createAircraft = (data: any) => apiClient.post("/aircrafts", data);
export const updateAircraft = (id: number, data: any) => apiClient.put(`/aircrafts/${id}`, data);
export const deleteAircraft = (id: number) => apiClient.delete(`/aircrafts/${id}`);