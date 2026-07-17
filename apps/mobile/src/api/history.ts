import { recordHistoryRequestSchema, unwrapList } from "@sunoflow/core";
import { apiGet, apiPost } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Play history via the existing web endpoints (authRoute → resolveUser accepts the
// bearer sk- key). POST records a play (server dedupes + checks ownership); GET
// lists recently played, newest first.

/** Record a play. Fire-and-forget from the player; backend dedupes. */
export async function recordPlay(songId: string): Promise<void> {
  const body = recordHistoryRequestSchema.parse({ songId }); // shared contract w/ web
  await apiPost(`/api/history`, body);
}

/** Recently played songs (newest first). History items nest the song under `.song`. */
export async function fetchHistory(): Promise<Song[]> {
  const res = await apiGet<unknown>(`/api/history`);
  return unwrapList(res, "items", mapApiSong);
}
