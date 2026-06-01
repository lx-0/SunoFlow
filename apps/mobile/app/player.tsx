import { View, Text, Pressable, StyleSheet } from "react-native";
import TrackPlayer, {
  State,
  useActiveTrack,
  useIsPlaying,
  useProgress,
} from "react-native-track-player";

// Now-Playing screen. State comes from track-player hooks so it stays in sync
// with lock-screen / Control Center controls (single source of truth).
export default function PlayerScreen() {
  const track = useActiveTrack();
  const { playing } = useIsPlaying();
  const { position, duration } = useProgress();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{track?.title ?? "Nothing playing"}</Text>
      <Text style={styles.artist}>{track?.artist ?? ""}</Text>
      <Text style={styles.time}>
        {fmt(position)} / {fmt(duration)}
      </Text>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => TrackPlayer.skipToPrevious()}>
          <Text style={styles.btnText}>⏮</Text>
        </Pressable>
        <Pressable
          style={styles.btn}
          onPress={() => (playing ? TrackPlayer.pause() : TrackPlayer.play())}
        >
          <Text style={styles.btnText}>{playing ? "⏸" : "▶"}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => TrackPlayer.skipToNext()}>
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
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f", padding: 24 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600", textAlign: "center" },
  artist: { color: "#9a9aa2", fontSize: 16, marginTop: 4 },
  time: { color: "#9a9aa2", fontSize: 13, marginTop: 16, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", gap: 28, marginTop: 32 },
  btn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: "#1c1c22" },
  btnText: { color: "#fff", fontSize: 22 },
});

// silence unused-import lint if State is tree-shaken; kept for future buffering UI
void State;
