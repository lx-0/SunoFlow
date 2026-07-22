import { z } from "zod";
import { publicRoute, resultResponse } from "@/lib/route-handler";
import { pushJamPrompt, JAM_PROMPT_MAX_LENGTH } from "@/lib/jam";

const pushPromptBody = z.object({
  promptText: z.string().trim().min(1).max(JAM_PROMPT_MAX_LENGTH),
  guestName: z.string().trim().max(40).optional(),
  guestKey: z.string().trim().min(8).max(64),
});

// The effective guardrails are DB-enforced in pushJamPrompt: atomic session
// budget reservation + per-guest open-prompt cap. An unknown token costs one
// indexed lookup and 404s, so no extra IP limiter is layered here.
export const POST = publicRoute<{ token: string }, z.infer<typeof pushPromptBody>>(
  async (_request, { params, body }) =>
    resultResponse(await pushJamPrompt(params.token, body), { status: 201 }),
  {
    route: "/api/jam/[token]/prompts",
    body: pushPromptBody,
  },
);
