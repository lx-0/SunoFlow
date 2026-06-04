import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchSmartPlaylists } from "@/api/smart-playlists";
import type { PlaylistSummary } from "@/api/playlists";

// Smart Playlists: auto-curated playlists (server-maintained). Reloads on focus.
// Tap to open the existing playlist detail screen.
export default function SmartPlaylistsScreen() {
  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPlaylists(null);
      setError(null);
      fetchSmartPlaylists()
        .then(setPlaylists)
        .catch((e: unknown) => {
          setError(
            e instanceof HttpError ? `Failed to load smart playlists (HTTP ${e.status})` : "Network error",
          );
          console.error("[smart-playlists] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Smart Playlists" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !playlists ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : playlists.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No smart playlists yet.</Text></View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/playlist/${item.id}`)}>
              <View style={styles.icon}>
                <Sparkles color="#8b7cff" size={18} />
              </View>
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.dim} numberOfLines={1}>
                  {item.songCount} {item.songCount === 1 ? "song" : "songs"}
                </Text>
              </View>
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
  icon: { width: 32, alignItems: "flex-start", justifyContent: "center" },
  meta: { flex: 1 },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
