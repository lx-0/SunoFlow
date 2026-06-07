import { useCallback, useState } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { goToSection } from "@/navigation";
import { Heart, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchFavorites } from "@/api/favorites";
import { playQueue } from "@/playback/controls";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Favorites: the user's liked songs. Reloads on focus so toggles made elsewhere
// (player heart) are reflected. Tap to play the list from that index.
export default function FavoritesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
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
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
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
  });
}
