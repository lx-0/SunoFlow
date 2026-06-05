import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator, StyleSheet, ActionSheetIOS, Alert } from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, router, type Href } from "expo-router";
import { formatDuration } from "@sunoflow/core";
import { Play, Disc3, Share2, Sparkles, BarChart2, Layers, MoreHorizontal, Tag as TagIcon, Download, GitBranch, type LucideIcon } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { createStyleTemplate } from "@/api/style-templates";
import { createPersonaFromSong } from "@/api/personas";
import { setFeaturedSong } from "@/api/profile";
import { downloadSong, exportMidi, exportMusicVideo } from "@/api/song-files";
import { archiveSong, retrySong } from "@/api/song-ops";
import { fetchSongDetail, detailToSong, renameSong, setSongVisibility, type SongDetail } from "@/api/song-detail";
import { setFavorite as setFavoriteApi } from "@/api/favorites";
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

  function saveStyleTemplate(s: SongDetail) {
    const tags = s.tagsString.trim();
    if (!tags) { Alert.alert("No style to save", "This song has no style tags."); return; }
    Alert.prompt?.(
      "Save style template",
      "Name this style",
      async (value) => {
        const name = value?.trim();
        if (!name) return;
        try { await createStyleTemplate(name, tags, s.id); Alert.alert("Saved", `Style template "${name}" saved.`); }
        catch (e) { Alert.alert("Couldn't save", "Please try again."); console.error("[song-detail] save style template failed", e); }
      },
      "plain-text",
      s.title,
    );
  }

  function createPersona(s: SongDetail) {
    if (!s.sunoJobId) { Alert.alert("Not available", "A voice persona can only be cloned from a finished generated song."); return; }
    Alert.prompt?.(
      "Create voice persona",
      "Name this persona (clones this song's voice)",
      async (value) => {
        const name = value?.trim();
        if (!name) return;
        try {
          await createPersonaFromSong({ taskId: s.sunoJobId as string, name, songId: s.id, style: s.tagsString.trim() || undefined });
          Alert.alert("Persona created", `"${name}" is ready to use in Generate.`);
        } catch (e) {
          Alert.alert("Couldn't create persona", e instanceof HttpError && e.message ? e.message : "Please try again.");
          console.error("[song-detail] create persona failed", e);
        }
      },
      "plain-text",
      `${s.title} voice`,
    );
  }

  function rename(s: SongDetail) {
    Alert.prompt?.(
      "Rename song",
      undefined,
      async (value) => {
        const title = value?.trim();
        if (!title || title === s.title) return;
        try { await renameSong(s.id, title); setSong((prev) => (prev ? { ...prev, title } : prev)); }
        catch (e) { Alert.alert("Couldn't rename", "Please try again."); console.error("[song-detail] rename failed", e); }
      },
      "plain-text",
      s.title,
    );
  }

  function toggleVisibility(s: SongDetail) {
    const next = s.isPublic ? "private" : "public";
    Alert.alert(
      next === "public" ? "Make public?" : "Make private?",
      next === "public" ? "Anyone with the link can listen." : "Only you can see this song.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: next === "public" ? "Make public" : "Make private",
          onPress: async () => {
            try { await setSongVisibility(s.id, next); setSong((prev) => (prev ? { ...prev, isPublic: next === "public" } : prev)); }
            catch (e) { Alert.alert("Couldn't update", "Please try again."); console.error("[song-detail] visibility failed", e); }
          },
        },
      ],
    );
  }

  async function featureSong(s: SongDetail) {
    try { await setFeaturedSong(s.id); Alert.alert("Featured", `"${s.title}" is now featured on your profile.`); }
    catch (e) { Alert.alert("Couldn't feature", "Please try again."); console.error("[song-detail] feature failed", e); }
  }

  function downloadExport(s: SongDetail) {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: "Download / Export", options: ["Download MP3", "Download WAV", "Download FLAC", "Export MIDI", "Export music video", "Cancel"], cancelButtonIndex: 5 },
      async (i) => {
        try {
          if (i === 0) await downloadSong(s.id, s.title, "mp3");
          else if (i === 1) await downloadSong(s.id, s.title, "wav");
          else if (i === 2) await downloadSong(s.id, s.title, "flac");
          else if (i === 3) { await exportMidi(s.id); Alert.alert("MIDI export started", "It'll be ready on the web shortly."); }
          else if (i === 4) { await exportMusicVideo(s.id); Alert.alert("Video export started", "It'll be ready on the web shortly."); }
        } catch (e) {
          Alert.alert("Couldn't complete", e instanceof HttpError && e.message ? e.message : "Please try again.");
          console.error("[song-detail] download/export failed", e);
        }
      },
    );
  }

  function archive(s: SongDetail) {
    Alert.alert("Archive song?", "It'll be hidden from your library. You can restore it on the web.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive", style: "destructive",
        onPress: async () => {
          try { await archiveSong(s.id); Alert.alert("Archived", `"${s.title}" was archived.`); router.back(); }
          catch (e) { Alert.alert("Couldn't archive", "Please try again."); console.error("[song-detail] archive failed", e); }
        },
      },
    ]);
  }

  async function retry(s: SongDetail) {
    try { await retrySong(s.id); Alert.alert("Retrying", "Generation restarted."); }
    catch (e) { Alert.alert("Couldn't retry", e instanceof HttpError && e.message ? e.message : "Please try again."); console.error("[song-detail] retry failed", e); }
  }

  function moreActions(s: SongDetail) {
    const acts: { label: string; fn: () => void }[] = [
      { label: "Rename", fn: () => rename(s) },
      { label: s.isPublic ? "Make private" : "Make public", fn: () => toggleVisibility(s) },
      { label: "Set as featured", fn: () => void featureSong(s) },
      { label: "Save style template", fn: () => saveStyleTemplate(s) },
      { label: "Create voice persona", fn: () => createPersona(s) },
    ];
    if (s.generationStatus === "failed") acts.push({ label: "Retry generation", fn: () => void retry(s) });
    acts.push({ label: "Archive", fn: () => archive(s) });
    const archiveIdx = acts.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      { title: s.title, options: [...acts.map((a) => a.label), "Cancel"], destructiveButtonIndex: archiveIdx, cancelButtonIndex: acts.length },
      (i) => { if (i >= 0 && i < acts.length) acts[i].fn(); },
    );
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

  const favCount = song.favoriteCount + (favorite && !song.isFavorite ? 1 : 0);
  const secondary: { key: string; label: string; Icon: LucideIcon; onPress: () => void }[] = [
    { key: "extend", label: "Extend", Icon: Sparkles, onPress: () => router.push(`/generate?parentSongId=${song.id}`) },
    { key: "versions", label: "Versions", Icon: GitBranch, onPress: () => router.push(`/song-versions/${song.id}` as Href) },
    { key: "stems", label: "Stems", Icon: Layers, onPress: () => router.push(`/stems/${song.id}` as Href) },
    { key: "download", label: "Download", Icon: Download, onPress: () => downloadExport(song) },
    { key: "related", label: "Related", Icon: Disc3, onPress: () => router.push(`/related/${song.id}`) },
    { key: "analytics", label: "Analytics", Icon: BarChart2, onPress: () => router.push(`/song-analytics/${song.id}` as Href) },
    { key: "tags", label: "Edit tags", Icon: TagIcon, onPress: () => router.push(`/song-tags/${song.id}` as Href) },
    { key: "more", label: "More", Icon: MoreHorizontal, onPress: () => moreActions(song) },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: song.title }} />

      {/* Hero */}
      <View style={styles.hero}>
        {song.artworkUrl ? (
          <Image source={{ uri: song.artworkUrl }} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.artPlaceholder]}>
            <Disc3 color={colors.textFaint} size={56} />
          </View>
        )}
        <Text style={styles.title}>{song.title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        <View style={[styles.badge, song.isPublic ? styles.badgePublic : styles.badgePrivate]}>
          <Text style={[styles.badgeText, song.isPublic ? styles.badgeTextPublic : styles.badgeTextPrivate]}>
            {song.isPublic ? "Public" : "Private"}
          </Text>
        </View>
      </View>

      {/* Primary actions */}
      <View style={styles.primaryRow}>
        <Pressable style={styles.playBtn} onPress={play}>
          <Play color={colors.onAccent} fill={colors.onAccent} size={20} />
          <Text style={styles.playText}>Play</Text>
        </Pressable>
        <Pressable style={styles.circleBtn} onPress={onToggleFavorite} hitSlop={6}>
          <HeartIcon color={favorite ? colors.danger : colors.text} filled={favorite} size={22} />
          {favCount > 0 ? <Text style={styles.circleCount}>{favCount}</Text> : null}
        </Pressable>
        <Pressable
          style={styles.circleBtn}
          hitSlop={6}
          onPress={() => void shareSong({ id: song.id, title: song.title, publicSlug: song.publicSlug })}
        >
          <Share2 color={colors.text} size={20} />
        </Pressable>
      </View>

      {/* Rating */}
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>Your rating</Text>
        <RatingStars songId={song.id} size={24} />
      </View>

      {/* Secondary actions — labeled, not bare icons */}
      <View style={styles.grid}>
        {secondary.map((a) => (
          <Pressable key={a.key} style={styles.gridItem} onPress={a.onPress}>
            <a.Icon color={colors.accent} size={20} />
            <Text style={styles.gridLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Tags (tap to edit) */}
      <Pressable style={styles.card} onPress={() => router.push(`/song-tags/${song.id}` as Href)}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Tags</Text>
          <Text style={styles.editLink}>Edit</Text>
        </View>
        {song.tags.length > 0 ? (
          <View style={styles.tags}>
            {song.tags.map((t) => (
              <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>
        ) : (
          <Text style={styles.cardEmpty}>No tags — tap to add.</Text>
        )}
      </Pressable>

      {song.prompt ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prompt</Text>
          <Text style={styles.body}>{song.prompt}</Text>
        </View>
      ) : null}

      {lyricsText ? (
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Lyrics</Text>
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
    content: { paddingTop: 16, paddingBottom: 140, paddingHorizontal: 16 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg, padding: 24 },

    hero: { alignItems: "center", marginBottom: 20 },
    art: { width: 220, height: 220, borderRadius: 18, marginBottom: 16, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    artPlaceholder: { backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" },
    title: { color: c.text, fontSize: 22, fontWeight: "800", textAlign: "center", lineHeight: 28 },
    meta: { color: c.textDim, fontSize: 13, marginTop: 6, textAlign: "center" },
    badge: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
    badgePublic: { backgroundColor: c.successBg },
    badgePrivate: { backgroundColor: c.surfaceAlt },
    badgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
    badgeTextPublic: { color: c.successFg },
    badgeTextPrivate: { color: c.textDim },

    primaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    playBtn: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: c.accentStrong, borderRadius: 14, paddingVertical: 15 },
    playText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    circleBtn: { minWidth: 54, height: 54, paddingHorizontal: 10, flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, borderRadius: 14 },
    circleCount: { color: c.textDim, fontSize: 13, fontWeight: "600" },

    ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
    ratingLabel: { color: c.textDim, fontSize: 14, fontWeight: "600" },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
    gridItem: { flexBasis: "31%", flexGrow: 1, alignItems: "center", gap: 6, backgroundColor: c.surface, borderRadius: 14, paddingVertical: 14 },
    gridLabel: { color: c.text, fontSize: 12, fontWeight: "600" },

    card: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginTop: 16 },
    cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    cardTitle: { color: c.text, fontSize: 15, fontWeight: "700" },
    cardEmpty: { color: c.textFaint, fontSize: 13 },
    editLink: { color: c.accent, fontSize: 13, fontWeight: "600" },

    section: { marginTop: 24 },
    sectionTitle: { color: c.textDim, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: { backgroundColor: c.surfaceAlt, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    tagText: { color: c.textDim, fontSize: 13 },
    body: { color: c.textDim, fontSize: 14, lineHeight: 21 },
    dim: { color: c.textDim, fontSize: 14 },
  });
}
