import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: vi.fn() },
    jamSession: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    jamSessionEntry: { findFirst: vi.fn(), update: vi.fn() },
    playlist: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createJamSession,
  closeJamSession,
  getJamSession,
  isJamSessionExpired,
  listJamSessions,
  vetoJamEntry,
} from "./sessions";

const SESSION = {
  id: "jam-1",
  playlistId: "pl-1",
  shareToken: "tok-1",
  status: "open",
  budgetTotal: 30,
  budgetUsed: 0,
  expiresAt: null,
  createdAt: new Date("2026-07-22T12:00:00Z"),
  closedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ tier: "studio" } as never);
  vi.mocked(prisma.jamSession.count).mockResolvedValue(0 as never);
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") {
      return fn({
        playlist: { create: vi.fn().mockResolvedValue({ id: "pl-1" }) },
        jamSession: { create: vi.fn().mockResolvedValue(SESSION) },
      });
    }
    return [];
  });
});

describe("createJamSession", () => {
  it("rejects non-studio tiers", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ tier: "pro" } as never);

    const result = await createJamSession("user-1", {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("treats a missing subscription as free tier", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null as never);

    const result = await createJamSession("user-1", {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("creates playlist + session for a studio host", async () => {
    const result = await createJamSession("user-1", { budgetTotal: 20 });

    expect(result).toEqual({ ok: true, data: { session: SESSION } });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it.each([[0], [101], [10.5]])("rejects invalid budget %s", async (budgetTotal) => {
    const result = await createJamSession("user-1", { budgetTotal });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("caps open sessions per host", async () => {
    vi.mocked(prisma.jamSession.count).mockResolvedValue(3 as never);

    const result = await createJamSession("user-1", {});

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("LIMIT_REACHED");
  });

  it.each([["ab"], ["has space"], ["Ümläut!"], ["a".repeat(41)]])(
    "rejects invalid slug %s",
    async (slug) => {
      const result = await createJamSession("user-1", { slug });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it("normalizes the slug to lowercase and stores it as the share token", async () => {
    let createData: Record<string, unknown> | null = null;
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn({
          playlist: { create: vi.fn().mockResolvedValue({ id: "pl-1" }) },
          jamSession: {
            create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
              createData = args.data;
              return Promise.resolve(SESSION);
            }),
          },
        });
      }
      return [];
    });

    const result = await createJamSession("user-1", { slug: "Alex-Party" });

    expect(result.ok).toBe(true);
    expect(createData).toMatchObject({ shareToken: "alex-party" });
    expect((createData as Record<string, unknown> | null)?.expiresAt).toBeInstanceOf(Date);
  });

  it("maps a slug collision (P2002) to CONFLICT", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const result = await createJamSession("user-1", { slug: "alex-party" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CONFLICT");
  });

  it("rejects an out-of-range duration", async () => {
    const result = await createJamSession("user-1", { durationHours: 100 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("VALIDATION_ERROR");
  });

  it("derives an auto-slug from the title with a 4-char dedupe hash", async () => {
    let createData: Record<string, unknown> | null = null;
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn({
          playlist: { create: vi.fn().mockResolvedValue({ id: "pl-1" }) },
          jamSession: {
            create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) => {
              createData = args.data;
              return Promise.resolve(SESSION);
            }),
          },
        });
      }
      return [];
    });

    const result = await createJamSession("user-1", { name: "Kitchen Party!" });

    expect(result.ok).toBe(true);
    const token = (createData as Record<string, unknown> | null)?.shareToken;
    expect(typeof token).toBe("string");
    expect(token).toMatch(/^kitchen-party-[a-z0-9]{4}$/);
  });

  it("retries the auto-slug on a hash collision instead of failing", async () => {
    let calls = 0;
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === "function") {
        calls += 1;
        if (calls === 1) {
          throw new Prisma.PrismaClientKnownRequestError("dup", {
            code: "P2002",
            clientVersion: "test",
          });
        }
        return fn({
          playlist: { create: vi.fn().mockResolvedValue({ id: "pl-1" }) },
          jamSession: { create: vi.fn().mockResolvedValue(SESSION) },
        });
      }
      return [];
    });

    const result = await createJamSession("user-1", { name: "Kitchen Party" });

    expect(result.ok).toBe(true);
    expect(calls).toBe(2);
  });
});

