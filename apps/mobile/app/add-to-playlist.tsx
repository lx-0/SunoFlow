import { useCallback, useState } from "react";
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Check, ListPlus } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchPlaylists, addSongToPlaylist, type PlaylistSummary } from "@/api/playlists";
import { usePlayback } from "@/playback/usePlayback";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Add a song to a playlist. Targets the song passed via the `songId` param (e.g.
// from the song detail page); falls back to the currently-playing song when no
// param is given (e.g. opened from the player "…" menu). Lists the user's
// playlists; tap a row to add. Adds show a check; a failed add reverts.
export default function AddToPlaylistScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { current } = usePlayback();
  const params = useLocalSearchParams<{ songId?: string; title?: string }>();
  const songId = params.songId ?? current?.id;
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
        <EmptyState Icon={ListPlus} title="Nothing playing." subtitle="Start a song, then add it to a playlist." />
      ) : error ? (
        <EmptyState Icon={ListPlus} title={error} tone="error" />
      ) : !playlists ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : playlists.length === 0 ? (
        <EmptyState Icon={ListPlus} title="No playlists yet." subtitle="Create a playlist to start collecting songs." />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.header} numberOfLines={1}>Add “{current?.title}” to…</Text>
          }
          renderItem={({ item }) => {
            const isAdded = added.has(item.id);
            const isFailed = failed.has(item.id);
            return (
              <Pressable style={styles.row} onPress={() => void add(item.id)}>
                <View style={styles.meta}>
                  <Text style={[styles.title, isAdded && styles.titleActive]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.sub, isFailed && styles.subFailed]}>
                    {isFailed ? "Failed, tap to retry" : isAdded ? "Added" : `${item.songCount} songs`}
                  </Text>
                </View>
                {isAdded ? <Check color={colors.accent} size={22} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    list: { paddingBottom: MINIPLAYER_CLEARANCE },
    header: {
      color: c.textFaint, fontSize: 13, fontWeight: "700", textTransform: "uppercase",
      letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    meta: { flex: 1, marginRight: 12 },
    title: { color: c.text, fontSize: 15 },
    titleActive: { color: c.accent },
    sub: { color: c.textDim, fontSize: 13, marginTop: 2 },
    subFailed: { color: c.danger },
  });
}
