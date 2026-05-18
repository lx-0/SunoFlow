import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock pino logger so tests don't write to stdout and we can assert calls
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  childLogger: vi.fn((bindings) => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    bindings,
  })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { logServerError, logError } from "./index";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

describe("logServerError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a correlation ID string", () => {
    const id = logServerError("test-source", new Error("oops"), { route: "/api/test" });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("logs to structured logger", () => {
    logServerError("test-source", new Error("test error"), {
      route: "/api/songs",
      userId: "user-1",
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it("uses provided correlationId", () => {
    const id = logServerError("src", new Error("err"), {
      route: "/api/x",
      correlationId: "my-fixed-id",
    });
    expect(id).toBe("my-fixed-id");
  });

  it("handles non-Error objects", () => {
    const id = logServerError("src", "string error", { route: "/api/x" });
    expect(typeof id).toBe("string");
    expect(logger.error).toHaveBeenCalled();
  });

  it("handles null/undefined errors", () => {
    const id = logServerError("src", null, { route: "/api/x" });
    expect(typeof id).toBe("string");
  });

  it("includes params in log", () => {
    logServerError("src", new Error("err"), {
      route: "/api/generate",
      params: { prompt: "test" },
    });
    const call = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0];
    const loggedObj = call[0] as Record<string, unknown>;
    const params = loggedObj.params as Record<string, unknown>;
    expect(params).toHaveProperty("prompt");
  });

  it("forwards source + route as Sentry tags", () => {
    logServerError("song-stale-recover-error", new Error("boom"), {
      route: "/api/songs",
      userId: "user-1",
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(Sentry.captureException).mock.calls[0][1] as
      | { tags?: Record<string, string>; extra?: Record<string, unknown> }
      | undefined;
    expect(opts?.tags).toMatchObject({
      source: "song-stale-recover-error",
      route: "/api/songs",
      userId: "user-1",
    });
  });

  it("auto-promotes songId + sunoJobId from params to Sentry tags", () => {
    logServerError("song-stale-recover-error", new Error("x"), {
      route: "/api/songs",
      params: { songId: "abc123", sunoJobId: "task-xyz", pollCount: 5 },
    });
    const opts = vi.mocked(Sentry.captureException).mock.calls[0][1] as
      | { tags?: Record<string, string>; extra?: Record<string, unknown> }
      | undefined;
    expect(opts?.tags).toMatchObject({
      songId: "abc123",
      sunoJobId: "task-xyz",
    });
    // non-indexable param (pollCount) stays in extra, not tags
    expect(opts?.tags).not.toHaveProperty("pollCount");
    expect((opts?.extra as { params?: Record<string, unknown> } | undefined)?.params).toMatchObject({
      pollCount: 5,
    });
  });

  it("skips empty / overlong / non-string indexable param values", () => {
    logServerError("src", new Error("x"), {
      route: "/api/songs",
      params: { songId: "", sunoJobId: 12345, playlistId: "x".repeat(300) },
    });
    const opts = vi.mocked(Sentry.captureException).mock.calls[0][1] as
      | { tags?: Record<string, string>; extra?: Record<string, unknown> }
      | undefined;
    expect(opts?.tags).not.toHaveProperty("songId");
    expect(opts?.tags).not.toHaveProperty("sunoJobId");
    expect(opts?.tags).not.toHaveProperty("playlistId");
  });

  it("accepts explicit tags via context.tags", () => {
    logServerError("src", new Error("x"), {
      route: "/api/songs",
      tags: { kind: "regression", region: "eu-west" },
    });
    const opts = vi.mocked(Sentry.captureException).mock.calls[0][1] as
      | { tags?: Record<string, string>; extra?: Record<string, unknown> }
      | undefined;
    expect(opts?.tags).toMatchObject({
      kind: "regression",
      region: "eu-west",
    });
  });

  it("keeps params + correlationId + userId in Sentry extra", () => {
    logServerError("src", new Error("x"), {
      route: "/api/songs",
      userId: "user-1",
      params: { songId: "abc", note: "anything" },
      correlationId: "fixed-id",
    });
    const opts = vi.mocked(Sentry.captureException).mock.calls[0][1] as
      | { tags?: Record<string, string>; extra?: Record<string, unknown> }
      | undefined;
    const extra = opts?.extra ?? {};
    expect(extra.correlationId).toBe("fixed-id");
    expect(extra.userId).toBe("user-1");
    expect(extra.params).toMatchObject({ songId: "abc", note: "anything" });
  });
});

describe("logError (client)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    // logError is "use client" — it assumes window/navigator/fetch exist.
    // Stub a minimal browser-like global so the test runner (Node) doesn't
    // ReferenceError.
    fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("window", { location: { href: "https://example.test/page", pathname: "/page" } });
    vi.stubGlobal("navigator", { userAgent: "test-agent" });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("writes a structured entry to console.error", () => {
    logError("component", new Error("client error"));
    expect(console.error).toHaveBeenCalledWith(
      "[SunoFlow Error]",
      expect.objectContaining({ source: "component" }),
    );
  });

  it("POSTs the error to /api/error-report with message + stack + source", () => {
    logError("component", new Error("client error"));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/error-report",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"source":"component"'),
      }),
    );
  });

  it("captures the error to Sentry with a 'source' tag", () => {
    logError("component", new Error("client error"));
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(Sentry.captureException).mock.calls[0][1] as
      | { tags?: Record<string, string>; extra?: Record<string, unknown> }
      | undefined;
    expect(opts?.tags).toMatchObject({ source: "component" });
  });

  it("handles non-Error objects by wrapping them in Error", () => {
    logError("component", "plain string error");
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.any(Object),
    );
  });

  it("falls back to window.location.pathname when no route override is provided", () => {
    logError("component", new Error("err"));
    const opts = vi.mocked(Sentry.captureException).mock.calls[0][1] as
      | { extra?: { route?: string } }
      | undefined;
    expect(opts?.extra?.route).toBe("/page");
  });

  it("uses the explicit route argument when provided", () => {
    logError("component", new Error("err"), "/dashboard");
    const opts = vi.mocked(Sentry.captureException).mock.calls[0][1] as
      | { extra?: { route?: string } }
      | undefined;
    expect(opts?.extra?.route).toBe("/dashboard");
  });

  it("swallows fetch failures silently (console.error + Sentry must still fire)", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("offline"));
    logError("component", new Error("err"));
    expect(console.error).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it("does not throw when Sentry.captureException throws on client", () => {
    vi.mocked(Sentry.captureException).mockImplementationOnce(() => {
      throw new Error("sentry-down");
    });
    expect(() => logError("component", new Error("err"))).not.toThrow();
  });
});

describe("logServerError (resilience)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not throw when Sentry.captureException throws on server", () => {
    vi.mocked(Sentry.captureException).mockImplementationOnce(() => {
      throw new Error("sentry-down");
    });
    expect(() =>
      logServerError("server-component", new Error("err"), { route: "/api/test" }),
    ).not.toThrow();
  });
});
