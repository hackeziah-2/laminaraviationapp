import axios from "axios";
import { getApiOrigin } from "../utility/apiOrigin";

declare module "axios" {
  interface AxiosRequestConfig {
    /** When true, 401 responses do not clear tokens or redirect to /login. */
    skipAuthRedirect?: boolean;
    skipGlobalErrorLog?: boolean;
  }
}

const baseURL = getApiOrigin().httpBaseWithSlash;

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const skip =
      (error.config as { skipGlobalErrorLog?: boolean } | undefined)
        ?.skipGlobalErrorLog === true;
    if (!skip) {
      console.error("API Error:", error.response?.data || error.message);
    }
    const skipAuthRedirect =
      (error.config as { skipAuthRedirect?: boolean } | undefined)
        ?.skipAuthRedirect === true;
    if (error?.response?.status === 401 && !skipAuthRedirect) {
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
