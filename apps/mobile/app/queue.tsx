import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { usePlayback } from "@/playback/usePlayback";
import { jumpTo } from "@/playback/audio";
import { PlayIcon } from "@/components/Icons";

// Up-Next: the live playback queue (reads the controller's snapshot). Tap a row
// to jump straight to that track. The currently-playing row is highlighted.
export default function QueueScreen() {
  const { queue, index } = usePlayback();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Up Next" }} />
      {queue.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>Queue is empty.</Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(s, i) => `${s.id}:${i}`}
          renderItem={({ item, index: i }) => {
            const isCurrent = i === index;
            return (
              <Pressable style={styles.row} onPress={() => void jumpTo(i)}>
                <View style={styles.position}>
                  {isCurrent ? (
                    <PlayIcon color="#8b7cff" size={13} />
                  ) : (
                    <Text style={styles.positionNum}>{i + 1}</Text>
                  )}
                </View>
                <View style={styles.meta}>
                  <Text style={[styles.title, isCurrent && styles.current]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.artist ? (
                    <Text style={styles.dim} numberOfLines={1}>{item.artist}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  position: { width: 28, alignItems: "flex-start", justifyContent: "center" },
  positionNum: { color: "#6a6a72", fontSize: 13, fontVariant: ["tabular-nums"] },
  meta: { flex: 1 },
  title: { color: "#fff", fontSize: 16 },
  current: { color: "#8b7cff", fontWeight: "700" },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
