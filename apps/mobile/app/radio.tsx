import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Radio } from "lucide-react-native";
import { formatDuration } from "@sunoflow/core";
import { HttpError } from "@/api/client";
import { fetchRadio } from "@/api/radio";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

// Radio: a generated continuous station. Loads the curated queue on focus, shows
// the upcoming songs, and offers a prominent "Play Radio" button that plays the
// whole list from the top. Tapping a row plays from that index. Every async
// branch ends in visible feedback (success → player, failure → console + UI).
export default function RadioScreen() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSongs(null);
      setError(null);
      fetchRadio()
        .then(setSongs)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load radio (HTTP ${e.status})` : "Network error");
          console.error("[radio] load failed", e);
        });
    }, []),
  );

  const play = useCallback(async (list: Song[], index: number) => {
    try {
      await playQueue(list, index);
      router.push("/player");
    } catch (e) {
      console.error("[radio] play failed", e);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Radio" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : songs.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No station available right now. Generate or like some songs first.</Text></View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s, i) => `${s.id}:${i}`}
          ListHeaderComponent={
            <Pressable style={styles.playButton} onPress={() => void play(songs, 0)}>
              <Radio color="#0b0b0f" size={20} />
              <Text style={styles.playButtonText}>Play Radio</Text>
            </Pressable>
          }
          renderItem={({ item, index }) => (
            <Pressable style={styles.row} onPress={() => void play(songs, index)}>
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                {item.artist ? <Text style={styles.dim} numberOfLines={1}>{item.artist}</Text> : null}
              </View>
              {typeof item.durationSeconds === "number" ? (
                <Text style={styles.duration}>{formatDuration(item.durationSeconds)}</Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#8b7cff",
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  playButtonText: { color: "#0b0b0f", fontSize: 16, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: { flex: 1 },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
  duration: { color: "#6a6a72", fontSize: 13, marginLeft: 12, fontVariant: ["tabular-nums"] },
});
