import axios from "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    /** When true, 401 responses do not clear tokens or redirect to /login. */
    skipAuthRedirect?: boolean;
    skipGlobalErrorLog?: boolean;
  }
}

const rawViteApiUrl = import.meta.env.VITE_API_URL as string | undefined;

function resolveBaseURL(): string {
  const fromEnv = rawViteApiUrl?.replace(/\/?$/, "/");
  const isBrowser = typeof window !== "undefined";
  const isProdHost =
    isBrowser && !["localhost", "127.0.0.1"].includes(window.location.hostname);
  const sameOriginApi = isProdHost
    ? `${window.location.origin}/api/v1/`
    : undefined;

  // Prod builds must not call a developer localhost backend (stale/wrong VITE_API_URL at build time).
  if (
    import.meta.env.PROD &&
    isProdHost &&
    fromEnv &&
    /localhost|127\.0\.0\.1/i.test(fromEnv)
  ) {
    return sameOriginApi!;
  }

  const candidate = fromEnv || sameOriginApi || "http://localhost:8000/api/v1/";

  // Relative paths (e.g. /api/v1/) need an absolute origin for axios and URL construction.
  if (isBrowser && candidate.startsWith("/")) {
    return `${window.location.origin}${candidate}`;
  }

  return candidate;
}

const baseURL = resolveBaseURL();

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
