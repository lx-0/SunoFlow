import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { HttpError } from "@/api/client";
import { fetchLibrary } from "@/api/songs";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

// Library: fetch the user's songs, tap to play the whole list from that index.
// Every async branch ends in visible feedback (loading / error / empty / data).
export default function LibraryScreen() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchLibrary()
      .then((data) => alive && setSongs(data))
      .catch((e: unknown) => {
        const msg = e instanceof HttpError ? `Failed to load library (HTTP ${e.status})` : "Network error";
        if (alive) setError(msg);
        console.error("[library] load failed", e);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <Centered><Text style={styles.dim}>{error}</Text></Centered>;
  if (!songs) return <Centered><ActivityIndicator color="#fff" /></Centered>;
  if (songs.length === 0) return <Centered><Text style={styles.dim}>No songs yet. Generate some on the web.</Text></Centered>;

  return (
    <FlatList
      style={styles.list}
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
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>;
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#0b0b0f" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f", padding: 24 },
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: "#1c1c22", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
