import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

vi.mock("@/lib/auth", () => ({
  generateApiKey: vi.fn(() => ({ key: "sk-testkey", hash: "deadbeefhash", prefix: "sk-testk..." })),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    apiKey: { create: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitCheck: vi.fn(),
}));

import { POST } from "./route";
import { generateApiKey, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitCheck } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

function req(body: unknown) {
  return new NextRequest("http://localhost:3000/api/v1/auth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const seg = { params: Promise.resolve({}) };

const activeUser = {
  id: "user-1",
  email: "a@b.de",
  passwordHash: "bcrypt-hash",
  isDisabled: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  (rateLimitCheck as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: {} });
  (prisma.apiKey.create as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: "key-1", name: "Mobile (iOS)", prefix: "sk-testk...", createdAt: new Date("2026-06-01T00:00:00Z"),
  });
});

describe("POST /api/v1/auth/token", () => {
  it("mints an API key for valid credentials", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await POST(req({ email: "a@b.de", password: "correct" }), seg);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.key).toBe("sk-testkey");
    expect(generateApiKey).toHaveBeenCalledOnce();
    expect(prisma.apiKey.create).toHaveBeenCalledOnce();
    // never leak the hash to the client
    expect(json.keyHash).toBeUndefined();
  });

  it("rejects a wrong password with 401 and mints nothing", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(activeUser);
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const res = await POST(req({ email: "a@b.de", password: "wrong" }), seg);
    expect(res.status).toBe(401);
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown user with 401", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(req({ email: "nope@b.de", password: "x" }), seg);
    expect(res.status).toBe(401);
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it("rejects a disabled account with 401 without checking the password", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ ...activeUser, isDisabled: true });

    const res = await POST(req({ email: "a@b.de", password: "correct" }), seg);
    expect(res.status).toBe(401);
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it("400s on a malformed body (missing password)", async () => {
    const res = await POST(req({ email: "a@b.de" }), seg);
    expect(res.status).toBe(400);
  });

  it("429s when the per-email rate limit is exceeded, before any DB lookup", async () => {
    (rateLimitCheck as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "rate limited" }, { status: 429 }),
    });

    const res = await POST(req({ email: "a@b.de", password: "x" }), seg);
    expect(res.status).toBe(429);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
