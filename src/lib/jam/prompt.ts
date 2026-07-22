import { prisma } from "@/lib/prisma";
import { Err, fail, type Result, success } from "@/lib/result";
import { generateSong, resolveUserApiKeyWithMode, SunoApiError } from "@/lib/sunoapi";
import { checkCredits, deductCredits } from "@/lib/credits";
import { SUNOAPI_KEY } from "@/lib/env";
import { stripHtml } from "@/lib/sanitize";
import { logServerError } from "@/lib/error-logger";
import { logger } from "@/lib/logger";
import { isJamSessionExpired } from "./sessions";
import type { JamEntryCard } from "./state";

// Suno's non-custom description mode caps prompts at 500 chars.
export const JAM_PROMPT_MAX_LENGTH = 500;
// Open prompts per guest device; a slot frees when the entry leaves "pending".
export const JAM_MAX_OPEN_PROMPTS_PER_GUEST = 2;

const ENTRY_SELECT = {
  id: true,
  status: true,
  promptText: true,
  guestName: true,
  createdAt: true,
  song: {
    select: {
      id: true,
      title: true,
      imageUrl: true,
      duration: true,
      generationStatus: true,
    },
  },
} as const;

/**
 * Direct-push guest prompt (no approval gate — the pending card IS the party
 * mechanic). Generations run on the HOST's account/key, so every guardrail is
 * enforced here: open-session check, per-guest open-prompt cap, and an ATOMIC
 * budget reservation (conditional increment) so two guests racing the last
 * budget slot cannot overshoot. Suno failures release the reservation.
 */
export async function pushJamPrompt(
  shareToken: string,
  input: { promptText: string; guestName?: string; guestKey: string },
): Promise<Result<{ entry: JamEntryCard }>> {
  const session = await prisma.jamSession.findUnique({
    where: { shareToken },
    select: {
      id: true,
      status: true,
      hostUserId: true,
      budgetTotal: true,
      budgetUsed: true,
      expiresAt: true,
    },
  });
  if (!session) return Err.notFound("Not found");
  if (session.status !== "open" || isJamSessionExpired(session)) {
    return Err.conflict("This jam session has ended");
  }

  const promptText = stripHtml(input.promptText).trim();
  if (!promptText || promptText.length > JAM_PROMPT_MAX_LENGTH) {
    return Err.validation(
      `promptText must be 1-${JAM_PROMPT_MAX_LENGTH} characters`,
    );
  }
  const guestName = input.guestName
    ? stripHtml(input.guestName).trim().slice(0, 40) || null
    : null;

  const openPrompts = await prisma.jamSessionEntry.count({
    where: { sessionId: session.id, guestKey: input.guestKey, status: "pending" },
  });
  if (openPrompts >= JAM_MAX_OPEN_PROMPTS_PER_GUEST) {
    return Err.rateLimited(
      "You already have songs generating — wait until one finishes",
    );
  }

  // Atomic budget reservation: the conditional increment is the gate. The
  // expiry condition rides inside it so a session cannot be raced past its
  // lifetime either.
  const reserved = await prisma.jamSession.updateMany({
    where: {
      id: session.id,
      status: "open",
      budgetUsed: { lt: session.budgetTotal },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    data: { budgetUsed: { increment: 1 } },
  });
  if (reserved.count === 0) {
    return Err.limitReached("The party budget is used up");
  }

  const releaseBudget = () =>
    prisma.jamSession
      .updateMany({
        where: { id: session.id },
        data: { budgetUsed: { decrement: 1 } },
      })
      .catch((error: unknown) => {
        logServerError("jam-budget-release", error, {
          route: "/api/jam/[token]/prompts",
          params: { sessionId: session.id },
        });
      });

  try {
    const { apiKey: hostApiKey, usingPersonalKey } =
      await resolveUserApiKeyWithMode(session.hostUserId);

    if (!usingPersonalKey) {
      const check = await checkCredits(session.hostUserId, "generate");
      if (!check.ok) {
        await releaseBudget();
        return Err.limitReached("The host is out of credits");
      }
    }

    const hasApiKey = !!(hostApiKey || SUNOAPI_KEY);

    // Keyless demo mode mirrors mcp/tools/generate_song.ts: an instant mock
    // "ready" song keeps the keyless E2E path working.
    let sunoJobId: string | null = null;
    let generationStatus = "ready";
    let audioUrl: string | null = "https://cdn1.suno.ai/mock.mp3";
    if (hasApiKey) {
      const result = await generateSong(promptText, {}, hostApiKey);
      sunoJobId = result.taskId;
      generationStatus = "pending";
      audioUrl = null;
    }

    const entry = await prisma.$transaction(async (tx) => {
      const song = await tx.song.create({
        data: {
          userId: session.hostUserId,
          sunoJobId,
          prompt: promptText,
          generationStatus,
          audioUrl,
        },
        select: { id: true },
      });
      return tx.jamSessionEntry.create({
        data: {
          sessionId: session.id,
          songId: song.id,
          promptText,
          guestName,
          guestKey: input.guestKey,
          status: hasApiKey ? "pending" : "ready",
        },
        select: ENTRY_SELECT,
      });
    });

    if (hasApiKey && !usingPersonalKey) {
      await deductCredits(session.hostUserId, "generate", {
        songId: entry.song?.id,
        description: `Jam session prompt: ${promptText.slice(0, 60)}`,
      });
    }

    return success({ entry });
  } catch (error) {
    await releaseBudget();
    if (error instanceof SunoApiError) {
      logger.warn(
        { sessionId: session.id, status: error.status, code: error.code },
        "jam prompt generation rejected upstream",
      );
      return fail("The song request was rejected — try a different prompt", "SUNO_API_ERROR", 502);
    }
    logServerError("jam-prompt-push", error, {
      route: "/api/jam/[token]/prompts",
      params: { sessionId: session.id },
    });
    return fail("Something went wrong starting the song", "SERVER_ERROR", 500);
  }
}
