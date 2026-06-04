import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { formatDuration } from "@sunoflow/core";
import { Play, Disc3, Share2 } from "lucide-react-native";
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

// Song details — mirrors the web SongDetailView: cover, title, metadata, favorite
// + rating, play/related/share, tags, prompt, lyrics, and "listeners also liked".
export default function SongDetailScreen() {
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
    } catch {
      setFavorite(!next);
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
        <ActivityIndicator color="#fff" />
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
          <HeartIcon color={favorite ? "#ff4d6d" : "#9a9aa2"} filled={favorite} size={22} />
          <Text style={styles.favCount}>{song.favoriteCount + (favorite && !song.isFavorite ? 1 : 0)}</Text>
        </Pressable>
        <RatingStars songId={song.id} size={22} />
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.playBtn} onPress={play}>
          <Play color="#fff" fill="#fff" size={18} />
          <Text style={styles.playText}>Play</Text>
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => router.push(`/related/${song.id}`)}>
          <Disc3 color="#fff" size={18} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => void shareSong({ id: song.id, title: song.title, publicSlug: song.publicSlug })}>
          <Share2 color="#fff" size={18} />
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
          <Text style={styles.sectionTitle}>Lyrics</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  content: { paddingVertical: 24, paddingBottom: 120 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f", padding: 24 },
  art: { width: 240, height: 240, borderRadius: 16, marginBottom: 20, alignSelf: "center" },
  artPlaceholder: { backgroundColor: "#1c1c22" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", paddingHorizontal: 24 },
  meta: { color: "#9a9aa2", fontSize: 13, marginTop: 6, textAlign: "center", paddingHorizontal: 24 },
  favRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 16 },
  favBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  favCount: { color: "#9a9aa2", fontSize: 14 },
  actions: { flexDirection: "row", gap: 12, marginTop: 20, paddingHorizontal: 24 },
  playBtn: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#7c3aed", borderRadius: 12, paddingVertical: 12 },
  playText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  iconBtn: { width: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#1c1c22", borderRadius: 12, paddingVertical: 12 },
  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionTitle: { color: "#cfcfd6", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: "#1c1c22", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: "#cfcfd6", fontSize: 13 },
  body: { color: "#9a9aa2", fontSize: 14, lineHeight: 21 },
  dim: { color: "#9a9aa2", fontSize: 14 },
});
