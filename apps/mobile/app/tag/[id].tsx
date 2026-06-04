import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchSongsByTag, fetchTags } from "@/api/tags";
import { playQueue } from "@/playback/controls";
import { formatDuration } from "@sunoflow/core";
import type { Song } from "@/types";

// Songs for one tag. The id comes from the route; the name is resolved from the
// tags list for the header title. Tap a song to play the list from that index.
export default function TagSongsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [title, setTitle] = useState("Tag");
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setSongs(null);
      setError(null);
      fetchSongsByTag(id)
        .then(setSongs)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load songs (HTTP ${e.status})` : "Network error");
          console.error("[tag] load failed", e);
        });
      fetchTags()
        .then((tags) => {
          const match = tags.find((t) => t.id === id);
          if (match) setTitle(match.name);
        })
        .catch(() => {
          // title stays "Tag" — not worth surfacing
        });
    }, [id]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : songs.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No songs with this tag.</Text></View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.row}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.push("/player");
                } catch (e) {
                  console.error("[tag] play failed", e);
                }
              }}
            >
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
  duration: { color: "#6a6a72", fontSize: 13, marginLeft: 12, fontVariant: ["tabular-nums"] },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
