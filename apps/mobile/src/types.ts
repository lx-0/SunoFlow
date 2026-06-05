// Minimal local shapes. PLACEHOLDER until the monorepo lands and these are
// replaced by the shared zod-derived types from packages/core (the SunoFlow
// web app's domain types — single source of truth).

export interface Song {
  id: string;
  title: string;
  /** persona / artist label shown on the lock screen */
  artist?: string;
  /** absolute stream URL served by the existing SunoFlow media endpoints */
  streamUrl: string;
  /** cover art URL for now-playing metadata */
  artworkUrl?: string;
  /** generated music-video URL — shown in place of the cover when present */
  videoUrl?: string | null;
  durationSeconds?: number;
  /** enriched library fields (present when the API returns them) */
  isFavorite?: boolean;
  rating?: number | null;
}
