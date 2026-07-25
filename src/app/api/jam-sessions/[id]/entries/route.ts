import { z } from "zod";
import { authRoute, resultResponse } from "@/lib/route-handler";
import { pushJamPromptAsHost, JAM_PROMPT_MAX_LENGTH } from "@/lib/jam";

const hostPromptBody = z.object({
  promptText: z.string().trim().min(1).max(JAM_PROMPT_MAX_LENGTH),
  guestName: z.string().trim().max(40).optional(),
});

/**
 * Host-authored prompt. The guest surface posts to the public tokened route;
 * the operator is authenticated, so ownership is checked in
 * pushJamPromptAsHost (session id + hostUserId) rather than by a share token.
 */
export const POST = authRoute<{ id: string }, z.infer<typeof hostPromptBody>>(
  async (_request, { auth, params, body }) =>
    resultResponse(await pushJamPromptAsHost(params.id, auth.userId, body), {
      status: 201,
    }),
  {
    route: "/api/jam-sessions/[id]/entries",
    body: hostPromptBody,
  },
);
