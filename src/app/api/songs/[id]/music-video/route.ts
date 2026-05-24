import { authRoute } from "@/lib/route-handler";
import { runOwnedSongTransform } from "@/lib/songs/owned-transform";
import { createMusicVideo } from "@/lib/sunoapi";

export const POST = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    return runOwnedSongTransform({
      songId: params.id,
      userId: auth.userId,
      route: `/api/songs/${params.id}/music-video`,
      logLabel: "music-video-api",
      format: "mp4",
      mockTaskId: `mock-video-${params.id}`,
      notReadyMessage: "Song must be fully generated before creating a music video.",
      missingIdentifiersMessage: "Song is missing Suno identifiers for music video generation.",
      fallbackErrorMessage: "Music video generation failed. Please try again.",
      apiCall: (identifiers, userApiKey) => createMusicVideo(identifiers, userApiKey),
    });
  },
  { route: "/api/songs/[id]/music-video" },
);
