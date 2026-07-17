import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Globe, AlertCircle, Disc3, Heart } from "lucide-react-native";
import { formatDuration } from "@sunoflow/core";
import { HttpError } from "@/api/client";
import { DISCOVER_MOODS, fetchDiscover } from "@/api/discover";
import { playQueue } from "@/playback/controls";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Discover: a public feed of songs (trending / new / recommended). v1 flattens
// the server's single ranked `feed` list — sections aren't surfaced separately.
// Songs render as a 2-column card grid (matching the library grid view); tap to
// play the whole list from that index.
//
// A horizontal mood-chip row filters the feed: "All" plus the taxonomy moods.
// Selecting a mood refetches discover with `?mood=…` and replaces the list.
// Pagination is incremental "load more" on end-reached (page+1, appended).

function describeError(e: unknown): string {
  return e instanceof HttpError
    ? `Failed to load discover (HTTP ${e.status})`
    : "Network error";
}

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  // Page already loaded into `songs` (1-based). Bumped by load-more.
  const pageRef = useRef(1);

  const load = useCallback(
    (nextMood: string | null) => {
      setSongs(null);
      setError(null);
      setExhausted(false);
      pageRef.current = 1;
      fetchDiscover({ mood: nextMood ?? undefined, page: 1 })
        .then((rows) => {
          setSongs(rows);
          if (rows.length === 0) setExhausted(true);
        })
        .catch((e: unknown) => {
          setError(describeError(e));
          console.error("[discover] load failed", e);
        });
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      load(mood);
    }, [load, mood]),
  );

  const selectMood = useCallback(
    (next: string | null) => {
      if (next === mood) return;
      setMood(next);
      load(next);
    },
    [mood, load],
  );

  const loadMore = useCallback(() => {
    if (loadingMore || exhausted || !songs || songs.length === 0) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;
    fetchDiscover({ mood: mood ?? undefined, page: nextPage })
      .then((rows) => {
        if (rows.length === 0) {
          setExhausted(true);
          return;
        }
        pageRef.current = nextPage;
        setSongs((prev) => [...(prev ?? []), ...rows]);
      })
      .catch((e: unknown) => {
        console.error("[discover] load more failed", e);
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, exhausted, songs, mood]);

  const chips: { key: string; label: string; value: string | null }[] = [
    { key: "__all", label: "All", value: null },
    ...DISCOVER_MOODS.map((m) => ({
      key: m,
      label: m.charAt(0).toUpperCase() + m.slice(1),
      value: m,
    })),
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Discover" }} />
      <View style={styles.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {chips.map((chip) => {
            const active = chip.value === mood;
            return (
              <Pressable
                key={chip.key}
                onPress={() => selectMood(chip.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !songs ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : songs.length === 0 ? (
        <EmptyState
          Icon={Globe}
          title={mood ? "No songs for this mood" : "Nothing to discover yet"}
          subtitle={mood ? "Try another mood." : "Check back soon for trending and new songs."}
        />
      ) : (
        <FlatList
          key="grid"
          data={songs}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          keyExtractor={(s, i) => `${s.id}:${i}`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.gridContent}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.text} />
              </View>
            ) : null
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.gridItem}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.navigate("/player");
                } catch (e) {
                  console.error("[discover] play failed", e);
                }
              }}
            >
              <View style={styles.gridArtWrap}>
                {item.artworkUrl ? (
                  <Image source={{ uri: item.artworkUrl }} style={styles.gridArt} />
                ) : (
                  <View style={[styles.gridArt, styles.gridPlaceholder]}>
                    <Disc3 color={colors.textFaint} size={40} />
                  </View>
                )}
                {item.isFavorite ? (
                  <View style={styles.gridFav}>
                    <Heart color={colors.danger} fill={colors.danger} size={14} />
                  </View>
                ) : null}
              </View>
              <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
              {(item.artist || item.durationSeconds) ? (
                <Text style={styles.gridSub} numberOfLines={1}>
                  {[item.artist, item.durationSeconds ? formatDuration(item.durationSeconds) : null].filter(Boolean).join("  ·  ")}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    chipBar: {
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    chipRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: { backgroundColor: c.accent, borderColor: c.accent },
    chipText: { color: c.textDim, fontSize: 13, fontWeight: "500" },
    chipTextActive: { color: c.onAccent },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    footer: { paddingVertical: 16 },
    gridContent: { paddingTop: 12, paddingBottom: MINIPLAYER_CLEARANCE },
    gridRow: { paddingHorizontal: 12, gap: 12 },
    gridItem: { flex: 1, marginBottom: 18, maxWidth: "50%" },
    gridArtWrap: { borderRadius: 14 },
    gridArt: { width: "100%", aspectRatio: 1, borderRadius: 14, backgroundColor: c.surfaceAlt },
    gridPlaceholder: { alignItems: "center", justifyContent: "center" },
    gridFav: { position: "absolute", top: 8, right: 8, backgroundColor: c.bg, opacity: 0.92, borderRadius: 999, padding: 5 },
    gridTitle: { color: c.text, fontSize: 14, fontWeight: "600", marginTop: 8 },
    gridSub: { color: c.textDim, fontSize: 12, marginTop: 2 },
  });
}
