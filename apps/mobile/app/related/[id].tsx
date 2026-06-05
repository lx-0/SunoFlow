import { useCallback, useState } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Sparkles, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchRelated } from "@/api/related";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import type { Song } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Related ("also liked") songs for the song the user came from. Reloads on focus.
// Tap a row to play the related list from that index.
export default function RelatedScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setError("No song specified");
        return;
      }
      setSongs(null);
      setError(null);
      fetchRelated(id)
        .then(setSongs)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load related (HTTP ${e.status})` : "Network error");
          console.error("[related] load failed", e);
        });
    }, [id]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Related" }} />
      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !songs ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : songs.length === 0 ? (
        <EmptyState
          Icon={Sparkles}
          title="No related songs found"
          subtitle="We couldn't find anything similar yet."
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
                  router.push("/player");
                } catch (e) {
                  console.error("[related] play failed", e);
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
