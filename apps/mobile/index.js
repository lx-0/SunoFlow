import TrackPlayer from "react-native-track-player";

// Register the playback service in global scope BEFORE the app renders
// (track-player requirement) so OS remote commands work even when the JS app
// is backgrounded. Then hand off to expo-router's entry.
TrackPlayer.registerPlaybackService(() => require("./src/playback/service"));

import "expo-router/entry";
