import { useCallback, useState } from "react";
import { View, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { AudioLines } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchStems } from "@/api/stems";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Stems: separately-generated child tracks of a song. Reloads on focus.
// Tap a row to play the stem list from that index.
export default function StemsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stems, setStems] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setError("No song specified");
        return;
      }
      setStems(null);
      setError(null);
      fetchStems(id)
        .then(setStems)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Couldn't load stems (HTTP ${e.status})` : "Network error");
          console.error("[stems] load failed", e);
        });
    }, [id]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Stems" }} />
      {error ? (
        <EmptyState Icon={AudioLines} title={error} tone="error" />
      ) : !stems ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : stems.length === 0 ? (
        <EmptyState Icon={AudioLines} title="No stems for this song." subtitle="Separate vocals or instrumentals in Studio to create stems." />
      ) : (
        <FlatList
          data={stems}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              onPress={async () => {
                try {
                  await playQueue(stems, index);
                  router.push("/player");
                } catch (e) {
                  console.error("[stems] play failed", e);
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
