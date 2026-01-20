import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1/", // Automatically uses dev or prod URL
});

// Optional: Add interceptors for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
