import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { fetchPlaylists, type PlaylistSummary } from "@/api/playlists";

export default function PlaylistsScreen() {
  const [items, setItems] = useState<PlaylistSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchPlaylists()
      .then((p) => alive && setItems(p))
      .catch((e) => {
        if (alive) setError("Failed to load playlists");
        console.error("[playlists] load failed", e);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <C><Text style={st.dim}>{error}</Text></C>;
  if (!items) return <C><ActivityIndicator color="#fff" /></C>;
  if (items.length === 0) return <C><Text style={st.dim}>No playlists yet.</Text></C>;

  return (
    <FlatList
      style={st.list}
      data={items}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <Pressable style={st.row} onPress={() => router.push(`/playlist/${item.id}`)}>
          <Text style={st.title} numberOfLines={1}>{item.name}</Text>
          <Text style={st.dim}>{item.songCount} {item.songCount === 1 ? "track" : "tracks"}</Text>
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
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
