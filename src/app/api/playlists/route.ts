import { z } from "zod";
import { authDataRoute, authRoute, resultResponse } from "@/lib/route-handler";
import { CacheControl } from "@/lib/cache";
import { listPlaylists, createPlaylist } from "@/lib/playlists";
import { createPlaylistBody } from "@/lib/playlists/schemas";

export const GET = authDataRoute(async (_request, { auth }) => {
  return resultResponse(await listPlaylists(auth.userId), {
    headers: { "Cache-Control": CacheControl.privateShort },
  });
}, { route: "/api/playlists" });

export const POST = authRoute<Record<string, never>, z.infer<typeof createPlaylistBody>>(async (_request, { auth, body }) => {
  return resultResponse(await createPlaylist(auth.userId, body), { status: 201 });
}, { route: "/api/playlists", body: createPlaylistBody });
