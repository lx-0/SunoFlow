import { View, Text, Image, Pressable, StyleSheet, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Disc3 } from "lucide-react-native";
import { usePlayback } from "@/playback/usePlayback";
import { togglePlay, skipToNext } from "@/playback/audio";
import { openPlayer } from "@/navigation";
import { PlayIcon, PauseIcon, SkipNextIcon } from "@/components/Icons";
import { useTheme } from "@/theme/ThemeContext";

// Persistent now-playing bar near the bottom of every primary screen, so playback
// stays controllable while the user browses. Driven by the expo-audio controller's
// store. Tap opens the full Now-Playing screen. Hidden when idle.
const BOTTOM_GAP = 10; // gap above the tab bar / home indicator

// Standard bottom tab bar content height (excl. safe-area). The (tabs) layout
// passes this so the MiniPlayer floats just above the tab bar.
export const TAB_BAR_HEIGHT = 49;

// Bottom padding screens with lists should add so the floating MiniPlayer doesn't
// cover the last items. ~bar height (56) + gap + a comfortable margin.
export const MINIPLAYER_CLEARANCE = 96;

export function MiniPlayer({ tabBarHeight = 0 }: { tabBarHeight?: number }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { current, playing, positionSeconds, durationSeconds } = usePlayback();

  if (!current) return null;

  const progress = durationSeconds > 0 ? Math.min(1, Math.max(0, positionSeconds / durationSeconds)) : 0;
  const subtitle = current.artist ?? "";

  return (
    <Pressable
      style={[styles.bar, { backgroundColor: colors.surfaceAlt, bottom: insets.bottom + tabBarHeight + BOTTOM_GAP }]}
      onPress={openPlayer}
    >
      {current.artworkUrl ? (
        <Image source={{ uri: current.artworkUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.border }]}>
          <Disc3 color={colors.textFaint} size={18} />
        </View>
      )}

      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{current.title}</Text>
        {subtitle ? <Text style={[styles.artist, { color: colors.textDim }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <Pressable
        hitSlop={10}
        style={styles.ctrl}
        onPress={(e: GestureResponderEvent) => { e.stopPropagation(); togglePlay(); }}
      >
        {playing ? <PauseIcon color={colors.text} size={18} /> : <PlayIcon color={colors.text} size={18} />}
      </Pressable>
      <Pressable
        hitSlop={10}
        style={styles.ctrl}
        onPress={(e: GestureResponderEvent) => { e.stopPropagation(); void skipToNext(); }}
      >
        <SkipNextIcon color={colors.text} size={20} />
      </Pressable>

      {/* progress (clipped to the bar's rounded corners via overflow:hidden) */}
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View style={[styles.fill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
    overflow: "hidden",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "600" },
  artist: { fontSize: 12, marginTop: 1 },
  ctrl: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  track: { position: "absolute", left: 0, right: 0, bottom: 0, height: 2.5 },
  fill: { height: 2.5 },
});
