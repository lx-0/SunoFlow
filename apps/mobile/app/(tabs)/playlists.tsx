import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { fetchPlaylists, type PlaylistSummary } from "@/api/playlists";
import { createPlaylist } from "@/api/playlist-actions";
import { HttpError } from "@/api/client";

export default function PlaylistsScreen() {
  const [items, setItems] = useState<PlaylistSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    setError(null);
    fetchPlaylists()
      .then((p) => alive && setItems(p))
      .catch((e) => {
        if (alive) {
          setError(e instanceof HttpError && e.status === 401 ? "Please sign in again." : "Failed to load playlists");
        }
        console.error("[playlists] load failed", e);
      });
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(load);

  const promptCreate = useCallback(() => {
    Alert.prompt(
      "New Playlist",
      "Name your playlist",
      async (value) => {
        const name = value?.trim();
        if (!name) return;
        try {
          await createPlaylist(name);
          load();
        } catch (e) {
          console.error("[playlists] create failed", e);
          Alert.alert("Couldn't create playlist", "Please try again.");
        }
      },
      "plain-text",
    );
  }, [load]);

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable onPress={promptCreate} hitSlop={8}>
            <Plus color="#8b7cff" size={24} />
          </Pressable>
        ),
      }}
    />
  );

  if (error) return <C>{header}<Text style={st.dim}>{error}</Text></C>;
  if (!items) return <C>{header}<ActivityIndicator color="#fff" /></C>;
  if (items.length === 0) return <C>{header}<Text style={st.dim}>No playlists yet.</Text></C>;

  return (
    <View style={st.list}>
      {header}
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <Pressable style={st.row} onPress={() => router.push(`/playlist/${item.id}`)}>
            <Text style={st.title} numberOfLines={1}>{item.name}</Text>
            <Text style={st.dim}>{item.songCount} {item.songCount === 1 ? "track" : "tracks"}</Text>
          </Pressable>
        )}
      />
    </View>
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
