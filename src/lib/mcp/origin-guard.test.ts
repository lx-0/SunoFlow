import { describe, it, expect, afterEach, vi } from "vitest";
import { checkOrigin } from "./origin-guard";

function reqWithOrigin(origin?: string): Request {
  const headers: Record<string, string> = {};
  if (origin !== undefined) headers.origin = origin;
  return new Request("http://test/mcp", { method: "POST", headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkOrigin", () => {
  it("accepts an allowlisted origin", () => {
    const result = checkOrigin(reqWithOrigin("https://claude.ai"));
    expect(result.ok).toBe(true);
    expect(result.origin).toBe("https://claude.ai");
  });

  it("rejects a non-allowlisted origin", () => {
    const result = checkOrigin(reqWithOrigin("https://evil.example"));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("blocked");
  });

  it("accepts a missing Origin header in production (non-browser clients)", () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = checkOrigin(reqWithOrigin());
    expect(result.ok).toBe(true);
    expect(result.origin).toBeNull();
  });

  it("accepts a missing Origin header in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = checkOrigin(reqWithOrigin());
    expect(result.ok).toBe(true);
  });

  it("still rejects a bad origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const result = checkOrigin(reqWithOrigin("https://evil.example"));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("blocked");
  });

  it("respects MCP_ALLOWED_ORIGINS override", () => {
    vi.stubEnv("MCP_ALLOWED_ORIGINS", "https://my-client.example");
    expect(checkOrigin(reqWithOrigin("https://my-client.example")).ok).toBe(true);
    expect(checkOrigin(reqWithOrigin("https://claude.ai")).ok).toBe(false);
  });

  it("wildcard disables the check", () => {
    vi.stubEnv("MCP_ALLOWED_ORIGINS", "*");
    expect(checkOrigin(reqWithOrigin("https://anything.example")).ok).toBe(true);
    expect(checkOrigin(reqWithOrigin()).ok).toBe(true);
  });
});
