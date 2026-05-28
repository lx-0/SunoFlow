import { authRoute, resultResponse } from "@/lib/route-handler";
import { respondToGeneration } from "@/lib/generation";
import { separateVocals } from "@/lib/songs";
import { separateVocalsBody, type SeparateVocalsBody } from "@/lib/songs/variations/schemas";

export const POST = authRoute<{ id: string }, SeparateVocalsBody>(async (_request, { auth, params, body }) => {
  const result = await separateVocals(auth.userId, params.id, {
    type: body.type,
  });
  if (!result.ok) return resultResponse(result);

  return respondToGeneration(result.data, {
    label: "separate-vocals-api",
    userId: auth.userId,
    route: `/api/songs/${params.id}/separate-vocals`,
  });
}, { body: separateVocalsBody });
