import { View, FlatList, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { Stack, router } from "expo-router";
import { Sparkles, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchRecommendations } from "@/api/recommendations";
import { useListResource } from "@/hooks/useListResource";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// For You: a personalised recommendation feed. Reloads on focus so it reflects
// listening/likes made elsewhere. Tap to play the list from that index.
export default function RecommendationsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { data: songs, error, refreshing, onRefresh, retry, showError } = useListResource(
    fetchRecommendations,
    {
      errorMessage: (e) =>
        e instanceof HttpError ? `Failed to load recommendations (HTTP ${e.status})` : "Network error",
      logTag: "recommendations",
    },
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "For You" }} />
      {showError ? (
        <EmptyState
          tone="error"
          Icon={AlertCircle}
          title="Couldn't load recommendations"
          subtitle={error ?? undefined}
          ctaLabel="Retry"
          onCta={retry}
        />
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
