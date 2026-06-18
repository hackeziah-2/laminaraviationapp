import { describe, expect, it } from "vitest";
import { resolveApiOrigin } from "./apiOrigin";

describe("resolveApiOrigin", () => {
  it("uses same-origin /api/v1 for prod when VITE_API_URL is relative", () => {
    const { httpBase, wsBase } = resolveApiOrigin({
      viteApiUrl: "/api/v1/",
      isProd: true,
      origin: "https://fleet.example.com",
      hostname: "fleet.example.com",
    });
    expect(httpBase).toBe("https://fleet.example.com/api/v1");
    expect(wsBase).toBe("wss://fleet.example.com/api/v1");
  });

  it("derives ws from absolute http API URL for local dev", () => {
    const { httpBase, wsBase } = resolveApiOrigin({
      viteApiUrl: "http://localhost:8000/api/v1/",
      isProd: false,
      origin: "http://localhost:3000",
      hostname: "localhost",
    });
    expect(httpBase).toBe("http://localhost:8000/api/v1");
    expect(wsBase).toBe("ws://localhost:8000/api/v1");
  });

  it("routes through Vite/nginx proxy when API URL is relative in dev", () => {
    const { httpBase, wsBase } = resolveApiOrigin({
      viteApiUrl: "/api/v1/",
      isProd: false,
      origin: "http://localhost:3000",
      hostname: "localhost",
    });
    expect(httpBase).toBe("http://localhost:3000/api/v1");
    expect(wsBase).toBe("ws://localhost:3000/api/v1");
  });

  it("ignores stale localhost VITE_API_URL on non-localhost prod hosts", () => {
    const { httpBase, wsBase } = resolveApiOrigin({
      viteApiUrl: "http://localhost:8000/api/v1/",
      isProd: true,
      origin: "https://fleet.example.com",
      hostname: "fleet.example.com",
    });
    expect(httpBase).toBe("https://fleet.example.com/api/v1");
    expect(wsBase).toBe("wss://fleet.example.com/api/v1");
  });

  it("honors explicit VITE_WS_URL override", () => {
    const { wsBase } = resolveApiOrigin({
      viteApiUrl: "http://localhost:8000/api/v1/",
      viteWsUrl: "ws://custom:9000/ws",
      isProd: false,
      origin: "http://localhost:3000",
      hostname: "localhost",
    });
    expect(wsBase).toBe("ws://custom:9000/ws");
  });
});
