import api from "./index";

export const getAircrafts = (page = 1, limit=10, search="") => 
    api.get(`aircraft/?limit=${limit}&page=${page}&search=${search}`);


export const getAircraftById = (id: number) => api.get(`/aircrafts/${id}`);
export const createAircraft = (data: any) => api.post("/aircrafts", data);
export const updateAircraft = (id: number, data: any) => api.put(`/aircrafts/${id}`, data);
export const deleteAircraft = (id: number) => api.delete(`/aircrafts/${id}`);