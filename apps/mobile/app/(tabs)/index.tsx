import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, TextInput, StyleSheet } from "react-native";
import { router } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchLibrary } from "@/api/songs";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

// Library: search + browse the user's songs, tap to play the list from that index.
// Hits the real GET /api/songs (bearer-authed). Every async branch ends in visible
// feedback (loading / error / empty / data).
export default function LibraryScreen() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback((q: string) => {
    setSongs(null);
    setError(null);
    fetchLibrary(q || undefined)
      .then(setSongs)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load library (HTTP ${e.status})` : "Network error");
        console.error("[library] load failed", e);
      });
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

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
          keyExtractor={(s) => s.id}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.row}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.push("/player");
                } catch (e) {
                  console.error("[library] play failed", e);
                }
              }}
            >
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              {item.artist ? <Text style={styles.dim} numberOfLines={1}>{item.artist}</Text> : null}
            </Pressable>
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
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: "#1c1c22", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