describe("isJamSessionExpired", () => {
  it("is false without an expiry, true past it, false for closed sessions", () => {
    expect(isJamSessionExpired({ status: "open", expiresAt: null })).toBe(false);
    expect(
      isJamSessionExpired({ status: "open", expiresAt: new Date(Date.now() - 1000) }),
    ).toBe(true);
    expect(
      isJamSessionExpired({ status: "open", expiresAt: new Date(Date.now() + 60_000) }),
    ).toBe(false);
    expect(
      isJamSessionExpired({ status: "closed", expiresAt: new Date(Date.now() - 1000) }),
    ).toBe(false);
  });
});

describe("listJamSessions / getJamSession", () => {
  it("flattens the playlist name into the session summary", async () => {
    vi.mocked(prisma.jamSession.findMany).mockResolvedValue([
      { ...SESSION, playlist: { name: "Kitchen Party" } },
    ] as never);

    const result = await listJamSessions("user-1");

    expect(result).toEqual({
      ok: true,
      data: { sessions: [{ ...SESSION, name: "Kitchen Party" }] },
    });
  });

  it("getJamSession 404s for foreign sessions", async () => {
    vi.mocked(prisma.jamSession.findFirst).mockResolvedValue(null as never);

    const result = await getJamSession("jam-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("getJamSession returns the detail incl. shareToken", async () => {
    vi.mocked(prisma.jamSession.findFirst).mockResolvedValue({
      ...SESSION,
      playlist: { name: "Kitchen Party" },
    } as never);

    const result = await getJamSession("jam-1", "user-1");

    expect(result).toEqual({
      ok: true,
      data: { session: { ...SESSION, name: "Kitchen Party" } },
    });
  });
});

describe("closeJamSession", () => {
  it("404s for foreign or unknown sessions", async () => {
    vi.mocked(prisma.jamSession.findFirst).mockResolvedValue(null as never);

    const result = await closeJamSession("jam-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("closes an open session", async () => {
    vi.mocked(prisma.jamSession.findFirst).mockResolvedValue(SESSION as never);
    const closed = { ...SESSION, status: "closed", closedAt: new Date() };
    vi.mocked(prisma.jamSession.update).mockResolvedValue(closed as never);

    const result = await closeJamSession("jam-1", "user-1");

    expect(result).toEqual({ ok: true, data: { session: closed } });
    expect(prisma.jamSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "closed" }),
      }),
    );
  });

  it("is idempotent for already-closed sessions", async () => {
    const closed = { ...SESSION, status: "closed", closedAt: new Date() };
    vi.mocked(prisma.jamSession.findFirst).mockResolvedValue(closed as never);

    const result = await closeJamSession("jam-1", "user-1");

    expect(result).toEqual({ ok: true, data: { session: closed } });
    expect(prisma.jamSession.update).not.toHaveBeenCalled();
  });
});

describe("vetoJamEntry", () => {
  beforeEach(() => {
    vi.mocked(prisma.jamSession.findFirst).mockResolvedValue({ id: "jam-1" } as never);
  });

  it("404s when the session is not owned", async () => {
    vi.mocked(prisma.jamSession.findFirst).mockResolvedValue(null as never);

    const result = await vetoJamEntry("jam-1", "entry-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("404s when the entry belongs to another session", async () => {
    vi.mocked(prisma.jamSessionEntry.findFirst).mockResolvedValue(null as never);

    const result = await vetoJamEntry("jam-1", "entry-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("only vetoes pending entries", async () => {
    vi.mocked(prisma.jamSessionEntry.findFirst).mockResolvedValue({
      id: "entry-1",
      status: "ready",
    } as never);

    const result = await vetoJamEntry("jam-1", "entry-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CONFLICT");
    expect(prisma.jamSessionEntry.update).not.toHaveBeenCalled();
  });

  it("marks a pending entry vetoed", async () => {
    vi.mocked(prisma.jamSessionEntry.findFirst).mockResolvedValue({
      id: "entry-1",
      status: "pending",
    } as never);
    vi.mocked(prisma.jamSessionEntry.update).mockResolvedValue({
      id: "entry-1",
      status: "vetoed",
    } as never);

    const result = await vetoJamEntry("jam-1", "entry-1", "user-1");

    expect(result).toEqual({ ok: true, data: { entry: { id: "entry-1", status: "vetoed" } } });
  });
});
