import { prisma } from "@/lib/prisma";
import { Err, fail, type Result, success } from "@/lib/result";
import { boostStyle, resolveUserApiKeyWithMode, SunoApiError } from "@/lib/sunoapi";
import { SUNOAPI_KEY } from "@/lib/env";
import { stripHtml } from "@/lib/sanitize";
import { logServerError } from "@/lib/error-logger";
import { logger } from "@/lib/logger";
import { isJamSessionExpired } from "./sessions";
import { JAM_PROMPT_MAX_LENGTH } from "./constants";

/**
 * Turn a guest's rough idea into a fuller song prompt, on the SAME trust model
 * as pushJamPrompt: the share token is the auth, and the call runs on the
 * host's Suno key.
 *
 * It deliberately does NOT decrement budgetUsed — that counter is denominated
 * in songs, and an optimize is not a song. It does require budget headroom, so
 * a used-up party cannot keep burning the host's Suno credits, and the route is
 * additionally IP-bucketed in the middleware.
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
