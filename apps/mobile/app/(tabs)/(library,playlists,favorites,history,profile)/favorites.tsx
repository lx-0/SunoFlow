import { View, FlatList, Pressable, ActivityIndicator, StyleSheet, RefreshControl } from "react-native";
import { Text } from "@/components/Themed";
import { router } from "expo-router";
import { goToSection } from "@/navigation";
import { Heart, AlertCircle, Play, Shuffle } from "lucide-react-native";
import { fisherYatesShuffle } from "@sunoflow/core";
import { HttpError } from "@/api/client";
import { fetchFavorites } from "@/api/favorites";
import { useListResource } from "@/hooks/useListResource";
import { playQueue } from "@/playback/controls";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeContext";
import { radii } from "@/theme/theme";
import { useListContentStyle } from "@/components/Layout";
import type { ThemeColors } from "@/theme/theme";

// Favorites: the user's liked songs. Reloads on focus so toggles made elsewhere
// (player heart) are reflected. Tap to play the list from that index.
export default function FavoritesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const listWidth = useListContentStyle();
  const { data: songs, refreshing, onRefresh, retry, showError } = useListResource(fetchFavorites, {
    errorMessage: (e) =>
      e instanceof HttpError ? `Failed to load favorites (HTTP ${e.status})` : "Network error",
    logTag: "favorites",
  });

  // Start the whole list, in order or shuffled. Shuffling happens HERE rather
  // than by flipping the player's shuffle mode, so a one-off shuffled listen
  // does not silently rewrite the user's persisted playback preference.
  function playAll(shuffled: boolean) {
    if (!songs || songs.length === 0) return;
    const list = shuffled ? fisherYatesShuffle(songs) : songs;
    void (async () => {
      try {
        await playQueue(list, 0);
        router.navigate("/player");
      } catch (e) {
        console.error("[favorites] play all failed", e);
      }
    })();
  }

  return (
    <View style={styles.container}>
      {showError ? (
        <EmptyState
          tone="error"
          Icon={AlertCircle}
          title="Couldn't load favorites"
          subtitle="Check your connection and try again."
          ctaLabel="Retry"
          onCta={retry}
        />
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : songs.length === 0 ? (
        <EmptyState
          Icon={Heart}
          title="No favorites yet"
          subtitle="Tap the heart on a song to keep it here."
          ctaLabel="Browse library"
          onCta={() => goToSection("/")}
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          contentContainerStyle={[{ paddingBottom: MINIPLAYER_CLEARANCE }, listWidth]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textDim} />
          }
          ListHeaderComponent={
            <View style={styles.actions}>
              <Pressable
                style={styles.playAll}
                onPress={() => playAll(false)}
                accessibilityRole="button"
                accessibilityLabel={`Play all ${songs.length} favorites`}
              >
                <Play color={colors.onAccent} fill={colors.onAccent} size={18} />
                <Text style={styles.playAllText}>Play all</Text>
              </Pressable>
              <Pressable
                style={styles.shuffleBtn}
                onPress={() => playAll(true)}
                accessibilityRole="button"
                accessibilityLabel={`Shuffle all ${songs.length} favorites`}
              >
                <Shuffle color={colors.accent} size={18} />
                <Text style={styles.shuffleText}>Shuffle all</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.navigate("/player");
                } catch (e) {
                  console.error("[favorites] play failed", e);
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
    // Same shape as the playlist-detail hero buttons, so the two "start this
    // whole list" affordances read as one thing across the app.
    actions: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
    playAll: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.accentStrong, borderRadius: radii.full, paddingHorizontal: 22, paddingVertical: 11 },
    playAllText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    shuffleBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderRadius: radii.full, paddingHorizontal: 18, paddingVertical: 11 },
    shuffleText: { color: c.accent, fontSize: 15, fontWeight: "600" },
  });
}
