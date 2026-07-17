import { NextResponse } from "next/server";
import { authRoute } from "@/lib/route-handler";
import { requireOwnedSong } from "@/lib/songs/ownership";
import { prisma } from "@/lib/prisma";
import { resolveUserApiKey } from "@/lib/sunoapi";
import {
  advancePendingSong,
  pollOnce,
  MAX_POLL_ATTEMPTS,
  type AdvanceOutcome,
} from "@/lib/generation/completion";

export const GET = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    const { data: song, error } = await requireOwnedSong(params.id, auth.userId);
    if (error) return error;

    if (song.generationStatus === "ready" || song.generationStatus === "failed") {
      return NextResponse.json({ song });
    }

    const newPollCount = song.pollCount + 1;

    let outcome: AdvanceOutcome;
    if (!song.sunoJobId) {
      outcome = { kind: "no_suno_job_id" };
    } else if (newPollCount > MAX_POLL_ATTEMPTS) {
      outcome = { kind: "timeout" };
    } else {
      const userApiKey = await resolveUserApiKey(auth.userId);
      outcome = await pollOnce(song.sunoJobId, userApiKey);
    }

    const result = await advancePendingSong(song, outcome, {
      pollErrorLog: {
        source: "status-poll",
        route: `/api/songs/${params.id}/status`,
        params: { songId: params.id, sunoJobId: song.sunoJobId, pollCount: newPollCount },
      },
    });

    if (result.status === "processing") {
      return NextResponse.json({ song: result.updatedSong });
    }
    const updated = await prisma.song.findUnique({ where: { id: params.id } });
    return NextResponse.json({ song: updated });
  },
  { route: "/api/songs/[id]/status" },
);
