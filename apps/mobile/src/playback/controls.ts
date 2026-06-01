import TrackPlayer, { Track } from "react-native-track-player";
import type { Song } from "@/types";
import { setupPlayer } from "./setup";

function toTrack(song: Song): Track {
  return {
    id: song.id,
    url: song.streamUrl,
    title: song.title,
    artist: song.artist ?? "SunoFlow",
    artwork: song.artworkUrl,
    duration: song.durationSeconds,
  };
}

/** Replace the queue with `songs` and start playing at `startIndex`. */
export async function playQueue(songs: Song[], startIndex = 0): Promise<void> {
  await setupPlayer();
  await TrackPlayer.reset();
  await TrackPlayer.add(songs.map(toTrack));
  if (startIndex > 0) await TrackPlayer.skip(startIndex);
  await TrackPlayer.play();
}
