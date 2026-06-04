import { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Stack, router } from "expo-router";
import { Search as SearchIcon, ListMusic } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { search, type SearchResults } from "@/api/search";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

type Status = "idle" | "loading" | "error" | "results";

// Global search: type a query, submit to search the user's library. Songs
// resolve to playable streams (tap → play from that index); playlists deep-link
// to their detail screen. Four states: idle (before first search), loading,
// error (HttpError-aware), and results (which itself renders an empty hint).
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResults>({ songs: [], playlists: [] });
  // Guards against a slow earlier request overwriting a newer one.
  const reqRef = useRef(0);

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Search" }} />
      <View style={styles.searchBar}>
        <SearchIcon color="#9a9aa2" size={18} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={(e) => runSearch(e.nativeEvent.text)}
          placeholder="Search songs and playlists"
          placeholderTextColor="#6a6a72"
          autoFocus
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {status === "idle" ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>Search your songs and playlists.</Text>
        </View>
      ) : status === "loading" ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : status === "error" ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !hasResults ? (
        <View style={styles.centered}><Text style={styles.dim}>No results.</Text></View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={
            playlists.length > 0 ? (
              <View>
                <Text style={styles.sectionHeader}>Playlists</Text>
                {playlists.map((p) => (
                  <Pressable
                    key={p.id}
                    style={styles.row}
                    onPress={() => router.push(`/playlist/${p.id}`)}
                  >
                    <ListMusic color="#9a9aa2" size={18} style={styles.rowIcon} />
                    <View style={styles.meta}>
                      <Text style={styles.title} numberOfLines={1}>{p.name}</Text>
                      {typeof p.songCount === "number" ? (
                        <Text style={styles.dim} numberOfLines={1}>
                          {p.songCount} {p.songCount === 1 ? "song" : "songs"}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
                {songs.length > 0 ? <Text style={styles.sectionHeader}>Songs</Text> : null}
              </View>
            ) : songs.length > 0 ? (
              <Text style={styles.sectionHeader}>Songs</Text>
            ) : null
          }
          renderItem={({ item, index }: { item: Song; index: number }) => (
            <Pressable
              style={styles.row}
              onPress={async () => {
                try {
                  await playQueue(songs, index);
                  router.push("/player");
                } catch (e) {
                  console.error("[search] play failed", e);
                }
              }}
            >
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                {item.artist ? <Text style={styles.dim} numberOfLines={1}>{item.artist}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
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
    backgroundColor: "#15151b",
    borderRadius: 12,
    borderColor: "#1c1c22",
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, color: "#fff", fontSize: 16, padding: 0 },
  sectionHeader: {
    color: "#9a9aa2",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { marginRight: 12 },
  meta: { flex: 1 },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
