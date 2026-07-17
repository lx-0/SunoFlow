import { useCallback, useRef, useState } from "react";
import { View, FlatList, ActivityIndicator, RefreshControl, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { Stack, router, useFocusEffect } from "expo-router";
import { UserPlus, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchFeedEntries, type FeedEntry } from "@/api/feed";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Following: an activity feed from the creators you follow — each entry shows who
// did what (created / favorited …) and when, and the song is playable inline.
export default function FeedScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [entries, setEntries] = useState<FeedEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Latest-data ref so the focus callback can check for existing data without
  // depending on `entries` (which would re-run the focus effect on every load).
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const load = useCallback(() => {
    setError(null);
    return fetchFeedEntries()
      .then(setEntries)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load feed (HTTP ${e.status})` : "Network error");
        console.error("[feed] load failed", e);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Stale-while-revalidate: with data already shown, revalidate silently and
      // swap it in on success; only clear (→ spinner) on first load / after an error.
      if (!entriesRef.current) setEntries(null);
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Following" }} />
      {error && !entries ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !entries ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : entries.length === 0 ? (
        <EmptyState
          Icon={UserPlus}
          title="Nothing in your feed"
          subtitle="Follow some creators to see their activity here."
        />
      ) : (
        <FlatList
          data={entries}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textDim} />
          }
          contentContainerStyle={styles.listContent}
          keyExtractor={(e, i) => `${e.song.id}:${i}`}
          renderItem={({ item, index }) => (
            <View style={styles.entry}>
              <Text style={styles.context} numberOfLines={1}>
                <Text style={styles.actor}>{item.actor ?? "Someone"}</Text>
                {` ${item.verb}`}
                {item.createdAt ? ` · ${relativeTime(item.createdAt)}` : ""}
              </Text>
              <SongRow
                song={item.song}
                onPress={async () => {
                  try {
                    await playQueue(entries.map((e) => e.song), index);
                    router.navigate("/player");
                  } catch (e) {
                    console.error("[feed] play failed", e);
                  }
                }}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

function relativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const min = Math.floor(Math.max(0, Date.now() - t) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(t).toLocaleDateString();
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    listContent: { paddingBottom: MINIPLAYER_CLEARANCE },
    entry: { paddingTop: 8 },
    context: { color: c.textDim, fontSize: 12, paddingHorizontal: 16, marginBottom: -2 },
    actor: { color: c.text, fontWeight: "600" },
  });
}
