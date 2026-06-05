import { apiPost } from "./client";

// Song lifecycle-ops for the native app. Songs can't be hard-deleted, but they
// can be archived (soft-hide) and restored. retry re-runs a generation.
//
// Backend contract:
//   POST /api/songs/[id]/archive  -> result-wrapped song (un-typed here, void)
//   POST /api/songs/[id]/restore  -> result-wrapped song (un-typed here, void)
//   POST /api/songs/[id]/retry    -> { song, rateLimit }; 400 unless the song's
//                                    generationStatus === "failed"
// The orchestrator wires these to the UI; this module stays a thin transport.

/** Archive (soft-hide) a song. Throws HttpError on a non-2xx response. */
export function archiveSong(id: string): Promise<void> {
  return apiPost<void>(`/api/songs/${id}/archive`, {});
}

/** Restore (un-archive) a previously archived song. Throws HttpError on failure. */
export function restoreSong(id: string): Promise<void> {
  return apiPost<void>(`/api/songs/${id}/restore`, {});
}

/**
 * Retry a failed generation. The backend rejects with 400 (HttpError) unless
 * the song is in a `failed` state.
 */
export function retrySong(id: string): Promise<void> {
  return apiPost<void>(`/api/songs/${id}/retry`, {});
}
