import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchFavorites } from "@/api/favorites";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

// Favorites: the user's liked songs. Reloads on focus so toggles made elsewhere
// (player heart) are reflected. Tap to play the list from that index.
export default function FavoritesScreen() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSongs(null);
      setError(null);
      fetchFavorites()
        .then(setSongs)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load favorites (HTTP ${e.status})` : "Network error");
          console.error("[favorites] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : songs.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No favorites yet. Tap the heart on a song.</Text></View>
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
                  console.error("[favorites] play failed", e);
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
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
