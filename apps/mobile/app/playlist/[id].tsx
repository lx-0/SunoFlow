import { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { ChevronUp, ChevronDown } from "lucide-react-native";
import { fetchPlaylistSongs } from "@/api/playlists";
import { reorderPlaylistSongs } from "@/api/playlist-actions";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

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

  // Optimistic reorder: swap locally, then persist the FULL id order. On failure
  // (e.g. server length check rejects because mapApiSong dropped unplayable rows,
  // making songIds shorter than the true playlist), revert and log.
  async function move(from: number, to: number) {
    if (!id || !songs || to < 0 || to >= songs.length) return;
    const prev = songs;
    const next = [...songs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSongs(next);
    try {
      await reorderPlaylistSongs(id, next.map((s) => s.id));
    } catch (e) {
      setSongs(prev);
      console.error("[playlist] reorder failed", e);
    }
  }

  if (error) return <C><Text style={st.dim}>{error}</Text></C>;
  if (!songs) return <C><ActivityIndicator color="#fff" /></C>;

  return (
    <View style={st.list}>
      <Stack.Screen
        options={{
          title: "Playlist",
          headerRight:
            songs.length > 0
              ? () => (
                  <Pressable onPress={() => setEditing((v) => !v)} hitSlop={8}>
                    <Text style={st.editBtn}>{editing ? "Done" : "Edit"}</Text>
                  </Pressable>
                )
              : undefined,
        }}
      />
      {songs.length === 0 ? (
        <C><Text style={st.dim}>No playable tracks in this playlist.</Text></C>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(s) => s.id}
          renderItem={({ item, index }) => (
            <View style={st.row}>
              <Pressable
                style={st.titleWrap}
                disabled={editing}
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
              {editing ? (
                <View style={st.arrows}>
                  <Pressable
                    style={st.arrowBtn}
                    hitSlop={6}
                    disabled={index === 0}
                    onPress={() => void move(index, index - 1)}
                  >
                    <ChevronUp color={index === 0 ? "#3a3a42" : "#8b7cff"} size={20} />
                  </Pressable>
                  <Pressable
                    style={st.arrowBtn}
                    hitSlop={6}
                    disabled={index === songs.length - 1}
                    onPress={() => void move(index, index + 1)}
                  >
                    <ChevronDown color={index === songs.length - 1 ? "#3a3a42" : "#8b7cff"} size={20} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

function C({ children }: { children: React.ReactNode }) {
  return <View style={st.c}>{children}</View>;
}

const st = StyleSheet.create({
  list: { flex: 1, backgroundColor: "#0b0b0f" },
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f", padding: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleWrap: { flex: 1 },
  title: { color: "#fff", fontSize: 16 },
  dim: { color: "#9a9aa2", fontSize: 13 },
  editBtn: { color: "#8b7cff", fontSize: 16 },
  arrows: { flexDirection: "row", alignItems: "center", marginLeft: 12 },
  arrowBtn: { paddingHorizontal: 6, paddingVertical: 2 },
});
