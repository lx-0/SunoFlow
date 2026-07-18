/**
 * Rich seed for the visual verification harness (SEED_MODE=rich).
 *
 * The default in-test API seeding (e2e/visual/journey.visual.ts) creates real
 * Song rows via the keyless /api/generate mock fallback, but every stored
 * title reads "Neon Drift" (core.ts prefers input.mock.title). This script
 * seeds a genuinely VARIED library — 15 songs cycling through all six
 * mockSongs fixtures (distinct titles/genres/lyrics), per-title SVG covers,
 * favorites, and 3 playlists — directly via Prisma.
 *
 * Run against the throwaway visual DB AFTER `prisma migrate deploy`
 * (scripts/visual-journey.sh does this automatically for SEED_MODE=rich):
 *
 *   DATABASE_URL=postgres://projects:projects@localhost:5433/sunoflow \
 *     npx tsx scripts/seed-visual-library.ts --email visual-journey@test.local
 *
 * Safety: refuses to run against a non-localhost database, and only ever
 * deletes rows belonging to the seed user (re-runs re-seed cleanly).
 */

import { PrismaClient } from "@prisma/client";
import { mockSongs } from "../src/lib/sunoapi/mock";
import { generateCoverArtVariants } from "../src/lib/cover-art-generator";
import { hashPassword } from "../src/lib/auth/password";

// Keep in sync with DEFAULT_PASSWORD in e2e/helpers.ts (not imported to avoid
// pulling @playwright/test into a tsx runtime script).
const SEED_PASSWORD = "E2eTestPass123!";
const SEED_COUNT = 15;
const PLAYLISTS: Array<{ name: string; description: string; songIdx: number[] }> = [
  { name: "Night Drive", description: "Synths for empty highways", songIdx: [0, 2, 6, 9] },
  { name: "Chill Study", description: "Low-key focus companions", songIdx: [1, 4, 10] },
  { name: "Workout Mix", description: "Tempo up, excuses down", songIdx: [2, 7, 14] },
];

// Prisma reads SUNOFLOW_DATABASE_URL; accept DATABASE_URL as the CLI-friendly
// fallback (same precedence as src/lib/env.ts).
process.env.SUNOFLOW_DATABASE_URL =
  process.env.SUNOFLOW_DATABASE_URL || process.env.DATABASE_URL;

function requireLocalhost(url: string | undefined): string {
  if (!url) {
    throw new Error("Set DATABASE_URL (or SUNOFLOW_DATABASE_URL) to the throwaway visual DB.");
  }
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `Refusing to seed a non-localhost database (host: ${host}). ` +
        "This script is destructive for the seed user and is meant for the throwaway visual DB only.",
    );
  }
  return url;
}

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

requireLocalhost(process.env.SUNOFLOW_DATABASE_URL);
const prisma = new PrismaClient();

async function main() {
  const email = argValue("--email") ?? "visual-journey@test.local";
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Visual Journey",
      passwordHash,
      emailVerified: new Date(),
      onboardingCompleted: true,
    },
  });

  // /settings/billing and credit widgets expect a subscription row (register
  // normally creates it via ensureFreeSubscription).
  const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } }).catch(() => null);
  if (!existingSub) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId: `free_${user.id}`,
        stripeSubscriptionId: `free_sub_${user.id}`,
        stripePriceId: "free",
        tier: "free",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  // Re-seed cleanly: only this user's rows, throwaway-DB context by contract.
  await prisma.playlist.deleteMany({ where: { userId: user.id } });
  await prisma.song.deleteMany({ where: { userId: user.id } });

  const songIds: string[] = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const mock = mockSongs[i % mockSongs.length];
    const createdAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const [cover] = generateCoverArtVariants({
      songId: `visual-seed-${i}`,
      title: mock.title,
      tags: mock.tags,
    });
    const song = await prisma.song.create({
      data: {
        userId: user.id,
        title: mock.title,
        prompt: mock.prompt,
        tags: mock.tags,
        lyrics: mock.lyrics || null,
        duration: mock.duration,
        sunoModel: mock.model,
        imageUrl: cover.dataUrl,
        audioUrl: null,
        generationStatus: "ready",
        isFavorite: i % 5 === 0,
        createdAt,
      },
    });
    songIds.push(song.id);
  }

  for (const spec of PLAYLISTS) {
    await prisma.playlist.create({
      data: {
        userId: user.id,
        name: spec.name,
        description: spec.description,
        songs: {
          create: spec.songIdx
            .filter((idx) => idx < songIds.length)
            .map((idx, position) => ({ songId: songIds[idx], position })),
        },
      },
    });
  }

  console.log(
    `Seeded ${songIds.length} songs, ${PLAYLISTS.length} playlists for ${email} (password: DEFAULT_PASSWORD from e2e/helpers.ts).`,
  );
}

main()
  .catch((err) => {
    console.error("Visual seed error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
