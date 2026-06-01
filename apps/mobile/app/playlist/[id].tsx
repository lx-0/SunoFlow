import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { fetchPlaylistSongs } from "@/api/playlists";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchPlaylistSongs(id)
      .then((s) => alive && setSongs(s))
      .catch((e) => {
        if (alive) setError("Failed to load playlist");
        console.error("[playlist] load failed", e);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) return <C><Text style={st.dim}>{error}</Text></C>;
  if (!songs) return <C><ActivityIndicator color="#fff" /></C>;
  if (songs.length === 0) return <C><Text style={st.dim}>No playable tracks in this playlist.</Text></C>;

  return (
    <FlatList
      style={st.list}
      data={songs}
      keyExtractor={(s) => s.id}
      renderItem={({ item, index }) => (
        <Pressable
          style={st.row}
          onPress={async () => {
            try {
              await playQueue(songs, index);
              router.push("/player");
            } catch (e) {
              console.error("[playlist] play failed", e);
            }
          }}
        >
          <Text style={st.title} numberOfLines={1}>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}

function C({ children }: { children: React.ReactNode }) {
  return <View style={st.c}>{children}</View>;
}

const st = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#0b0b0f" },
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f", padding: 24 },
  row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: "#1c1c22", borderBottomWidth: StyleSheet.hairlineWidth },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13 },
});
