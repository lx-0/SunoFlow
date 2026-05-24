import { authDataRoute, authRoute } from "@/lib/route-handler";
import { listItems, addItem } from "@/lib/generation-queue";
import { generateSongRequestSchema } from "@/lib/generation/request";
import { resultResponse } from "@/lib/route-response";

export const GET = authDataRoute(async (_request, { auth }) => {
  const items = await listItems(auth.userId);
  return { items };
}, { route: "/api/generation-queue" });

export const POST = authRoute(async (_request, { auth, body }) => {
  const { prompt, title, tags, makeInstrumental, personaId } = body;

  const result = await addItem(auth.userId, { prompt, title, tags, makeInstrumental, personaId });
  return resultResponse(result, { status: 201 });
}, {
  route: "/api/generation-queue",
  body: generateSongRequestSchema,
});
