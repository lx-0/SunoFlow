import TrackPlayer, { Event } from "react-native-track-player";

// Playback service: maps OS remote-command events (lock screen, Control Center,
// headphones, CarPlay later) to track-player actions. Registered via
// TrackPlayer.registerPlaybackService in index/setup. This is what keeps audio
// controllable while the app is backgrounded or the screen is locked.
//
// Must be a top-level async function export (track-player requirement).
module.exports = async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
};
