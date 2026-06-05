import { useCallback, useState } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Clock, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchHistory } from "@/api/history";
import { playQueue } from "@/playback/controls";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// History: recently played, newest first. Reloads on focus. The same song can
// appear multiple times, so rows are keyed by position. Tap to play from there.
export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSongs(null);
      setError(null);
      fetchHistory()
        .then(setSongs)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load history (HTTP ${e.status})` : "Network error");
          console.error("[history] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : songs.length === 0 ? (
        <EmptyState
          Icon={Clock}
          title="Nothing played yet"
          subtitle="Songs you play will show up here."
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s, i) => `${s.id}:${i}`}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.push("/player");
                } catch (e) {
                  console.error("[history] play failed", e);
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
  });
}
