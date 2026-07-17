import { useCallback, useRef, useState } from "react";
import {
  View,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  ActionSheetIOS,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Text } from "@/components/Themed";
import { Stack, router, useFocusEffect } from "expo-router";
import { Radio, ChevronDown, AlertCircle } from "lucide-react-native";
import { formatDuration } from "@sunoflow/core";
import { HttpError } from "@/api/client";
import { fetchRadio, RADIO_MOODS, RADIO_GENRES } from "@/api/radio";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Radio: a generated continuous station. A controls header lets the listener pick
// a mood (horizontal chip scroll) and a genre (ActionSheetIOS picker), then start
// the station; the curated queue replaces the list. Tapping a row plays from that
// index. Every async branch ends in visible feedback (success → player, failure →
// console + UI). Mirrors the web Mood Radio (src/components/MoodRadioView.tsx).

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export default function RadioScreen() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const load = useCallback((nextMood: string | null, nextGenre: string | null, clear = true) => {
    if (clear) setSongs(null);
    setError(null);
    return fetchRadio({ mood: nextMood ?? undefined, genre: nextGenre ?? undefined })
      .then(setSongs)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load radio (HTTP ${e.status})` : "Network error");
        console.error("[radio] load failed", e);
      });
  }, []);

  // Tracks the mood|genre pair the last load was issued for. A refocus with
  // unchanged filters revalidates silently (stale-while-revalidate: the visible
  // station stays and is replaced when the fetch resolves — the render gate is
  // `error && !songs`, so a failed revalidate never hides it). A filter change
  // — the same effect re-runs while focused, since mood/genre are deps — or the
  // very first load still clears to the spinner. Start station and pull-to-
  // refresh keep their existing behavior.
  const lastParamsRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const key = `${mood ?? ""}|${genre ?? ""}`;
      const filtersChanged = lastParamsRef.current !== key;
      lastParamsRef.current = key;
      load(mood, genre, filtersChanged);
    }, [load, mood, genre]),
  );

  const play = useCallback(async (list: Song[], index: number) => {
    try {
      await playQueue(list, index);
      router.navigate("/player");
    } catch (e) {
      console.error("[radio] play failed", e);
    }
  }, []);

  const toggleMood = useCallback((m: string) => {
    setMood((prev) => (prev === m ? null : m));
  }, []);

  const pickGenre = useCallback(() => {
    const labels = ["Any genre", ...RADIO_GENRES, "Cancel"];
    const cancelButtonIndex = labels.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      { title: "Genre", options: labels, cancelButtonIndex },
      (i) => {
        if (i === cancelButtonIndex) return;
        if (i === 0) {
          setGenre(null);
          return;
        }
        setGenre(RADIO_GENRES[i - 1] ?? null);
      },
    );
  }, []);

  const startStation = useCallback(() => {
    load(mood, genre);
  }, [load, mood, genre]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(mood, genre, false).finally(() => setRefreshing(false));
  }, [load, mood, genre]);

  const header = (
    <View>
      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            style={[styles.chip, mood === null && styles.chipActive]}
            onPress={() => setMood(null)}
          >
            <Text style={[styles.chipText, mood === null && styles.chipTextActive]}>Any mood</Text>
          </Pressable>
          {RADIO_MOODS.map((m) => {
            const active = mood === m;
            return (
              <Pressable
                key={m}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => toggleMood(m)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {capitalize(m)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable style={styles.genreButton} onPress={pickGenre}>
          <Text style={styles.genreButtonText} numberOfLines={1}>
            {genre ?? "Any genre"}
          </Text>
          <ChevronDown color={colors.textDim} size={16} />
        </Pressable>

        <Pressable style={styles.playButton} onPress={startStation}>
          <Radio color={colors.onAccent} size={20} />
          <Text style={styles.playButtonText}>Start station</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Radio" }} />
      {error && !songs ? (
        <>
          {header}
          <EmptyState tone="error" Icon={AlertCircle} title={error} />
        </>
      ) : !songs ? (
        <>
          {header}
          <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
        </>
      ) : songs.length === 0 ? (
        <>
          {header}
          <EmptyState
            Icon={Radio}
            title="No station available"
            subtitle="Try another mood or genre, or generate and like some songs first."
          />
        </>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s, i) => `${s.id}:${i}`}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textDim} />
          }
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              onPress={() => void play(songs, index)}
              right={
                typeof item.durationSeconds === "number" ? (
                  <Text style={styles.duration}>{formatDuration(item.durationSeconds)}</Text>
                ) : undefined
              }
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
    controls: {
      paddingTop: 12,
      paddingBottom: 4,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    chipRow: { paddingHorizontal: 16, gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: { borderColor: c.accent, backgroundColor: c.surfaceAlt },
    chipText: { color: c.textDim, fontSize: 14 },
    chipTextActive: { color: c.accent, fontWeight: "700" },
    genreButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    genreButtonText: { color: c.text, fontSize: 15, flex: 1 },
    playButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: c.accentStrong,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      paddingVertical: 14,
      borderRadius: 12,
    },
    playButtonText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    duration: { color: c.textFaint, fontSize: 13, fontVariant: ["tabular-nums"] },
  });
}
