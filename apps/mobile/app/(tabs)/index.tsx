import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, TextInput, StyleSheet } from "react-native";
import { router } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchSongsPage } from "@/api/songs";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import type { Song } from "@/types";

// Library: search + browse the user's songs with cursor-based infinite scroll
// (the API paginates; we eager-load the next page on scroll). Tap to play the
// loaded list from that index. Every async branch ends in visible feedback.
export default function LibraryScreen() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const activeQueryRef = useRef(""); // guards against stale pages after a new search

  const load = useCallback((q: string) => {
    activeQueryRef.current = q;
    cursorRef.current = null;
    hasMoreRef.current = true;
    setSongs(null);
    setError(null);
    fetchSongsPage({ query: q || undefined })
      .then((page) => {
        if (activeQueryRef.current !== q) return; // a newer search superseded this
        cursorRef.current = page.nextCursor;
        hasMoreRef.current = page.nextCursor !== null;
        setSongs(page.songs);
      })
      .catch((e: unknown) => {
        if (activeQueryRef.current !== q) return;
        setError(e instanceof HttpError ? `Failed to load library (HTTP ${e.status})` : "Network error");
        console.error("[library] load failed", e);
      });
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMoreRef.current || !cursorRef.current) return;
    const q = activeQueryRef.current;
    setLoadingMore(true);
    fetchSongsPage({ query: q || undefined, cursor: cursorRef.current })
      .then((page) => {
        if (activeQueryRef.current !== q) return;
        cursorRef.current = page.nextCursor;
        hasMoreRef.current = page.nextCursor !== null;
        setSongs((prev) => [...(prev ?? []), ...page.songs]);
      })
      .catch((e: unknown) => {
        console.error("[library] load more failed", e);
        hasMoreRef.current = false; // stop hammering on a failing cursor
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search library"
        placeholderTextColor="#6a6a72"
        autoCapitalize="none"
        returnKeyType="search"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(query.trim())}
      />
      {error ? (
        <Centered><Text style={styles.dim}>{error}</Text></Centered>
      ) : !songs ? (
        <Centered><ActivityIndicator color="#fff" /></Centered>
      ) : songs.length === 0 ? (
        <Centered><Text style={styles.dim}>{query ? "No matches." : "No songs yet. Generate some on the web."}</Text></Centered>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s, i) => `${s.id}:${i}`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#6a6a72" style={styles.footer} /> : null
          }
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.push("/player");
                } catch (e) {
                  console.error("[library] play failed", e);
                }
              }}
            />
          )}
        />
      )}
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  search: { backgroundColor: "#15151b", color: "#fff", margin: 12, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
  footer: { paddingVertical: 18 },
});
