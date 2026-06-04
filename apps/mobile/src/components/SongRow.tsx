import type { ReactNode } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { formatDuration } from "@sunoflow/core";
import { HeartIcon } from "@/components/Icons";
import type { Song } from "@/types";

// Shared song list row used across every song list (library, favorites, history,
// discover, playlists, search, …) so they all look the same. Artwork thumbnail +
// title + "artist · duration", with an optional right-hand slot (e.g. an icon).
export function SongRow({
  song,
  onPress,
  right,
}: {
  song: Song;
  onPress: () => void;
  right?: ReactNode;
}) {
  const subtitle = [song.artist, song.durationSeconds ? formatDuration(song.durationSeconds) : null]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {song.artworkUrl ? (
        <Image source={{ uri: song.artworkUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.placeholder]} />
      )}
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
        {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ?? (song.isFavorite ? <HeartIcon color="#ff4d6d" filled size={16} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#1c1c22" },
  placeholder: { backgroundColor: "#1c1c22" },
  meta: { flex: 1, minWidth: 0 },
  title: { color: "#fff", fontSize: 16 },
  sub: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
