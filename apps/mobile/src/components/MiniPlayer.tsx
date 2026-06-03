import { View, Text, Image, Pressable, StyleSheet, type GestureResponderEvent } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayback } from "@/playback/usePlayback";
import { togglePlay } from "@/playback/audio";

// Persistent now-playing bar above the tab bar on every Browse screen, so
// playback stays controllable while the user browses. Driven by the expo-audio
// controller's store. Tap opens the full Now-Playing screen. Hidden when idle.
const TAB_BAR_HEIGHT = 49; // iOS default

export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const { current, playing } = usePlayback();

  if (!current) return null;

  return (
    <Pressable
      style={[styles.bar, { bottom: insets.bottom + TAB_BAR_HEIGHT }]}
      onPress={() => router.push("/player")}
    >
      {current.artworkUrl ? (
        <Image source={{ uri: current.artworkUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {current.title}
      </Text>
      <Pressable
        hitSlop={12}
        onPress={(e: GestureResponderEvent) => {
          e.stopPropagation();
          togglePlay();
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
  thumb: { width: 36, height: 36, borderRadius: 6, marginRight: 10 },
  thumbPlaceholder: { backgroundColor: "#2a2a32" },
  title: { color: "#fff", fontSize: 14, flex: 1, marginRight: 12 },
  btn: { color: "#fff", fontSize: 20 },
});
