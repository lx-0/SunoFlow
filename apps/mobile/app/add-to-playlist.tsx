import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Check } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchPlaylists, addSongToPlaylist, type PlaylistSummary } from "@/api/playlists";
import { usePlayback } from "@/playback/usePlayback";

// Add the currently-playing song to a playlist. Lists the user's playlists; tap a
// row to add. Adds show a check; a failed add reverts and surfaces an error row.
export default function AddToPlaylistScreen() {
  const { current } = usePlayback();
  const songId = current?.id;
  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      setPlaylists(null);
      setError(null);
      fetchPlaylists()
        .then(setPlaylists)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load playlists (HTTP ${e.status})` : "Network error");
          console.error("[add-to-playlist] load failed", e);
        });
    }, []),
  );

  async function add(playlistId: string) {
    if (!songId || added.has(playlistId)) return;
    setAdded((s) => new Set(s).add(playlistId));
    setFailed((s) => {
      const n = new Set(s);
      n.delete(playlistId);
      return n;
    });
    try {
      await addSongToPlaylist(playlistId, songId);
    } catch (e) {
      console.error("[add-to-playlist] add failed", e);
      setAdded((s) => {
        const n = new Set(s);
        n.delete(playlistId);
        return n;
      });
      setFailed((s) => new Set(s).add(playlistId));
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Add to Playlist", presentation: "modal" }} />
      {!songId ? (
        <View style={styles.centered}><Text style={styles.dim}>Nothing playing.</Text></View>
      ) : error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !playlists ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : playlists.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No playlists yet.</Text></View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(p) => p.id}
          ListHeaderComponent={
            <Text style={styles.header} numberOfLines={1}>Add “{current?.title}” to…</Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => void add(item.id)}>
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.dim}>
                  {failed.has(item.id) ? "Failed — tap to retry" : `${item.songCount} songs`}
                </Text>
              </View>
              {added.has(item.id) ? <Check color="#1db954" size={22} /> : null}
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
  header: { color: "#9a9aa2", fontSize: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: { flex: 1, marginRight: 12 },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
