import type { ReactNode } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { formatDuration } from "@sunoflow/core";
import { Disc3 } from "lucide-react-native";
import { HeartIcon } from "@/components/Icons";
import { useTheme } from "@/theme/ThemeContext";
import type { Song } from "@/types";

// Shared song list row (artwork + title + "artist · duration" + optional right
// slot, defaulting to a favorite marker). Themed via useTheme.
export function SongRow({
  song,
  onPress,
  right,
}: {
  song: Song;
  onPress: () => void;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  const subtitle = [song.artist, song.durationSeconds ? formatDuration(song.durationSeconds) : null]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.border }]} onPress={onPress} accessibilityRole="button">
      {song.artworkUrl ? (
        <Image source={{ uri: song.artworkUrl }} style={[styles.thumb, { backgroundColor: colors.surfaceAlt }]} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
          <Disc3 color={colors.textFaint} size={22} />
        </View>
      )}
      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: colors.textDim }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ?? (song.isFavorite ? <HeartIcon color={colors.danger} filled size={16} /> : null)}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 52, height: 52, borderRadius: 8 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 16 },
  sub: { fontSize: 13, marginTop: 2 },
});
