import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  SectionList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { Stack, router } from "expo-router";
import { Search as SearchIcon, ListMusic, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { search, type PlaylistHit, type SearchResults } from "@/api/search";
import { SongRow } from "@/components/SongRow";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { playQueue } from "@/playback/controls";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

type Status = "idle" | "loading" | "error" | "results";

// A search result is either a song row (plays on tap) or a playlist row
// (deep-links). Discriminated so a single SectionList can render both with the
// right behaviour while keeping each section's data homogeneous.
type SearchItem =
  | { kind: "song"; song: Song; index: number }
  | { kind: "playlist"; playlist: PlaylistHit };

type SearchSection = { title: string; data: SearchItem[] };

// Global search: type a query, submit to search the user's library. The
// /api/search endpoint returns exactly two categories — songs and playlists —
// so results are grouped under "Songs" / "Playlists" section headers. Songs
// resolve to playable streams (tap → play from that index via SongRow);
// playlists deep-link to their detail screen. Four states: idle (before first
// search), loading, error (HttpError-aware), and results (empty → EmptyState).
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResults>({ songs: [], playlists: [] });
  // Guards against a slow earlier request overwriting a newer one.
  const reqRef = useRef(0);
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const runSearch = useCallback((raw: string) => {
    const term = raw.trim();
    if (!term) {
      setStatus("idle");
      setResults({ songs: [], playlists: [] });
      return;
    }
    const reqId = ++reqRef.current;
    setStatus("loading");
    setError(null);
    search(term)
      .then((res) => {
        if (reqRef.current !== reqId) return;
        setResults(res);
        setStatus("results");
      })
      .catch((e: unknown) => {
        if (reqRef.current !== reqId) return;
        setError(e instanceof HttpError ? `Search failed (HTTP ${e.status})` : "Network error");
        setStatus("error");
        console.error("[search] failed", e);
      });
  }, []);

  const { songs, playlists } = results;
  const hasResults = songs.length > 0 || playlists.length > 0;

  // Only categories with hits become sections; songs keep their library index
  // so tapping plays the queue from that position.
  const sections = useMemo<SearchSection[]>(() => {
    const out: SearchSection[] = [];
    if (songs.length > 0) {
      out.push({
        title: "Songs",
        data: songs.map((song, index) => ({ kind: "song", song, index })),
      });
    }
    if (playlists.length > 0) {
      out.push({
        title: "Playlists",
        data: playlists.map((playlist) => ({ kind: "playlist", playlist })),
      });
    }
    return out;
  }, [songs, playlists]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Search" }} />
      <View style={styles.searchBar}>
        <SearchIcon color={colors.textDim} size={18} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={(e) => runSearch(e.nativeEvent.text)}
          placeholder="Search songs and playlists"
          placeholderTextColor={colors.textFaint}
          autoFocus
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {status === "idle" ? (
        <EmptyState
          Icon={SearchIcon}
          title="Search your songs"
          subtitle="Find songs and playlists in your library."
        />
      ) : status === "loading" ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : status === "error" ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error ?? "Search failed"} />
      ) : !hasResults ? (
        <EmptyState
          Icon={SearchIcon}
          title="No results"
          subtitle="Try a different search term."
        />
      ) : (
        <SectionList
          sections={sections}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          keyExtractor={(item) =>
            item.kind === "song" ? `song:${item.song.id}` : `playlist:${item.playlist.id}`
          }
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) =>
            item.kind === "song" ? (
              <SongRow
                song={item.song}
                onPress={async () => {
                  try {
                    await playQueue(songs, item.index);
                    router.navigate("/player");
                  } catch (e) {
                    console.error("[search] play failed", e);
                  }
                }}
              />
            ) : (
              <Pressable
                style={styles.row}
                onPress={() => router.push(`/playlist/${item.playlist.id}`)}
              >
                <View style={styles.thumbPlaceholder}>
                  <ListMusic color={colors.textFaint} size={22} />
                </View>
                <View style={styles.meta}>
                  <Text style={styles.title} numberOfLines={1}>{item.playlist.name}</Text>
                  {typeof item.playlist.songCount === "number" ? (
                    <Text style={styles.dim} numberOfLines={1}>
                      {item.playlist.songCount} {item.playlist.songCount === 1 ? "song" : "songs"}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            )
          }
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
    },
    input: { flex: 1, color: c.text, fontSize: 16, padding: 0 },
    sectionHeader: {
      color: c.textFaint,
      fontSize: 13,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      backgroundColor: c.bg,
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    thumbPlaceholder: {
      width: 52,
      height: 52,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceAlt,
    },
    meta: { flex: 1, minWidth: 0 },
    title: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
