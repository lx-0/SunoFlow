import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logServerError, logError } from "./error-logger";

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

import { logger } from "@/lib/logger";

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
});

describe("logError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an error (server-side uses structured logger)", () => {
    logError("component", new Error("client error"));
    // Server-side: pino logger.error; client-side: console.error
    // In vitest (Node.js), typeof window === "undefined", so logger.error is used
    expect(logger.error).toHaveBeenCalled();
  });

  it("handles non-Error objects", () => {
    logError("component", "plain string error");
    expect(logger.error).toHaveBeenCalled();
  });

  it("accepts optional route", () => {
    logError("component", new Error("err"), "/dashboard");
    expect(logger.error).toHaveBeenCalled();
  });
});
