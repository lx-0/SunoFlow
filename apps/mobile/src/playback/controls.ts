// Back-compat shim: playback control lives in ./audio (expo-audio queue
// controller). Library/Playlist screens import `playQueue` from here.
export {
  playQueue,
  togglePlay,
  skipToNext,
  skipToPrevious,
  seekTo,
  jumpTo,
  toggleShuffle,
  toggleRepeat,
} from "./audio";
