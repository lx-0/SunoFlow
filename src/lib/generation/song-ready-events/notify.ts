import { notifyFollowersOfNewSong, notifyUser } from "@/lib/notifications";
import type { SongReadyContext } from "./types";

/**
 * Tell humans the song is ready:
 *   - in-app + push notification to the creator
 *   - notification fanout to anyone following the creator
 *
 * Followers + creator notifications are independent — one branch failing
 * (e.g. push token expired) must not silence the other.
 */
export async function notifyAboutReadySong(ctx: SongReadyContext): Promise<void> {
  await Promise.all([
    notifyFollowersOfNewSong(ctx.song.userId, ctx.song.id).catch(() => undefined),

    notifyUser({
      userId: ctx.song.userId,
      type: "generation_complete",
      title: "Your song is ready!",
      message: `"${ctx.updated.title || "Untitled"}" has finished generating`,
      href: "/library",
      songId: ctx.song.id,
      push: { tag: `generation-complete-${ctx.song.id}` },
    }).catch(() => undefined),
  ]);
}
