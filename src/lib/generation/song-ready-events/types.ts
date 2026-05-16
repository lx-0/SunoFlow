import type {
  AlternateSong,
  CompletionSong,
  PersistedSong,
  SongRecord,
} from "../song-completion";

export type { AlternateSong, PersistedSong } from "../song-completion";

/**
 * Everything an adapter needs to react to "this song just became ready."
 *
 * `song` is the pre-persist record (carries userId + the prior imageUrl
 * which we sometimes fall back to). `updated` is the post-persist row.
 * `firstSong` is the upstream payload from Suno for the primary clip.
 * `alternates` are the sibling clips Suno also returned.
 */
export interface SongReadyContext {
  song: SongRecord;
  updated: PersistedSong;
  firstSong: CompletionSong;
  alternates: AlternateSong[];
}
