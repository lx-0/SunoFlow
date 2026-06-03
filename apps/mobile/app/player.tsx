import { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { usePlayback } from "@/playback/usePlayback";
import { togglePlay, skipToNext, skipToPrevious, seekTo } from "@/playback/audio";

// Now-Playing screen. State from the queue controller's store (in sync with the
// lock-screen). Basic player surface: artwork, tap-to-seek bar, transport.
export default function PlayerScreen() {
  const { current, playing, positionSeconds, durationSeconds } = usePlayback();
  const [barWidth, setBarWidth] = useState(0);

  const pct = durationSeconds > 0 ? Math.min(1, positionSeconds / durationSeconds) : 0;

  function onSeek(e: GestureResponderEvent) {
    if (barWidth <= 0 || durationSeconds <= 0) return;
    const frac = Math.max(0, Math.min(1, e.nativeEvent.locationX / barWidth));
    seekTo(frac * durationSeconds);
  }

  return (
    <View style={styles.container}>
      {current?.artworkUrl ? (
        <Image source={{ uri: current.artworkUrl }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]} />
      )}

      <Text style={styles.title} numberOfLines={1}>{current?.title ?? "Nothing playing"}</Text>
      <Text style={styles.artist} numberOfLines={1}>{current?.artist ?? ""}</Text>

      <Pressable
        style={styles.barWrap}
        onPress={onSeek}
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
        </View>
      </Pressable>
      <View style={styles.times}>
        <Text style={styles.time}>{fmt(positionSeconds)}</Text>
        <Text style={styles.time}>{fmt(durationSeconds)}</Text>
      </View>

      <View style={styles.row}>
        <Pressable hitSlop={12} style={styles.btn} onPress={() => skipToPrevious()}>
          <Text style={styles.btnText}>⏮</Text>
        </Pressable>
        <Pressable hitSlop={12} style={[styles.btn, styles.btnPlay]} onPress={togglePlay}>
          <Text style={styles.btnPlayText}>{playing ? "⏸" : "▶"}</Text>
        </Pressable>
        <Pressable hitSlop={12} style={styles.btn} onPress={() => skipToNext()}>
          <Text style={styles.btnText}>⏭</Text>
        </Pressable>
      </View>
    </View>
  );
}

function fmt(s: number): string {
  if (!s || Number.isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f", paddingHorizontal: 28 },
  art: { width: 300, height: 300, borderRadius: 16, marginBottom: 32 },
  artPlaceholder: { backgroundColor: "#1c1c22" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", alignSelf: "stretch" },
  artist: { color: "#9a9aa2", fontSize: 16, marginTop: 4, textAlign: "center" },
  barWrap: { alignSelf: "stretch", paddingVertical: 14, marginTop: 28 },
  barBg: { height: 4, borderRadius: 2, backgroundColor: "#2a2a32", overflow: "hidden" },
  barFill: { height: 4, backgroundColor: "#fff" },
  times: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", marginTop: -6 },
  time: { color: "#9a9aa2", fontSize: 12, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 32, marginTop: 28 },
  btn: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontSize: 30 },
  btnPlay: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff" },
  btnPlayText: { color: "#000", fontSize: 30 },
});
