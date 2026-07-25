import { prisma } from "@/lib/prisma";
import { Err, fail, type Result, success } from "@/lib/result";
import { boostStyle, resolveUserApiKeyWithMode, SunoApiError } from "@/lib/sunoapi";
import { SUNOAPI_KEY } from "@/lib/env";
import { stripHtml } from "@/lib/sanitize";
import { logServerError } from "@/lib/error-logger";
import { logger } from "@/lib/logger";
import { generateText } from "@/lib/llm";
import { isJamSessionExpired } from "./sessions";
import { JAM_PROMPT_MAX_LENGTH } from "./constants";
import { getJamSessionSignal, hasJamSessionSignal } from "./session-signal";

const SYSTEM_PROMPT = [
  "You rewrite a party guest's rough idea into a single Suno song prompt.",
  "You are given what has been landing at this party tonight and what the host",
  "has rejected. Steer the rewrite toward the former and away from the latter,",
  "but keep the guest's own idea recognisably intact — you are sharpening it,",
  "not replacing it.",
  "Answer with the prompt text only: no quotes, no markdown, no preamble,",
  `no more than ${JAM_PROMPT_MAX_LENGTH} characters.`,
].join(" ");

function buildUserPrompt(
  idea: string,
  signal: { landed: string[]; rejected: string[] },
): string {
  const parts = [`Guest idea: ${idea}`];
  if (signal.landed.length > 0) {
    parts.push(`Landing tonight:\n${signal.landed.map((p) => `- ${p}`).join("\n")}`);
  }
  if (signal.rejected.length > 0) {
    parts.push(`Rejected by the host:\n${signal.rejected.map((p) => `- ${p}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

/** LLMs wrap answers in quotes and fences no matter how firmly you ask them
 *  not to; compare and store the bare text. */
function unwrap(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/^```(?:[a-z]*)?\n?([\s\S]*?)\n?```$/i);
  if (fence) text = fence[1].trim();
  if (text.length > 1 && /^["'“‘]/.test(text) && /["'”’]$/.test(text)) {
    text = text.slice(1, -1).trim();
  }
  return text;
}

/**
 * Turn a guest's rough idea into a fuller song prompt, on the SAME trust model
 * as pushJamPrompt: the share token is the auth, and the call runs on the
 * host's Suno key.
 *
 * It deliberately does NOT decrement budgetUsed — that counter is denominated
 * in songs, and an optimize is not a song. It does require budget headroom, so
 * a used-up party cannot keep burning the host's Suno credits, and the route is
 * additionally IP-bucketed in the middleware.
 *
 * Once the party has produced a signal — songs that actually got played, and
 * prompts the host vetoed — the rewrite is steered by it, so the optimizer
 * converges on what works in THIS room. Until then, and whenever the LLM is
 * unavailable or returns nothing usable, it falls back to Suno's stateless
 * style boost. The signal is session-scoped by design: it resets with the
 * party, which is the point.
 */
export async function optimizeJamPrompt(
  shareToken: string,
  input: { promptText: string },
): Promise<Result<{ prompt: string }>> {
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
  if (session.budgetUsed >= session.budgetTotal) {
    return Err.limitReached("The party budget is used up");
  }

  const promptText = stripHtml(input.promptText).trim();
  if (!promptText || promptText.length > JAM_PROMPT_MAX_LENGTH) {
    return Err.validation(`promptText must be 1-${JAM_PROMPT_MAX_LENGTH} characters`);
  }

  try {
    const { apiKey: hostApiKey } = await resolveUserApiKeyWithMode(session.hostUserId);
    if (!(hostApiKey || SUNOAPI_KEY)) {
      // Keyless demo mode (mirrors pushJamPrompt): echo the input rather than
      // failing, so the keyless E2E path keeps working.
      return success({ prompt: promptText });
    }

    const signal = await getJamSessionSignal(session.id, session.hostUserId);
    if (hasJamSessionSignal(signal)) {
      const raw = await generateText(SYSTEM_PROMPT, buildUserPrompt(promptText, signal));
      const steered = raw ? stripHtml(unwrap(raw)).trim() : "";
      if (steered) {
        return success({ prompt: steered.slice(0, JAM_PROMPT_MAX_LENGTH) });
      }
      // generateText returns null on failure and content rejects; fall through
      // to the boost rather than denying the guest an optimize entirely.
    }

    const result = await boostStyle(promptText, hostApiKey);
    const optimized = stripHtml(result.result ?? "").trim();
    if (!optimized) return fail("Couldn't improve that prompt — try again", "SUNO_API_ERROR", 502);

    // Suno can return more than the description-mode cap allows; a prompt the
    // guest cannot then submit would be a dead end.
    return success({ prompt: optimized.slice(0, JAM_PROMPT_MAX_LENGTH) });
  } catch (error) {
    if (error instanceof SunoApiError) {
      logger.warn(
        { sessionId: session.id, status: error.status, code: error.code },
        "jam prompt optimize rejected upstream",
      );
      return fail("Couldn't improve that prompt — try again", "SUNO_API_ERROR", 502);
    }
    logServerError("jam-prompt-optimize", error, {
      route: "/api/jam/[token]/optimize",
      params: { sessionId: session.id },
    });
    return fail("Something went wrong improving the prompt", "SERVER_ERROR", 500);
  }
}
