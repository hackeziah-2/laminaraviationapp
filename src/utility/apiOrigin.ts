type ApiOriginEnv = {
  viteApiUrl?: string;
  viteWsUrl?: string;
  isProd?: boolean;
  origin?: string;
  hostname?: string;
};

const DEFAULT_API = "http://localhost:8000/api/v1/";
const SAME_ORIGIN_API_PATH = "/api/v1/";

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Resolves HTTP and WebSocket API bases for dev (Vite proxy), Docker/nginx (same-origin),
 * and direct backend URLs. Mirrors axios baseURL rules so REST and WS stay aligned.
 */
export function resolveApiOrigin(env: ApiOriginEnv = {}) {
  const viteApiUrl = env.viteApiUrl;
  const viteWsUrl = env.viteWsUrl;
  const isProd = env.isProd ?? import.meta.env.PROD;
  const origin = env.origin;
  const hostname = env.hostname ?? "";

  const isBrowser = Boolean(origin);
  const isProdHost = isBrowser && !isLocalHost(hostname);

  let candidate = viteApiUrl?.replace(/\/?$/, "/");

  if (
    isProd &&
    isProdHost &&
    candidate &&
    /localhost|127\.0\.0\.1/i.test(candidate)
  ) {
    candidate = SAME_ORIGIN_API_PATH;
  }

  candidate =
    candidate ||
    (isProdHost ? SAME_ORIGIN_API_PATH : undefined) ||
    DEFAULT_API;

  if (isBrowser && candidate.startsWith("/")) {
    candidate = `${origin}${candidate}`;
  }

  const httpBaseWithSlash = candidate;
  const httpBase = httpBaseWithSlash.replace(/\/$/, "");

  const wsBase = viteWsUrl
    ? viteWsUrl.replace(/\/$/, "")
    : httpBase.replace(/^http/, "ws");

  return { httpBaseWithSlash, httpBase, wsBase };
}

export function getApiOrigin() {
  const isBrowser = typeof window !== "undefined";
  return resolveApiOrigin({
    viteApiUrl: import.meta.env.VITE_API_URL as string | undefined,
    viteWsUrl: import.meta.env.VITE_WS_URL as string | undefined,
    isProd: import.meta.env.PROD,
    origin: isBrowser ? window.location.origin : undefined,
    hostname: isBrowser ? window.location.hostname : undefined,
  });
}
