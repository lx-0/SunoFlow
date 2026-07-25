import { z } from "zod";
import { publicRoute, resultResponse } from "@/lib/route-handler";
import { optimizeJamPrompt, JAM_PROMPT_MAX_LENGTH } from "@/lib/jam";

const optimizeBody = z.object({
  promptText: z.string().trim().min(1).max(JAM_PROMPT_MAX_LENGTH),
});

// Share token is the auth, exactly as for the prompt push. Abuse is bounded by
// the session checks in optimizeJamPrompt plus the jam_optimize IP bucket in
// the middleware — this call costs the HOST Suno credits.
export const POST = publicRoute<{ token: string }, z.infer<typeof optimizeBody>>(
  async (_request, { params, body }) =>
    resultResponse(await optimizeJamPrompt(params.token, body)),
  {
    route: "/api/jam/[token]/optimize",
    body: optimizeBody,
  },
);
