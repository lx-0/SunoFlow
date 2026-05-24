import { authRoute } from "@/lib/route-handler";
import { runOwnedSongTransform } from "@/lib/songs/owned-transform";
import { convertToWav } from "@/lib/sunoapi";

export const POST = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    return runOwnedSongTransform({
      songId: params.id,
      userId: auth.userId,
      route: `/api/songs/${params.id}/convert-wav`,
      logLabel: "convert-wav-api",
      format: "wav",
      mockTaskId: `mock-wav-${params.id}`,
      notReadyMessage: "Song must be fully generated before converting to WAV.",
      missingIdentifiersMessage: "Song is missing Suno identifiers for WAV conversion.",
      fallbackErrorMessage: "WAV conversion failed. Please try again.",
      apiCall: (identifiers, userApiKey) => convertToWav(identifiers, userApiKey),
    });
  },
  { route: "/api/songs/[id]/convert-wav" },
);
