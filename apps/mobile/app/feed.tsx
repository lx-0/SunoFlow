import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchFeed } from "@/api/feed";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

// Following: playable songs from the creators the user follows. Reloads on focus.
// Tap a row to play the feed from that index.
export default function FeedScreen() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSongs(null);
      setError(null);
      fetchFeed()
        .then(setSongs)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load feed (HTTP ${e.status})` : "Network error");
          console.error("[feed] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Following" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : songs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>Nothing here yet. Follow creators to hear their new songs.</Text>
        </View>
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
                  console.error("[feed] play failed", e);
                }
              }}
            >
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              {item.artist ? <Text style={styles.dim} numberOfLines={1}>{item.artist}</Text> : null}
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
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: "#1c1c22", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2, textAlign: "center" },
});
