import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer, { useActiveTrack, useIsPlaying } from "react-native-track-player";

// Persistent now-playing bar shown above the tab bar on every Browse screen, so
// playback stays controllable while the user browses. Pure track-player state —
// no API. Tap opens the full Now-Playing screen. Renders nothing when idle.
const TAB_BAR_HEIGHT = 49; // iOS default

export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const track = useActiveTrack();
  const { playing } = useIsPlaying();

  if (!track) return null;

  return (
    <Pressable
      style={[styles.bar, { bottom: insets.bottom + TAB_BAR_HEIGHT }]}
      onPress={() => router.push("/player")}
    >
      <Text style={styles.title} numberOfLines={1}>
        {track.title ?? "Now playing"}
      </Text>
      <Pressable
        hitSlop={12}
        onPress={(e) => {
          e.stopPropagation?.();
          playing ? TrackPlayer.pause() : TrackPlayer.play();
        }}
      >
        <Text style={styles.btn}>{playing ? "⏸" : "▶"}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#1c1c22",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  title: { color: "#fff", fontSize: 14, flex: 1, marginRight: 12 },
  btn: { color: "#fff", fontSize: 20 },
});
