import { broadcast } from "@/lib/event-bus";
import type { SongReadyContext } from "./types";

/**
 * Emits the three client-facing events that fire when a song becomes ready:
 *   1. one generation_update per alternate clip
 *   2. one generation_update for the primary clip
 *   3. one queue_item_complete so a pending queue item closes
 *
 * Future events of the "song-ready" shape land here.
 */
export function broadcastSongReady(ctx: SongReadyContext): void {
  for (const alt of ctx.alternates) {
    broadcast(ctx.song.userId, {
      type: "generation_update",
      data: {
        songId: alt.id,
        parentSongId: alt.parentSongId,
        status: "ready",
        title: alt.title,
        audioUrl: alt.audioUrl,
        imageUrl: alt.imageUrl,
      },
    });
  }

  broadcast(ctx.song.userId, {
    type: "generation_update",
    data: {
      songId: ctx.song.id,
      status: "ready",
      title: ctx.updated.title,
      audioUrl: ctx.updated.audioUrl,
      imageUrl: ctx.updated.imageUrl,
      alternateCount: ctx.alternates.length,
    },
  });

  broadcast(ctx.song.userId, {
    type: "queue_item_complete",
    data: { songId: ctx.song.id },
  });
}
