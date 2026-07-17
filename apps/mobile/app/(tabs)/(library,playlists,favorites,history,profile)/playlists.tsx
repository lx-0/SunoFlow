import { useCallback } from "react";
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, RefreshControl } from "react-native";
import { Text } from "@/components/Themed";
import { Stack, router } from "expo-router";
import { Plus, ListMusic, AlertCircle, Play, Shuffle } from "lucide-react-native";
import { fetchPlaylists, fetchPlaylistSongs, type PlaylistSummary } from "@/api/playlists";
import { createPlaylist } from "@/api/playlist-actions";
import { playQueue } from "@/playback/controls";
import { HttpError } from "@/api/client";
import { useListResource } from "@/hooks/useListResource";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { EmptyState } from "@/components/EmptyState";
import { usePrompt } from "@/components/PromptSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const st = makeStyles(colors);
  const prompt = usePrompt();
  const { data: items, error, refreshing, onRefresh, retry, revalidate } = useListResource(fetchPlaylists, {
    errorMessage: (e) =>
      e instanceof HttpError && e.status === 401 ? "Please sign in again." : "Failed to load playlists",
    logTag: "playlists",
  });

  const promptCreate = useCallback(async () => {
    const value = await prompt({ title: "New Playlist", message: "Name your playlist" });
    const name = value?.trim();
    if (!name) return;
    try {
      await createPlaylist(name);
      // Truly silent reload: revalidate has no refreshing flag, so the
      // RefreshControl spinner doesn't pop programmatically.
      revalidate();
    } catch (e) {
      console.error("[playlists] create failed", e);
      Alert.alert("Couldn't create playlist", "Please try again.");
    }
  }, [revalidate, prompt]);

  async function playPlaylist(p: PlaylistSummary, shuffled: boolean) {
    if (p.songCount === 0) return;
    try {
      const songs = await fetchPlaylistSongs(p.id);
      if (songs.length === 0) { Alert.alert("Nothing to play", "This playlist has no playable tracks."); return; }
      const list = shuffled ? [...songs].sort(() => Math.random() - 0.5) : songs;
      await playQueue(list, 0);
      router.navigate("/player");
    } catch (e) {
      Alert.alert("Couldn't play", "Please try again.");
      console.error("[playlists] play failed", e);
    }
  }

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable
            onPress={promptCreate}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Create playlist"
            testID="create-playlist"
          >
            <Plus color={colors.accent} size={24} />
          </Pressable>
        ),
      }}
    />
  );

  if (error && !items)
    return (
      <View style={st.list}>
        {header}
        <EmptyState
          tone="error"
          Icon={AlertCircle}
          title="Couldn't load playlists"
          subtitle={error ?? undefined}
          ctaLabel="Retry"
          onCta={retry}
        />
      </View>
    );
  if (!items) return <C>{header}<ActivityIndicator color={colors.text} /></C>;
  if (items.length === 0)
    return (
      <View style={st.list}>
        {header}
        <EmptyState
          Icon={ListMusic}
          title="No playlists yet"
          subtitle="Group your favorite songs into a playlist."
          ctaLabel="New playlist"
          onCta={promptCreate}
        />
      </View>
    );

  return (
    <View style={st.list}>
      {header}
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textDim} />
        }
        renderItem={({ item }) => (
          <View style={st.row}>
            <Pressable style={st.rowMain} onPress={() => router.push(`/playlist/${item.id}`)}>
              <View style={st.thumb}>
                <ListMusic color={colors.textFaint} size={24} />
              </View>
              <View style={st.meta}>
                <Text style={st.title} numberOfLines={1}>{item.name}</Text>
                <Text style={st.dim}>{item.songCount} {item.songCount === 1 ? "song" : "songs"}</Text>
              </View>
            </Pressable>
            {item.songCount > 0 ? (
              <View style={st.actions}>
                <Pressable
                  style={st.actBtn}
                  hitSlop={6}
                  onPress={() => void playPlaylist(item, false)}
                  accessibilityRole="button"
                  accessibilityLabel="Play playlist"
                >
                  <Play color={colors.textDim} fill={colors.textDim} size={18} />
                </Pressable>
                <Pressable
                  style={st.actBtn}
                  hitSlop={6}
                  onPress={() => void playPlaylist(item, true)}
                  accessibilityRole="button"
                  accessibilityLabel="Shuffle playlist"
                >
                  <Shuffle color={colors.textDim} size={18} />
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

function C({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const st = makeStyles(colors);
  return <View style={st.c}>{children}</View>;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: { flex: 1, backgroundColor: c.bg },
    c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg, padding: 24 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
    actions: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 8 },
    actBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, borderRadius: radii.full },
    thumb: {
      width: 52,
      height: 52,
      borderRadius: radii.md,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    meta: { flex: 1, minWidth: 0 },
    title: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
