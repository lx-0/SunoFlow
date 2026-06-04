import { View, Text, Image, Pressable, StyleSheet, type GestureResponderEvent } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayback } from "@/playback/usePlayback";
import { togglePlay } from "@/playback/audio";
import { PlayIcon, PauseIcon } from "@/components/Icons";

// Persistent now-playing bar near the bottom of every primary screen, so playback
// stays controllable while the user browses. Driven by the expo-audio controller's
// store. Tap opens the full Now-Playing screen. Hidden when idle.
const BOTTOM_GAP = 10; // sits just above the home indicator (no tab bar anymore)

// Bottom padding screens with lists should add so the floating MiniPlayer doesn't
// cover the last items. ~bar height (52) + gap + a comfortable margin.
export const MINIPLAYER_CLEARANCE = 96;

export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const { current, playing } = usePlayback();

  if (!current) return null;

  return (
    <Pressable
      style={[styles.bar, { bottom: insets.bottom + BOTTOM_GAP }]}
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
        {playing ? <PauseIcon color="#fff" size={16} /> : <PlayIcon color="#fff" size={16} />}
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
});
