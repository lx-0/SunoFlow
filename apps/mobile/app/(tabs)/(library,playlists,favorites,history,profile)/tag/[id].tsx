import { useCallback, useState } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Tag, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchSongsByTag, fetchTags } from "@/api/tags";
import { playQueue } from "@/playback/controls";
import { formatDuration } from "@sunoflow/core";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Songs for one tag. The id comes from the route; the name is resolved from the
// tags list for the header title. Tap a song to play the list from that index.
export default function TagSongsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [title, setTitle] = useState("Tag");
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();
  const styles = makeStyles(colors);

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
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : songs.length === 0 ? (
        <EmptyState
          Icon={Tag}
          title="No songs with this tag"
          subtitle="Tag some songs to see them here."
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.navigate("/player");
                } catch (e) {
                  console.error("[tag] play failed", e);
                }
              }}
              right={
                typeof item.durationSeconds === "number" ? (
                  <Text style={styles.duration}>{formatDuration(item.durationSeconds)}</Text>
                ) : undefined
              }
            />
          )}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    duration: { color: c.textFaint, fontSize: 13, fontVariant: ["tabular-nums"] },
  });
}
