import { authRoute } from "@/lib/route-handler";
import { runOwnedSongTransform } from "@/lib/songs/owned-transform";
import { generateMidi } from "@/lib/sunoapi";

export const POST = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    return runOwnedSongTransform({
      songId: params.id,
      userId: auth.userId,
      route: `/api/songs/${params.id}/generate-midi`,
      logLabel: "generate-midi-api",
      format: "midi",
      mockTaskId: `mock-midi-${params.id}`,
      notReadyMessage: "Song must be fully generated before extracting MIDI.",
      missingIdentifiersMessage: "Song is missing Suno identifiers for MIDI extraction.",
      fallbackErrorMessage: "MIDI generation failed. Please try again.",
      apiCall: (identifiers, userApiKey) => generateMidi(identifiers, userApiKey),
    });
  },
  { route: "/api/songs/[id]/generate-midi" },
);
