/**
 * Integration tests for critical Prisma model queries.
 *
 * These tests run against a real PostgreSQL database (no mocks).
 * In CI the database is provided via the postgres service in ci.yml.
 * Locally, start the database with: docker-compose up -d db
 *
 * Each test suite creates its own isolated data using a unique testRunId
 * prefix so parallel runs don't collide. All data is cleaned up in afterAll.
 */

import { PrismaClient, SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";

// Detect whether a database URL is configured; skip the whole suite if not.
const DB_URL = process.env.SUNOFLOW_DATABASE_URL ?? process.env.DATABASE_URL;
const hasDb = !!DB_URL;

// Track whether we actually established a DB connection (set in beforeAll).
let dbConnected = false;

// Unique prefix scoped to this test run so parallel CI jobs don't collide.
const RUN_ID = `integration-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const testEmail = (label: string) => `${RUN_ID}-${label}@test.invalid`;

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal User row and return it. */
async function createUser(label: string, overrides: Record<string, unknown> = {}) {
  return prisma.user.create({
    data: {
      email: testEmail(label),
      name: `Test User ${label}`,
      ...overrides,
    },
  });
}

/** Create a minimal Song for a user and return it. */
async function createSong(
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  return prisma.song.create({
    data: {
      userId,
      title: "Test Song",
      generationStatus: "ready",
      ...overrides,
    },
  });
}

// ---------------------------------------------------------------------------
// Suite-level setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  if (!hasDb) return;
  try {
    await prisma.$connect();
    // Verify connectivity with a lightweight query.
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    // DB URL is configured but server is unreachable (e.g. local dev without
    // Docker running). The describe.skipIf blocks will handle skipping.
    dbConnected = false;
  }
});

afterAll(async () => {
  // Clean up only when we actually wrote data to the database.
  if (dbConnected) {
    try {
      await prisma.user.deleteMany({
        where: { email: { contains: RUN_ID } },
      });
    } catch {
      // Best-effort cleanup; don't fail the suite on cleanup errors.
    }
  }
  await prisma.$disconnect().catch(() => {});
});

// Skip individual tests when the DB URL is configured but the server is not
// reachable (e.g. local dev without Docker running).
beforeEach((ctx) => {
  if (hasDb && !dbConnected) ctx.skip();
});

// ---------------------------------------------------------------------------
// User model
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("User model", () => {
  it("creates a user with required fields", async () => {
    const user = await createUser("user-create");
    expect(user.id).toBeTruthy();
    expect(user.email).toBe(testEmail("user-create"));
    expect(user.isAdmin).toBe(false);
    expect(user.isDisabled).toBe(false);
    expect(user.onboardingCompleted).toBe(false);
  });

  it("enforces unique email constraint", async () => {
    await createUser("user-dupe");
    await expect(createUser("user-dupe")).rejects.toThrow();
  });

  it("reads a user by id", async () => {
    const created = await createUser("user-read");
    const found = await prisma.user.findUnique({ where: { id: created.id } });
    expect(found).not.toBeNull();
    expect(found!.email).toBe(created.email);
  });

  it("reads a user by unique email", async () => {
    const created = await createUser("user-read-email");
    const found = await prisma.user.findUnique({
      where: { email: created.email! },
    });
    expect(found?.id).toBe(created.id);
  });

  it("updates user preferences", async () => {
    const user = await createUser("user-prefs");
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        bio: "Updated bio",
        preferredGenres: ["pop", "rock"],
        onboardingCompleted: true,
        defaultStyle: "cinematic",
      },
    });
    expect(updated.bio).toBe("Updated bio");
    expect(updated.preferredGenres).toEqual(["pop", "rock"]);
    expect(updated.onboardingCompleted).toBe(true);
    expect(updated.defaultStyle).toBe("cinematic");
  });

  it("updates username and enforces unique constraint", async () => {
    const a = await createUser("user-username-a");
    const b = await createUser("user-username-b");

    const username = `${RUN_ID}-unique`;
    await prisma.user.update({ where: { id: a.id }, data: { username } });

    await expect(
      prisma.user.update({ where: { id: b.id }, data: { username } })
    ).rejects.toThrow();
  });

  it("deletes a user and cascades to songs", async () => {
    const user = await createUser("user-cascade");
    await prisma.song.create({
      data: { userId: user.id, title: "Cascade Song", generationStatus: "ready" },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const songs = await prisma.song.findMany({ where: { userId: user.id } });
    expect(songs).toHaveLength(0);
  });

  it("lists users with pagination", async () => {
    const emailPrefix = `${RUN_ID}-paginate-user`;
    for (let i = 0; i < 3; i++) {
      await prisma.user.create({
        data: { email: `${emailPrefix}-${i}@test.invalid`, name: `Paged User ${i}` },
      });
    }

    const page1 = await prisma.user.findMany({
      where: { email: { startsWith: emailPrefix } },
      orderBy: { createdAt: "asc" },
      take: 2,
    });
    const page2 = await prisma.user.findMany({
      where: { email: { startsWith: emailPrefix } },
      orderBy: { createdAt: "asc" },
      skip: 2,
      take: 2,
    });

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Song model
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("Song model", () => {
  let ownerId: string;

  beforeAll(async () => {
    if (!dbConnected) return;
    const owner = await createUser("song-owner");
    ownerId = owner.id;
  });

  it("creates a song with default field values", async () => {
    const song = await createSong(ownerId, { title: "Default Fields Song" });
    expect(song.id).toBeTruthy();
    expect(song.generationStatus).toBe("ready");
    expect(song.isInstrumental).toBe(false);
    expect(song.isPublic).toBe(false);
    expect(song.isHidden).toBe(false);
    expect(song.isFavorite).toBe(false);
    expect(song.downloadCount).toBe(0);
    expect(song.playCount).toBe(0);
    expect(song.pollCount).toBe(0);
  });

  it("reads a song by id", async () => {
    const song = await createSong(ownerId, { title: "Read Song" });
    const found = await prisma.song.findUnique({ where: { id: song.id } });
    expect(found).not.toBeNull();
    expect(found!.title).toBe("Read Song");
  });

  it("updates song status and visibility", async () => {
    const song = await createSong(ownerId, { title: "Status Song" });
    const updated = await prisma.song.update({
      where: { id: song.id },
      data: { generationStatus: "streaming", isPublic: true, isHidden: false },
    });
    expect(updated.generationStatus).toBe("streaming");
    expect(updated.isPublic).toBe(true);
  });

  it("deletes a song", async () => {
    const song = await createSong(ownerId, { title: "Delete Song" });
    await prisma.song.delete({ where: { id: song.id } });
    const found = await prisma.song.findUnique({ where: { id: song.id } });
    expect(found).toBeNull();
  });

  it("filters songs by generationStatus", async () => {
    await createSong(ownerId, { title: "Pending Song", generationStatus: "pending" });
    await createSong(ownerId, { title: "Ready Song", generationStatus: "ready" });

    const pending = await prisma.song.findMany({
      where: { userId: ownerId, generationStatus: "pending" },
    });
    const ready = await prisma.song.findMany({
      where: { userId: ownerId, generationStatus: "ready" },
    });

    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(ready.length).toBeGreaterThanOrEqual(1);
    expect(pending.every((s) => s.generationStatus === "pending")).toBe(true);
    expect(ready.every((s) => s.generationStatus === "ready")).toBe(true);
  });

  it("filters songs by isPublic and isHidden", async () => {
    await createSong(ownerId, { title: "Public Song", isPublic: true, isHidden: false });
    await createSong(ownerId, { title: "Hidden Song", isPublic: false, isHidden: true });

    const publicSongs = await prisma.song.findMany({
      where: { userId: ownerId, isPublic: true, isHidden: false },
    });
    expect(publicSongs.every((s) => s.isPublic && !s.isHidden)).toBe(true);
  });

  it("searches songs by title (contains)", async () => {
    const uniqueTitle = `UniqueTitle-${RUN_ID}`;
    await createSong(ownerId, { title: `${uniqueTitle} Part1` });
    await createSong(ownerId, { title: `${uniqueTitle} Part2` });

    const results = await prisma.song.findMany({
      where: { userId: ownerId, title: { contains: uniqueTitle } },
    });
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("searches songs by tags (contains)", async () => {
    await createSong(ownerId, { title: "Tagged Song", tags: "pop upbeat energetic" });

    const results = await prisma.song.findMany({
      where: { userId: ownerId, tags: { contains: "upbeat" } },
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((s) => s.tags?.includes("upbeat"))).toBe(true);
  });

  it("paginates songs with skip/take, ordered by createdAt", async () => {
    // Create 4 songs for this user
    for (let i = 0; i < 4; i++) {
      await createSong(ownerId, { title: `Paginate Song ${i}` });
    }

    const all = await prisma.song.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: "asc" },
    });
    const page1 = await prisma.song.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: "asc" },
      take: 2,
    });
    const page2 = await prisma.song.findMany({
      where: { userId: ownerId },
      orderBy: { createdAt: "asc" },
      skip: 2,
      take: 2,
    });

    expect(page1[0].id).toBe(all[0].id);
    expect(page2[0].id).toBe(all[2].id);
    expect(page1.length).toBe(2);
    expect(page2.length).toBe(2);
  });

  it("orders songs by playCount descending", async () => {
    await createSong(ownerId, { title: "High Plays", playCount: 100 });
    await createSong(ownerId, { title: "Low Plays", playCount: 1 });

    const sorted = await prisma.song.findMany({
      where: { userId: ownerId },
      orderBy: { playCount: "desc" },
      take: 5,
    });
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].playCount).toBeGreaterThanOrEqual(sorted[i].playCount);
    }
  });

  it("increments playCount", async () => {
    const song = await createSong(ownerId, { title: "Play Me", playCount: 5 });
    const updated = await prisma.song.update({
      where: { id: song.id },
      data: { playCount: { increment: 1 } },
    });
    expect(updated.playCount).toBe(6);
  });

  it("stores and retrieves correct data types (nullable fields)", async () => {
    const song = await createSong(ownerId, {
      title: "Typed Song",
      duration: 180.5,
      rating: 4,
      tempo: 120,
      isInstrumental: true,
      lyrics: "La la la",
    });

    const found = await prisma.song.findUnique({ where: { id: song.id } });
    expect(found!.duration).toBe(180.5);
    expect(found!.rating).toBe(4);
    expect(found!.tempo).toBe(120);
    expect(found!.isInstrumental).toBe(true);
    expect(found!.lyrics).toBe("La la la");
    // Nullable fields left as null
    expect(found!.audioUrl).toBeNull();
    expect(found!.imageUrl).toBeNull();
    expect(found!.archivedAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Subscription model
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("Subscription model", () => {
  const now = new Date();
  const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  it("creates a subscription for a user", async () => {
    const user = await createUser("sub-create");
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `cus_${RUN_ID}_create`,
        stripeSubscriptionId: `sub_${RUN_ID}_create`,
        stripePriceId: "price_starter",
        tier: SubscriptionTier.starter,
        status: SubscriptionStatus.active,
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater,
      },
    });
    expect(sub.id).toBeTruthy();
    expect(sub.tier).toBe(SubscriptionTier.starter);
    expect(sub.status).toBe(SubscriptionStatus.active);
  });

  it("reads subscription via user relation", async () => {
    const user = await createUser("sub-read");
    await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `cus_${RUN_ID}_read`,
        stripeSubscriptionId: `sub_${RUN_ID}_read`,
        stripePriceId: "price_pro",
        tier: SubscriptionTier.pro,
        status: SubscriptionStatus.active,
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater,
      },
    });

    const userWithSub = await prisma.user.findUnique({
      where: { id: user.id },
      include: { subscription: true },
    });
    expect(userWithSub!.subscription).not.toBeNull();
    expect(userWithSub!.subscription!.tier).toBe(SubscriptionTier.pro);
  });

  it("enforces one subscription per user (unique userId)", async () => {
    const user = await createUser("sub-unique");
    await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `cus_${RUN_ID}_unique`,
        stripeSubscriptionId: `sub_${RUN_ID}_unique`,
        stripePriceId: "price_free",
        tier: SubscriptionTier.free,
        status: SubscriptionStatus.active,
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater,
      },
    });

    await expect(
      prisma.subscription.create({
        data: {
          userId: user.id,
          stripeCustomerId: `cus_${RUN_ID}_unique2`,
          stripeSubscriptionId: `sub_${RUN_ID}_unique2`,
          stripePriceId: "price_free",
          tier: SubscriptionTier.free,
          status: SubscriptionStatus.active,
          currentPeriodStart: now,
          currentPeriodEnd: oneMonthLater,
        },
      })
    ).rejects.toThrow();
  });

  it("transitions subscription tier from starter to pro", async () => {
    const user = await createUser("sub-upgrade");
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `cus_${RUN_ID}_upgrade`,
        stripeSubscriptionId: `sub_${RUN_ID}_upgrade`,
        stripePriceId: "price_starter",
        tier: SubscriptionTier.starter,
        status: SubscriptionStatus.active,
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater,
      },
    });

    const upgraded = await prisma.subscription.update({
      where: { id: sub.id },
      data: { tier: SubscriptionTier.pro, stripePriceId: "price_pro" },
    });
    expect(upgraded.tier).toBe(SubscriptionTier.pro);
  });

  it("marks subscription as canceled", async () => {
    const user = await createUser("sub-cancel");
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `cus_${RUN_ID}_cancel`,
        stripeSubscriptionId: `sub_${RUN_ID}_cancel`,
        stripePriceId: "price_starter",
        tier: SubscriptionTier.starter,
        status: SubscriptionStatus.active,
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater,
      },
    });

    const canceled = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.canceled,
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });
    expect(canceled.status).toBe(SubscriptionStatus.canceled);
    expect(canceled.cancelAtPeriodEnd).toBe(true);
    expect(canceled.canceledAt).not.toBeNull();
  });

  it("creates subscription in trialing status", async () => {
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    const user = await createUser("sub-trial");

    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `cus_${RUN_ID}_trial`,
        stripeSubscriptionId: `sub_${RUN_ID}_trial`,
        stripePriceId: "price_starter",
        tier: SubscriptionTier.starter,
        status: SubscriptionStatus.trialing,
        currentPeriodStart: trialStart,
        currentPeriodEnd: oneMonthLater,
        trialStart,
        trialEnd,
      },
    });
    expect(sub.status).toBe(SubscriptionStatus.trialing);
    expect(sub.trialEnd).not.toBeNull();
  });

  it("expires subscription by setting past_due status", async () => {
    const user = await createUser("sub-expire");
    const sub = await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `cus_${RUN_ID}_expire`,
        stripeSubscriptionId: `sub_${RUN_ID}_expire`,
        stripePriceId: "price_pro",
        tier: SubscriptionTier.pro,
        status: SubscriptionStatus.active,
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater,
      },
    });

    const expired = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.past_due },
    });
    expect(expired.status).toBe(SubscriptionStatus.past_due);
  });

  it("cascades delete when user is deleted", async () => {
    const user = await createUser("sub-cascade-del");
    await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `cus_${RUN_ID}_casdel`,
        stripeSubscriptionId: `sub_${RUN_ID}_casdel`,
        stripePriceId: "price_studio",
        tier: SubscriptionTier.studio,
        status: SubscriptionStatus.active,
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater,
      },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const subs = await prisma.subscription.findMany({
      where: { userId: user.id },
    });
    expect(subs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// CreditUsage model
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("CreditUsage model", () => {
  let userId: string;

  beforeAll(async () => {
    if (!dbConnected) return;
    const user = await createUser("credit-owner");
    userId = user.id;
  });

  it("creates a credit usage record", async () => {
    const record = await prisma.creditUsage.create({
      data: { userId, action: "generate", creditCost: 10 },
    });
    expect(record.id).toBeTruthy();
    expect(record.action).toBe("generate");
    expect(record.creditCost).toBe(10);
    expect(record.songId).toBeNull();
    expect(record.description).toBeNull();
  });

  it("creates a credit record with optional fields", async () => {
    const song = await createSong(userId, { title: "Credit Song" });
    const record = await prisma.creditUsage.create({
      data: {
        userId,
        action: "extend",
        creditCost: 10,
        songId: song.id,
        description: "Extended generation",
      },
    });
    expect(record.songId).toBe(song.id);
    expect(record.description).toBe("Extended generation");
  });

  it("calculates total credits used via aggregate", async () => {
    // Create known usage records
    await prisma.creditUsage.createMany({
      data: [
        { userId, action: "lyrics", creditCost: 2 },
        { userId, action: "style_boost", creditCost: 5 },
        { userId, action: "mashup", creditCost: 20 },
      ],
    });

    const agg = await prisma.creditUsage.aggregate({
      where: { userId },
      _sum: { creditCost: true },
      _count: true,
    });

    expect(agg._sum.creditCost).toBeGreaterThanOrEqual(37); // 10+10+2+5+20 minimum
    expect(agg._count).toBeGreaterThanOrEqual(5);
  });

  it("sums credit cost for a specific action", async () => {
    const uid = (await createUser("credit-action")).id;
    await prisma.creditUsage.createMany({
      data: [
        { userId: uid, action: "generate", creditCost: 10 },
        { userId: uid, action: "generate", creditCost: 10 },
        { userId: uid, action: "lyrics", creditCost: 2 },
      ],
    });

    const genAgg = await prisma.creditUsage.aggregate({
      where: { userId: uid, action: "generate" },
      _sum: { creditCost: true },
      _count: true,
    });

    expect(genAgg._sum.creditCost).toBe(20);
    expect(genAgg._count).toBe(2);
  });

  it("fetches credit history ordered by createdAt desc", async () => {
    const uid = (await createUser("credit-history")).id;
    for (let i = 0; i < 3; i++) {
      await prisma.creditUsage.create({
        data: { userId: uid, action: "generate", creditCost: 10 },
      });
    }

    const history = await prisma.creditUsage.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
    });

    expect(history).toHaveLength(3);
    for (let i = 1; i < history.length; i++) {
      expect(history[i - 1].createdAt >= history[i].createdAt).toBe(true);
    }
  });

  it("supports date-range filtering for monthly calculation", async () => {
    const uid = (await createUser("credit-monthly")).id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await prisma.creditUsage.createMany({
      data: [
        { userId: uid, action: "generate", creditCost: 10, createdAt: now },
        { userId: uid, action: "generate", creditCost: 10, createdAt: now },
      ],
    });

    const monthly = await prisma.creditUsage.aggregate({
      where: {
        userId: uid,
        createdAt: { gte: startOfMonth, lt: nextMonth },
      },
      _sum: { creditCost: true },
      _count: true,
    });

    expect(monthly._sum.creditCost).toBe(20);
    expect(monthly._count).toBe(2);
  });

  it("cascades delete when user is deleted", async () => {
    const uid = (await createUser("credit-cascade")).id;
    await prisma.creditUsage.createMany({
      data: [
        { userId: uid, action: "generate", creditCost: 10 },
        { userId: uid, action: "lyrics", creditCost: 2 },
      ],
    });

    await prisma.user.delete({ where: { id: uid } });

    const records = await prisma.creditUsage.findMany({ where: { userId: uid } });
    expect(records).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Playlist model
// ---------------------------------------------------------------------------

describe.skipIf(!hasDb)("Playlist model", () => {
  let ownerId: string;

  beforeAll(async () => {
    if (!dbConnected) return;
    const owner = await createUser("playlist-owner");
    ownerId = owner.id;
  });

  it("creates a playlist with default values", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "My Playlist" },
    });
    expect(pl.id).toBeTruthy();
    expect(pl.name).toBe("My Playlist");
    expect(pl.isPublic).toBe(false);
    expect(pl.isCollaborative).toBe(false);
    expect(pl.shareCount).toBe(0);
    expect(pl.description).toBeNull();
  });

  it("reads a playlist by id", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Read Playlist" },
    });
    const found = await prisma.playlist.findUnique({ where: { id: pl.id } });
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Read Playlist");
  });

  it("updates playlist name and visibility", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Private Playlist" },
    });
    const updated = await prisma.playlist.update({
      where: { id: pl.id },
      data: { name: "Public Playlist", isPublic: true, description: "Shared with world" },
    });
    expect(updated.name).toBe("Public Playlist");
    expect(updated.isPublic).toBe(true);
    expect(updated.description).toBe("Shared with world");
  });

  it("deletes a playlist", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Delete Me" },
    });
    await prisma.playlist.delete({ where: { id: pl.id } });
    const found = await prisma.playlist.findUnique({ where: { id: pl.id } });
    expect(found).toBeNull();
  });

  it("adds songs to a playlist with positions", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Songs Playlist" },
    });
    const song1 = await createSong(ownerId, { title: "Song A" });
    const song2 = await createSong(ownerId, { title: "Song B" });

    await prisma.playlistSong.createMany({
      data: [
        { playlistId: pl.id, songId: song1.id, position: 1 },
        { playlistId: pl.id, songId: song2.id, position: 2 },
      ],
    });

    const plWithSongs = await prisma.playlist.findUnique({
      where: { id: pl.id },
      include: { songs: { orderBy: { position: "asc" } } },
    });

    expect(plWithSongs!.songs).toHaveLength(2);
    expect(plWithSongs!.songs[0].songId).toBe(song1.id);
    expect(plWithSongs!.songs[1].songId).toBe(song2.id);
  });

  it("enforces unique song per playlist constraint", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Unique Songs" },
    });
    const song = await createSong(ownerId, { title: "Unique Song" });

    await prisma.playlistSong.create({
      data: { playlistId: pl.id, songId: song.id, position: 1 },
    });

    await expect(
      prisma.playlistSong.create({
        data: { playlistId: pl.id, songId: song.id, position: 2 },
      })
    ).rejects.toThrow();
  });

  it("reorders songs by updating positions", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Reorder Playlist" },
    });
    const song1 = await createSong(ownerId, { title: "First" });
    const song2 = await createSong(ownerId, { title: "Second" });

    const ps1 = await prisma.playlistSong.create({
      data: { playlistId: pl.id, songId: song1.id, position: 1 },
    });
    const ps2 = await prisma.playlistSong.create({
      data: { playlistId: pl.id, songId: song2.id, position: 2 },
    });

    // Swap positions
    await prisma.playlistSong.update({ where: { id: ps1.id }, data: { position: 2 } });
    await prisma.playlistSong.update({ where: { id: ps2.id }, data: { position: 1 } });

    const ordered = await prisma.playlistSong.findMany({
      where: { playlistId: pl.id },
      orderBy: { position: "asc" },
    });

    expect(ordered[0].songId).toBe(song2.id);
    expect(ordered[1].songId).toBe(song1.id);
  });

  it("filters playlists by public/private visibility", async () => {
    const uid = (await createUser("playlist-vis")).id;
    await prisma.playlist.createMany({
      data: [
        { userId: uid, name: "Public", isPublic: true },
        { userId: uid, name: "Private", isPublic: false },
      ],
    });

    const pub = await prisma.playlist.findMany({
      where: { userId: uid, isPublic: true },
    });
    const priv = await prisma.playlist.findMany({
      where: { userId: uid, isPublic: false },
    });

    expect(pub).toHaveLength(1);
    expect(pub[0].name).toBe("Public");
    expect(priv).toHaveLength(1);
    expect(priv[0].name).toBe("Private");
  });

  it("cascades delete of playlist songs when playlist is deleted", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Cascade Playlist" },
    });
    const song = await createSong(ownerId, { title: "Cascade Song" });
    await prisma.playlistSong.create({
      data: { playlistId: pl.id, songId: song.id, position: 1 },
    });

    await prisma.playlist.delete({ where: { id: pl.id } });

    const ps = await prisma.playlistSong.findMany({
      where: { playlistId: pl.id },
    });
    expect(ps).toHaveLength(0);
  });

  it("removes a song from a playlist", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Remove Song Playlist" },
    });
    const song = await createSong(ownerId, { title: "Removable Song" });
    await prisma.playlistSong.create({
      data: { playlistId: pl.id, songId: song.id, position: 1 },
    });

    await prisma.playlistSong.deleteMany({
      where: { playlistId: pl.id, songId: song.id },
    });

    const ps = await prisma.playlistSong.findMany({ where: { playlistId: pl.id } });
    expect(ps).toHaveLength(0);
  });

  it("marks playlist as collaborative", async () => {
    const pl = await prisma.playlist.create({
      data: { userId: ownerId, name: "Collab Playlist" },
    });
    const updated = await prisma.playlist.update({
      where: { id: pl.id },
      data: { isCollaborative: true },
    });
    expect(updated.isCollaborative).toBe(true);
  });

  it("lists playlists for a user with pagination", async () => {
    const uid = (await createUser("playlist-page")).id;
    for (let i = 0; i < 5; i++) {
      await prisma.playlist.create({ data: { userId: uid, name: `PL ${i}` } });
    }

    const page1 = await prisma.playlist.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "asc" },
      take: 3,
    });
    const page2 = await prisma.playlist.findMany({
      where: { userId: uid },
      orderBy: { createdAt: "asc" },
      skip: 3,
      take: 3,
    });

    expect(page1).toHaveLength(3);
    expect(page2).toHaveLength(2);
  });
});
