import { NextResponse } from "next/server";
import { authRoute, requireOwned } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { getTaskStatus, isTerminalFailure, resolveUserApiKey } from "@/lib/sunoapi";
import { logServerError } from "@/lib/error-logger";
import { broadcast } from "@/lib/event-bus";
import { resolveBySongId } from "@/lib/generation-queue";
import { handleSongSuccess, handleSongFailure } from "@/lib/song-completion";

const MAX_POLL_ATTEMPTS = 60;

export const GET = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    const { data: song, error } = requireOwned(
      await prisma.song.findUnique({ where: { id: params.id } }),
      auth.userId,
      "Song",
    );
    if (error) return error;

    if (song.generationStatus === "ready" || song.generationStatus === "failed") {
      return NextResponse.json({ song });
    }

    if (!song.sunoJobId) {
      const updated = await prisma.song.update({
        where: { id: params.id },
        data: { generationStatus: "failed", errorMessage: "No Suno task ID" },
      });
      broadcast(song.userId, {
        type: "generation_update",
        data: { songId: params.id, status: "failed", errorMessage: updated.errorMessage },
      });
      return NextResponse.json({ song: updated });
    }

    const newPollCount = song.pollCount + 1;

    if (newPollCount > MAX_POLL_ATTEMPTS) {
      const updated = await prisma.song.update({
        where: { id: params.id },
        data: {
          generationStatus: "failed",
          pollCount: newPollCount,
          errorMessage: "Generation timed out",
        },
      });
      broadcast(song.userId, {
        type: "generation_update",
        data: { songId: params.id, status: "failed", errorMessage: "Generation timed out" },
      });
      await resolveBySongId(params.id, { status: "failed", errorMessage: "Generation timed out" });
      broadcast(song.userId, { type: "queue_item_complete", data: { songId: params.id } });
      return NextResponse.json({ song: updated });
    }

    const userApiKey = await resolveUserApiKey(auth.userId);
    let taskResult;
    try {
      taskResult = await getTaskStatus(song.sunoJobId, userApiKey);
    } catch (pollError) {
      logServerError("status-poll", pollError, {
        userId: auth.userId,
        route: `/api/songs/${params.id}/status`,
        params: { songId: params.id, sunoJobId: song.sunoJobId, pollCount: newPollCount },
      });
      const updated = await prisma.song.update({
        where: { id: params.id },
        data: { pollCount: newPollCount },
      });
      return NextResponse.json({ song: updated });
    }

    const isComplete = taskResult.status === "SUCCESS";
    const isFailed = isTerminalFailure(taskResult.status);

    if (isComplete && taskResult.songs.length > 0) {
      await handleSongSuccess(song, taskResult.songs);
      const updated = await prisma.song.findUnique({ where: { id: params.id } });
      return NextResponse.json({ song: updated });
    }

    if (isFailed) {
      const errorMessage = taskResult.errorMessage || `Generation failed: ${taskResult.status}`;
      await handleSongFailure(song, errorMessage);
      const updated = await prisma.song.findUnique({ where: { id: params.id } });
      return NextResponse.json({ song: updated });
    }

    const updated = await prisma.song.update({
      where: { id: params.id },
      data: { pollCount: newPollCount },
    });
    return NextResponse.json({ song: updated });
  },
  { route: "/api/songs/[id]/status" },
);
