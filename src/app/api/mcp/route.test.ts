import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() {
    return "postgres://test:test@localhost:5432/test";
  },
  get AUTH_SECRET() {
    return "test-secret";
  },
  get NEXTAUTH_URL() {
    return "http://localhost:3000";
  },
  get SUNOAPI_KEY() {
    return "test-key";
  },
  env: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Routine rejects (401/403/429) must NOT become GlitchTip exceptions — mock the
// error logger so the tests can assert it stays untouched on those paths.
vi.mock("@/lib/error-logger/server", () => ({
  logServerError: vi.fn(() => "test-correlation-id"),
  extractErrorInfo: vi.fn(() => ({ message: "", name: "Error" })),
}));

import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/error-logger/server";
import { logger } from "@/lib/logger";
import { POST } from "./route";
import { _resetMcpRateLimit } from "@/lib/mcp/rate-limit";

const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => undefined);

const COMMON_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

function initRequest(authHeader?: string): Request {
  return new Request("http://test/api/mcp", {
    method: "POST",
    headers: {
      ...COMMON_HEADERS,
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test-client", version: "0.0.1" },
      },
    }),
  });
}

describe("POST /api/mcp", () => {
  beforeEach(() => {
    vi.mocked(prisma.apiKey.findFirst).mockReset();
    vi.mocked(prisma.apiKey.update).mockReset();
    vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);
    vi.mocked(logServerError).mockClear();
    warnSpy.mockClear();
    _resetMcpRateLimit();
  });

  it("returns 401 + WWW-Authenticate when Authorization header is missing", async () => {
    const res = await POST(initRequest());
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/^Bearer/);
    expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
    // Routine auth reject: structured warn only, never a GlitchTip exception.
    expect(logServerError).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ source: "mcp.auth.rejected" }),
      "mcp request rejected",
    );
  });

  it("returns 401 when scheme is not Bearer", async () => {
    const res = await POST(initRequest("Basic dXNlcjpwYXNz"));
    expect(res.status).toBe(401);
  });

  it("returns 401 when the key is not a valid sk- prefix", async () => {
    const res = await POST(initRequest("Bearer not-a-key"));
    expect(res.status).toBe(401);
    expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
  });

  it("returns 401 when the key is unknown to the DB", async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null);
    const res = await POST(initRequest("Bearer sk-unknown"));
    expect(res.status).toBe(401);
    expect(prisma.apiKey.findFirst).toHaveBeenCalledOnce();
  });

  it("accepts initialize when the Bearer key is valid", async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      userId: "user-abc",
    } as never);

    const res = await POST(initRequest("Bearer sk-valid"));
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    const body = await res.text();
    expect(body).toMatch(/protocolVersion|serverInfo|sunoflow-mcp/);
  });

  it("lists all 16 registered tools after initialize", async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      userId: "user-abc",
    } as never);

    await POST(initRequest("Bearer sk-valid"));

    const listRes = await POST(
      new Request("http://test/api/mcp", {
        method: "POST",
        headers: { ...COMMON_HEADERS, authorization: "Bearer sk-valid" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      }),
    );
    expect(listRes.status).toBeGreaterThanOrEqual(200);
    expect(listRes.status).toBeLessThan(300);
    const body = await listRes.text();
    for (const name of [
      "sunoflow_info",
      "generate_song",
      "extend_song",
      "list_songs",
      "get_song",
      "create_playlist",
      "add_to_playlist",
      "get_credits",
      "generate_lyrics",
      "boost_style",
      "separate_vocals",
      "convert_to_wav",
      "generate_midi",
      "create_music_video",
      "generate_cover_image",
      "generate_sounds",
    ]) {
      expect(body).toContain(name);
    }
  });

  it("returns server version + tool inventory from sunoflow_info call", async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      userId: "user-xyz",
    } as never);

    await POST(initRequest("Bearer sk-valid"));

    const callRes = await POST(
      new Request("http://test/api/mcp", {
        method: "POST",
        headers: { ...COMMON_HEADERS, authorization: "Bearer sk-valid" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "sunoflow_info", arguments: {} },
        }),
      }),
    );
    expect(callRes.status).toBeGreaterThanOrEqual(200);
    expect(callRes.status).toBeLessThan(300);
    const body = await callRes.text();
    expect(body).toContain("sunoflow-mcp");
    expect(body).toContain("generate_song");
  });

  it("lists resource templates after initialize (songs + playlists)", async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      userId: "user-abc",
    } as never);

    await POST(initRequest("Bearer sk-valid"));

    const tmplRes = await POST(
      new Request("http://test/api/mcp", {
        method: "POST",
        headers: { ...COMMON_HEADERS, authorization: "Bearer sk-valid" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 4,
          method: "resources/templates/list",
        }),
      }),
    );
    expect(tmplRes.status).toBeGreaterThanOrEqual(200);
    expect(tmplRes.status).toBeLessThan(300);
    const body = await tmplRes.text();
    expect(body).toMatch(/sunoflow:\/\//);
  });

  it("returns 403 when the Origin header is in a non-allowed value", async () => {
    const res = await POST(
      new Request("http://test/api/mcp", {
        method: "POST",
        headers: {
          ...COMMON_HEADERS,
          authorization: "Bearer sk-valid",
          origin: "https://evil.example.com",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 99,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "evil", version: "0" },
          },
        }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.reason).toBe("origin blocked");
    // Origin check runs before auth, so no DB lookup happened.
    expect(prisma.apiKey.findFirst).not.toHaveBeenCalled();
    // Routine origin reject: structured warn only, never a GlitchTip exception.
    expect(logServerError).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "mcp.origin.rejected",
        origin: "https://evil.example.com",
      }),
      "mcp request rejected",
    );
  });

  it("accepts allow-listed Origin (https://claude.ai)", async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      userId: "user-abc",
    } as never);
    const res = await POST(
      new Request("http://test/api/mcp", {
        method: "POST",
        headers: {
          ...COMMON_HEADERS,
          authorization: "Bearer sk-valid",
          origin: "https://claude.ai",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 100,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "claude", version: "0" },
          },
        }),
      }),
    );
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  });

  it("returns 429 + Retry-After after the per-key rate limit is exceeded", async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-rl",
      userId: "user-rl",
    } as never);
    const originalRpm = process.env.MCP_RATE_LIMIT_RPM;
    process.env.MCP_RATE_LIMIT_RPM = "3";
    try {
      // Exhaust the bucket (3 requests allowed)
      for (let i = 0; i < 3; i++) {
        const ok = await POST(initRequest("Bearer sk-throttle"));
        expect(ok.status).toBeLessThan(400);
      }
      // 4th must be 429
      const blocked = await POST(initRequest("Bearer sk-throttle"));
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("retry-after")).toMatch(/^\d+$/);
      expect(blocked.headers.get("x-ratelimit-limit")).toBe("3");
      // Routine rate-limit reject: structured warn only, never a GlitchTip exception.
      expect(logServerError).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "mcp.rate_limit.exceeded",
          userId: "user-rl",
          limit: 3,
        }),
        "mcp request rejected",
      );
    } finally {
      if (originalRpm !== undefined) {
        process.env.MCP_RATE_LIMIT_RPM = originalRpm;
      } else {
        delete process.env.MCP_RATE_LIMIT_RPM;
      }
    }
  });

  it("lists static resources after initialize", async () => {
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      userId: "user-abc",
    } as never);

    await POST(initRequest("Bearer sk-valid"));

    const resRes = await POST(
      new Request("http://test/api/mcp", {
        method: "POST",
        headers: { ...COMMON_HEADERS, authorization: "Bearer sk-valid" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 5,
          method: "resources/list",
        }),
      }),
    );
    expect(resRes.status).toBeGreaterThanOrEqual(200);
    expect(resRes.status).toBeLessThan(300);
    const body = await resRes.text();
    // At least one static resource must be advertised (credits).
    expect(body).toContain("sunoflow://");
  });
});
