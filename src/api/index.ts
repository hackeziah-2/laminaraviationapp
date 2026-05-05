import axios from "axios";

const baseURL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1/").replace(/\/?$/, "/");
const api = axios.create({
  baseURL, // e.g. http://localhost:8000/api/v1/
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: Add interceptors for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const skip =
      (error.config as { skipGlobalErrorLog?: boolean } | undefined)
        ?.skipGlobalErrorLog === true;
    if (!skip) {
      console.error("API Error:", error.response?.data || error.message);
    }
    if (error?.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_username");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
