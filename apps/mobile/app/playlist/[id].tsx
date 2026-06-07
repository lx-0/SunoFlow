import { useCallback, useState } from "react";
import { View, Text, Image, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS } from "react-native";
import { Stack, router, useLocalSearchParams, useFocusEffect, type Href } from "expo-router";
import { ChevronUp, ChevronDown, Pencil, Trash2, Share2, Users, MoreHorizontal, Play, Shuffle, ListMusic } from "lucide-react-native";
import { fetchPlaylistSongs } from "@/api/playlists";
import { fetchPlaylistCollabMeta } from "@/api/collaborators";
import {
  reorderPlaylistSongs,
  renamePlaylist,
  deletePlaylist,
  copyPlaylist,
  setPlaylistPublished,
  fetchPlaylistPublished,
} from "@/api/playlist-actions";
import { sharePlaylist } from "@/lib/share";
import { SongRow } from "@/components/SongRow";
import { playQueue } from "@/playback/controls";
import type { Song } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

export default function PlaylistDetailScreen() {
  const { colors } = useTheme();
  const st = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [name, setName] = useState("Playlist");

  const load = useCallback(() => {
    if (!id) return;
    fetchPlaylistSongs(id)
      .then(setSongs)
      .catch((e) => {
        setError("Failed to load playlist");
        console.error("[playlist] load failed", e);
      });
    // Name + published state drive the hero/title + overflow label; non-fatal.
    fetchPlaylistCollabMeta(id)
      .then((m) => setName(m.name))
      .catch((e) => console.error("[playlist] meta load failed", e));
    fetchPlaylistPublished(id)
      .then(setIsPublic)
      .catch((e) => console.error("[playlist] published-state load failed", e));
  }, [id]);

  function playAll(shuffled: boolean) {
    if (!songs || songs.length === 0) return;
    const list = shuffled ? [...songs].sort(() => Math.random() - 0.5) : songs;
    void (async () => {
      try { await playQueue(list, 0); router.navigate("/player"); }
      catch (e) { console.error("[playlist] play all failed", e); }
    })();
  }

  // Reload on focus so returning after add-to-playlist / collaborator changes
  // doesn't show stale songs.
  useFocusEffect(useCallback(() => { load(); }, [load]));

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

  function promptRename() {
    if (!id) return;
    Alert.prompt(
      "Rename Playlist",
      "Enter a new name",
      async (value) => {
        const name = value?.trim();
        if (!name) return;
        try {
          await renamePlaylist(id, name);
          load();
          Alert.alert("Renamed", `Playlist renamed to "${name}".`);
        } catch (e) {
          console.error("[playlist] rename failed", e);
          Alert.alert("Couldn't rename playlist", "Please try again.");
        }
      },
      "plain-text",
    );
  }

  function confirmDelete() {
    if (!id) return;
    Alert.alert("Delete Playlist", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePlaylist(id);
            router.back();
          } catch (e) {
            console.error("[playlist] delete failed", e);
            Alert.alert("Couldn't delete playlist", "Please try again.");
          }
        },
      },
    ]);
  }

  async function duplicate() {
    if (!id) return;
    try {
      const newId = await copyPlaylist(id);
      router.push(`/playlist/${newId}` as Href);
      Alert.alert("Duplicated", "A copy was added to your playlists.");
    } catch (e) {
      console.error("[playlist] duplicate failed", e);
      Alert.alert("Couldn't duplicate playlist", "Please try again.");
    }
  }

  function togglePublish() {
    if (!id) return;
    const next = !isPublic;
    Alert.alert(
      next ? "Make public" : "Make private",
      next
        ? "This playlist will be published and discoverable."
        : "This playlist will no longer be published.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: next ? "Make public" : "Make private",
          onPress: async () => {
            try {
              await setPlaylistPublished(id, next);
              setIsPublic(next);
            } catch (e) {
              console.error("[playlist] publish toggle failed", e);
              Alert.alert("Couldn't update visibility", "Please try again.");
            }
          },
        },
      ],
    );
  }

  function openOverflow() {
    if (!id) return;
    const publishLabel = isPublic ? "Make private" : "Make public";
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Duplicate playlist", publishLabel, "Cancel"],
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) void duplicate();
        else if (index === 1) togglePublish();
      },
    );
  }

  if (error) return <C colors={colors}><Text style={st.dim}>{error}</Text></C>;
  if (!songs) return <C colors={colors}><ActivityIndicator color={colors.text} /></C>;

  return (
    <View style={st.list}>
      <Stack.Screen
        options={{
          title: name,
          headerRight: () => (
            <View style={st.headerActions}>
              {songs.length > 0 ? (
                <Pressable onPress={() => setEditing((v) => !v)} hitSlop={8}>
                  <Text style={st.editBtn}>{editing ? "Done" : "Edit"}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => router.push(`/collaborators/${id}` as Href)} hitSlop={8}>
                <Users color={colors.accent} size={20} />
              </Pressable>
              <Pressable onPress={() => void sharePlaylist({ id })} hitSlop={8}>
                <Share2 color={colors.accent} size={20} />
              </Pressable>
              <Pressable onPress={promptRename} hitSlop={8}>
                <Pencil color={colors.accent} size={20} />
              </Pressable>
              <Pressable onPress={confirmDelete} hitSlop={8}>
                <Trash2 color={colors.danger} size={20} />
              </Pressable>
              <Pressable onPress={openOverflow} hitSlop={8}>
                <MoreHorizontal color={colors.accent} size={20} />
              </Pressable>
            </View>
          ),
        }}
      />
      <FlatList
        data={songs}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={
          <View style={st.hero}>
            {songs[0]?.artworkUrl ? (
              <Image source={{ uri: songs[0].artworkUrl }} style={st.cover} />
            ) : (
              <View style={[st.cover, st.coverPlaceholder]}>
                <ListMusic color={colors.textFaint} size={48} />
              </View>
            )}
            <Text style={st.heroName} numberOfLines={2}>{name}</Text>
            <Text style={st.heroMeta}>{songs.length} {songs.length === 1 ? "song" : "songs"}{isPublic ? " · Public" : ""}</Text>
            {songs.length > 0 ? (
              <View style={st.heroBtns}>
                <Pressable style={st.playAll} onPress={() => playAll(false)}>
                  <Play color={colors.onAccent} fill={colors.onAccent} size={18} />
                  <Text style={st.playAllText}>Play all</Text>
                </Pressable>
                <Pressable style={st.shuffleBtn} onPress={() => playAll(true)}>
                  <Shuffle color={colors.accent} size={18} />
                  <Text style={st.shuffleText}>Shuffle</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<View style={st.empty}><Text style={st.dim}>No playable tracks in this playlist.</Text></View>}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            onPress={async () => {
              if (editing) return;
              try {
                await playQueue(songs, index);
                router.navigate("/player");
              } catch (e) {
                console.error("[playlist] play failed", e);
              }
            }}
            right={
              editing ? (
                <View style={st.arrows}>
                  <Pressable style={st.arrowBtn} hitSlop={6} disabled={index === 0} onPress={() => void move(index, index - 1)}>
                    <ChevronUp color={index === 0 ? colors.textFaint : colors.accent} size={20} />
                  </Pressable>
                  <Pressable style={st.arrowBtn} hitSlop={6} disabled={index === songs.length - 1} onPress={() => void move(index, index + 1)}>
                    <ChevronDown color={index === songs.length - 1 ? colors.textFaint : colors.accent} size={20} />
                  </Pressable>
                </View>
              ) : null
            }
          />
        )}
      />
    </View>
  );
}

function C({ colors, children }: { colors: ThemeColors; children: React.ReactNode }) {
  const st = makeStyles(colors);
  return <View style={st.c}>{children}</View>;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: { flex: 1, backgroundColor: c.bg },
    c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg, padding: 24 },
    empty: { padding: 32, alignItems: "center" },
    dim: { color: c.textDim, fontSize: 13 },
    editBtn: { color: c.accent, fontSize: 16 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
    arrows: { flexDirection: "row", alignItems: "center" },
    arrowBtn: { paddingHorizontal: 6, paddingVertical: 2 },
    hero: { alignItems: "center", paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20 },
    cover: { width: 160, height: 160, borderRadius: 16, marginBottom: 14 },
    coverPlaceholder: { backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" },
    heroName: { color: c.text, fontSize: 20, fontWeight: "800", textAlign: "center" },
    heroMeta: { color: c.textDim, fontSize: 13, marginTop: 4 },
    heroBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
    playAll: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.accentStrong, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 11 },
    playAllText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    shuffleBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11 },
    shuffleText: { color: c.accent, fontSize: 15, fontWeight: "600" },
  });
}
