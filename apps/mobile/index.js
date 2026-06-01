// expo-audio needs no playback-service registration (unlike track-player).
// Background + lock-screen behaviour is configured via the expo-audio config
// plugin (app.json) + setAudioModeAsync at runtime (see src/playback/audio.ts).
import "expo-router/entry";
