import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, router, type Href } from "expo-router";
import { formatDuration } from "@sunoflow/core";
import { Play, Disc3, Share2, Sparkles, BarChart2, Layers } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchSongDetail, detailToSong, type SongDetail } from "@/api/song-detail";
import { getFavorite, setFavorite as setFavoriteApi } from "@/api/favorites";
import { fetchLyrics, type LyricLine } from "@/api/lyrics";
import { fetchRelated } from "@/api/related";
import { playQueue } from "@/playback/controls";
import { shareSong } from "@/lib/share";
import { RatingStars } from "@/components/RatingStars";
import { HeartIcon } from "@/components/Icons";
import { SongRow } from "@/components/SongRow";
import type { Song } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Song details — mirrors the web SongDetailView: cover, title, metadata, favorite
// + rating, play/related/share, tags, prompt, lyrics, and "listeners also liked".
export default function SongDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [song, setSong] = useState<SongDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [related, setRelated] = useState<Song[]>([]);

  useFocusEffect(
    useCallback(() => {
      setSong(null);
      setError(null);
      setLyrics([]);
      setRelated([]);
      if (!id) return;
      let cancelled = false;
      fetchSongDetail(id)
        .then((s) => {
          if (cancelled) return;
          setSong(s);
          setFavorite(s.isFavorite);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof HttpError && e.status === 404 ? "Song not found" : "Failed to load song");
          console.error("[song-detail] load failed", e);
        });
      fetchLyrics(id).then((l) => !cancelled && setLyrics(l)).catch(() => {});
      fetchRelated(id).then((r) => !cancelled && setRelated(r)).catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [id]),
  );

  async function onToggleFavorite() {
    if (!id) return;
    const next = !favorite;
    setFavorite(next);
    try {
      await setFavoriteApi(id, next);
    } catch (e) {
      setFavorite(!next);
      console.error("[song-detail] favorite toggle failed", e);
    }
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Song" }} />
        <Text style={styles.dim}>{error}</Text>
      </View>
    );
  }
  if (!song) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Song" }} />
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const meta = [song.model, song.durationSeconds ? formatDuration(song.durationSeconds) : null, fmtDate(song.createdAt)]
    .filter(Boolean)
    .join("  ·  ");
  const lyricsText = lyrics.map((l) => l.text).join("\n").trim();

  async function play() {
    const s = song && detailToSong(song);
    if (!s) return;
    try {
      await playQueue([s], 0);
      router.push("/player");
    } catch (e) {
      console.error("[song-detail] play failed", e);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: song.title }} />

      {song.artworkUrl ? (
        <Image source={{ uri: song.artworkUrl }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]} />
      )}

      <Text style={styles.title}>{song.title}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}

      {/* Favorite + rating */}
      <View style={styles.favRow}>
        <Pressable hitSlop={8} style={styles.favBtn} onPress={onToggleFavorite}>
          <HeartIcon color={favorite ? colors.danger : colors.textDim} filled={favorite} size={22} />
          <Text style={styles.favCount}>{song.favoriteCount + (favorite && !song.isFavorite ? 1 : 0)}</Text>
        </Pressable>
        <RatingStars songId={song.id} size={22} />
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.playBtn} onPress={play}>
          <Play color={colors.onAccent} fill={colors.onAccent} size={18} />
          <Text style={styles.playText}>Play</Text>
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => router.push(`/related/${song.id}`)}>
          <Disc3 color={colors.text} size={18} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => router.push(`/generate?parentSongId=${song.id}`)}>
          <Sparkles color={colors.text} size={18} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => router.push(`/song-analytics/${song.id}` as Href)}>
          <BarChart2 color={colors.text} size={18} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => router.push(`/stems/${song.id}` as Href)}>
          <Layers color={colors.text} size={18} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => void shareSong({ id: song.id, title: song.title, publicSlug: song.publicSlug })}>
          <Share2 color={colors.text} size={18} />
        </Pressable>
      </View>

      {song.tags.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tags}>
            {song.tags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {song.prompt ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prompt</Text>
          <Text style={styles.body}>{song.prompt}</Text>
        </View>
      ) : null}

      {lyricsText ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Lyrics</Text>
            <Pressable onPress={() => router.push(`/lyrics-edit/${song.id}` as Href)} hitSlop={8}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>
          <Text style={styles.body}>{lyricsText}</Text>
        </View>
      ) : null}

      {related.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listeners also liked</Text>
          {related.slice(0, 5).map((r, i) => (
            <SongRow
              key={r.id}
              song={r}
              onPress={async () => {
                try {
                  await playQueue(related, i);
                  router.push("/player");
                } catch (e) {
                  console.error("[song-detail] related play failed", e);
                }
              }}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function fmtDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { paddingVertical: 24, paddingBottom: 120 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg, padding: 24 },
    art: { width: 240, height: 240, borderRadius: 16, marginBottom: 20, alignSelf: "center" },
    artPlaceholder: { backgroundColor: c.surfaceAlt },
    title: { color: c.text, fontSize: 22, fontWeight: "700", textAlign: "center", paddingHorizontal: 24 },
    meta: { color: c.textDim, fontSize: 13, marginTop: 6, textAlign: "center", paddingHorizontal: 24 },
    favRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 16 },
    favBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    favCount: { color: c.textDim, fontSize: 14 },
    actions: { flexDirection: "row", gap: 12, marginTop: 20, paddingHorizontal: 24 },
    playBtn: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 12 },
    playText: { color: c.onAccent, fontSize: 15, fontWeight: "600" },
    iconBtn: { width: 48, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceAlt, borderRadius: 12, paddingVertical: 12 },
    section: { marginTop: 24, paddingHorizontal: 24 },
    sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    editLink: { color: c.accent, fontSize: 13, fontWeight: "600" },
    sectionTitle: { color: c.textDim, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: { backgroundColor: c.surfaceAlt, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    tagText: { color: c.textDim, fontSize: 13 },
    body: { color: c.textDim, fontSize: 14, lineHeight: 21 },
    dim: { color: c.textDim, fontSize: 14 },
  });
}
