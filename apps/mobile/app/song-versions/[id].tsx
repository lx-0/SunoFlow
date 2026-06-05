import { useCallback, useState } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { GitBranch } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchSongVersions } from "@/api/song-versions";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Versions: the playable versions of a song (lineage root + ready variations).
// Reloads on focus. Tap a row to play the version list from that index.
export default function SongVersionsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [versions, setVersions] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setError("No song specified");
        return;
      }
      setVersions(null);
      setError(null);
      fetchSongVersions(id)
        .then(setVersions)
        .catch((e: unknown) => {
          setError(
            e instanceof HttpError ? `Couldn't load versions (HTTP ${e.status})` : "Network error",
          );
          console.error("[song-versions] load failed", e);
        });
    }, [id]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Versions" }} />
      {error ? (
        <EmptyState Icon={GitBranch} title={error} tone="error" />
      ) : !versions ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : versions.length === 0 ? (
        <EmptyState Icon={GitBranch} title="No alternate versions." subtitle="Extend or remix this song to create new versions." />
      ) : (
        <FlatList
          data={versions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              onPress={async () => {
                try {
                  await playQueue(versions, index);
                  router.push("/player");
                } catch (e) {
                  console.error("[song-versions] play failed", e);
                }
              }}
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
    list: { paddingTop: 8, paddingBottom: MINIPLAYER_CLEARANCE },
  });
}
