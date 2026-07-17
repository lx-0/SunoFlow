import { useCallback, useState } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Sparkles, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchRecommendations } from "@/api/recommendations";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// For You: a personalised recommendation feed. Reloads on focus so it reflects
// listening/likes made elsewhere. Tap to play the list from that index.
export default function RecommendationsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    return fetchRecommendations()
      .then(setSongs)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load recommendations (HTTP ${e.status})` : "Network error");
        console.error("[recommendations] load failed", e);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Stale-while-revalidate: keep any existing list on screen (no
      // setSongs(null)) and refetch in the background; the list is replaced
      // when the fetch resolves. Without data (first mount / after an error,
      // songs === null) the `!songs` branch still shows the full spinner, and
      // `error && !songs` still gates the error state — a failed revalidate
      // never hides a populated list.
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "For You" }} />
      {error && !songs ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : songs.length === 0 ? (
        <EmptyState
          Icon={Sparkles}
          title="No recommendations yet"
          subtitle="Listen to a few songs to get started."
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textDim} />
          }
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.navigate("/player");
                } catch (e) {
                  console.error("[recommendations] play failed", e);
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
