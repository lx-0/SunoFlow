import { View, Text, Pressable, StyleSheet } from "react-native";
import { usePlayback } from "@/playback/usePlayback";
import { togglePlay, skipToNext, skipToPrevious } from "@/playback/audio";

// Now-Playing screen. State comes from the expo-audio queue controller's store
// so it stays in sync with lock-screen / Control Center controls.
export default function PlayerScreen() {
  const { current, playing, positionSeconds, durationSeconds } = usePlayback();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{current?.title ?? "Nothing playing"}</Text>
      <Text style={styles.artist}>{current?.artist ?? ""}</Text>
      <Text style={styles.time}>
        {fmt(positionSeconds)} / {fmt(durationSeconds)}
      </Text>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => skipToPrevious()}>
          <Text style={styles.btnText}>⏮</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={togglePlay}>
          <Text style={styles.btnText}>{playing ? "⏸" : "▶"}</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => skipToNext()}>
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
