import { z } from "zod";
import { authRoute, resultResponse } from "@/lib/route-handler";
import { createJamSession, listJamSessions } from "@/lib/jam";

export const GET = authRoute(
  async (_request, { auth }) =>
    resultResponse(await listJamSessions(auth.userId)),
  { route: "/api/jam-sessions" },
);

const createSessionBody = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  budgetTotal: z.number().int().min(1).max(100).optional(),
  // Normalization + strict charset live in createJamSession (single source).
  slug: z.string().trim().min(1).max(40).optional(),
  durationHours: z.number().int().min(1).max(72).optional(),
});

export const POST = authRoute<Record<string, never>, z.infer<typeof createSessionBody>>(
  async (_request, { auth, body }) =>
    resultResponse(await createJamSession(auth.userId, body ?? {}), { status: 201 }),
  { route: "/api/jam-sessions", body: createSessionBody },
);
