import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { formatDuration } from "@sunoflow/core";
import { HttpError } from "@/api/client";
import { fetchCollectionSongs } from "@/api/collections";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

// One collection's songs. Tap a row → play the collection from that index.
export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSongs(null);
      setError(null);
      if (!id) {
        setError("Missing collection id");
        return;
      }
      fetchCollectionSongs(id)
        .then(setSongs)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load collection (HTTP ${e.status})` : "Network error");
          console.error("[collection] load failed", e);
        });
    }, [id]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Collection" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : songs.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>This collection has no playable songs.</Text></View>
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
                  console.error("[collection] play failed", e);
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
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
  duration: { color: "#9a9aa2", fontSize: 13, marginLeft: 12, fontVariant: ["tabular-nums"] },
});
