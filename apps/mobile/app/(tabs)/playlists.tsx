import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Plus, ListMusic, AlertCircle } from "lucide-react-native";
import { fetchPlaylists, type PlaylistSummary } from "@/api/playlists";
import { createPlaylist } from "@/api/playlist-actions";
import { HttpError } from "@/api/client";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

export default function PlaylistsScreen() {
  const { colors } = useTheme();
  const st = makeStyles(colors);
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
            <Plus color={colors.accent} size={24} />
          </Pressable>
        ),
      }}
    />
  );

  if (error)
    return (
      <View style={st.list}>
        {header}
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
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
        renderItem={({ item }) => (
          <Pressable style={st.row} onPress={() => router.push(`/playlist/${item.id}`)}>
            <View style={st.thumb}>
              <ListMusic color={colors.textFaint} size={24} />
            </View>
            <View style={st.meta}>
              <Text style={st.title} numberOfLines={1}>{item.name}</Text>
              <Text style={st.dim}>{item.songCount} {item.songCount === 1 ? "song" : "songs"}</Text>
            </View>
          </Pressable>
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
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    thumb: {
      width: 52,
      height: 52,
      borderRadius: 8,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    meta: { flex: 1, minWidth: 0 },
    title: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
