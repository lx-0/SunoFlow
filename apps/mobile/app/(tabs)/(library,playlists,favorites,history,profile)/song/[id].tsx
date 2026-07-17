import { useCallback, useRef, useState } from "react";
import { View, Image, Pressable, ScrollView, ActivityIndicator, StyleSheet, ActionSheetIOS, Alert } from "react-native";
import { Text } from "@/components/Themed";
import { Stack, useFocusEffect, useLocalSearchParams, router, type Href } from "expo-router";
import { formatDuration } from "@sunoflow/core";
import { Play, Disc3, Share2, Sparkles, BarChart2, Layers, MoreHorizontal, Tag as TagIcon, Download, GitBranch, Wand2, Film, ListPlus, ThumbsUp, ThumbsDown, type LucideIcon } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { createStyleTemplate } from "@/api/style-templates";
import { createPersonaFromSong } from "@/api/personas";
import { setFeaturedSong } from "@/api/profile";
import { VideoCover } from "@/components/VideoCover";
import { downloadSong, exportMidi, exportMusicVideo, fetchMusicVideoStatus } from "@/api/song-files";
import { archiveSong, retrySong } from "@/api/song-ops";
import { separateVocals, addInstrumental, addVocals, setCoverArt } from "@/api/song-studio";
import { fetchSongDetail, detailToSong, renameSong, setSongVisibility, type SongDetail } from "@/api/song-detail";
import { setFavorite as setFavoriteApi } from "@/api/favorites";
import { fetchLyrics, type LyricLine } from "@/api/lyrics";
import { fetchRelated } from "@/api/related";
import { fetchSongTags, type SongTag } from "@/api/tags";
import { fetchFeedback, setFeedback, type ThumbsRating } from "@/api/song-feedback";
import { playQueue } from "@/playback/controls";
import { shareSong } from "@/lib/share";
import { RatingStars } from "@/components/RatingStars";
import { HeartIcon } from "@/components/Icons";
import { SongRow } from "@/components/SongRow";
import { usePrompt } from "@/components/PromptSheet";
import type { Song } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";

// Song details — mirrors the web SongDetailView: cover, title, metadata, favorite
// + rating, play/related/share, tags, prompt, lyrics, and "listeners also liked".
export default function SongDetailScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const prompt = usePrompt();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [song, setSong] = useState<SongDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [related, setRelated] = useState<Song[]>([]);
  const [customTags, setCustomTags] = useState<SongTag[]>([]);
  const [thumbs, setThumbs] = useState<ThumbsRating | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoPoll = useRef(0); // bumped to cancel an in-flight poll loop

  useFocusEffect(
    useCallback(() => {
      setSong(null);
      setError(null);
      setLyrics([]);
      setRelated([]);
      setCustomTags([]);
      setThumbs(null);
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
      fetchSongTags(id).then((t) => !cancelled && setCustomTags(t)).catch(() => {});
      fetchFeedback(id).then((f) => !cancelled && setThumbs(f)).catch(() => {});
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

  async function onThumbs(rating: ThumbsRating) {
    if (!id) return;
    const prev = thumbs;
    setThumbs(rating); // optimistic; the API has no "clear", so a tap always sets
    try {
      await setFeedback(id, rating);
    } catch (e) {
      setThumbs(prev);
      console.error("[song-detail] feedback failed", e);
    }
  }

  async function saveStyleTemplate(s: SongDetail) {
    const tags = s.tagsString.trim();
    if (!tags) { Alert.alert("No style to save", "This song has no style tags."); return; }
    const value = await prompt({ title: "Save style template", message: "Name this style", defaultValue: s.title });
    const name = value?.trim();
    if (!name) return;
    try { await createStyleTemplate(name, tags, s.id); Alert.alert("Saved", `Style template "${name}" saved.`); }
    catch (e) { Alert.alert("Couldn't save", "Please try again."); console.error("[song-detail] save style template failed", e); }
  }

  async function createPersona(s: SongDetail) {
    if (!s.sunoJobId) { Alert.alert("Not available", "A voice persona can only be cloned from a finished generated song."); return; }
    const value = await prompt({ title: "Create voice persona", message: "Name this persona (clones this song's voice)", defaultValue: `${s.title} voice` });
    const name = value?.trim();
    if (!name) return;
    try {
      await createPersonaFromSong({ taskId: s.sunoJobId as string, name, songId: s.id, style: s.tagsString.trim() || undefined });
      Alert.alert("Persona created", `"${name}" is ready to use in Generate.`);
    } catch (e) {
      Alert.alert("Couldn't create persona", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[song-detail] create persona failed", e);
    }
  }

  async function rename(s: SongDetail) {
    const value = await prompt({ title: "Rename song", defaultValue: s.title });
    const title = value?.trim();
    if (!title || title === s.title) return;
    try { await renameSong(s.id, title); setSong((prev) => (prev ? { ...prev, title } : prev)); }
    catch (e) { Alert.alert("Couldn't rename", "Please try again."); console.error("[song-detail] rename failed", e); }
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

  // Generate a music video, then poll until it's ready (the hero swaps to the video).
  async function generateVideo(s: SongDetail) {
    if (videoBusy) return;
    setVideoBusy(true);
    setVideoError(null);
    const token = ++videoPoll.current;
    try {
      const { taskId } = await exportMusicVideo(s.id);
      for (let i = 0; i < 36; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        if (videoPoll.current !== token) return; // superseded / left screen
        const st = await fetchMusicVideoStatus(s.id, taskId).catch(() => null);
        if (!st) continue;
        if (st.status === "SUCCESS" && st.videoUrl) {
          setSong((prev) => (prev ? { ...prev, videoUrl: st.videoUrl } : prev));
          setVideoBusy(false);
          return;
        }
        if (st.status.endsWith("FAILED") || st.status === "CALLBACK_EXCEPTION") {
          setVideoError(st.error ?? "Video generation failed.");
          setVideoBusy(false);
          return;
        }
      }
      setVideoError("Still generating, check back in a bit.");
      setVideoBusy(false);
    } catch (e) {
      setVideoError(e instanceof HttpError && e.message ? e.message : "Couldn't start video generation.");
      setVideoBusy(false);
      console.error("[song-detail] video gen failed", e);
    }
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

  const started = (what: string) => Alert.alert(`${what} started`, "The new version will appear under Versions when it's ready.");

  function studioActions(s: SongDetail) {
    const acts: { label: string; fn: () => void | Promise<void> }[] = [
      {
        label: "Separate vocals",
        fn: async () => {
          try { await separateVocals(s.id); started("Vocal separation"); }
          catch (e) { Alert.alert("Couldn't separate", e instanceof HttpError && e.message ? e.message : "Please try again."); console.error("[song-detail] separate vocals failed", e); }
        },
      },
      {
        label: "Add instrumental",
        fn: async () => {
          try { await addInstrumental(s.id); started("Instrumental"); }
          catch (e) { Alert.alert("Couldn't add instrumental", e instanceof HttpError && e.message ? e.message : "Please try again."); console.error("[song-detail] add instrumental failed", e); }
        },
      },
      {
        label: "Add vocals",
        fn: async () => {
          const value = await prompt({ title: "Add vocals", message: "Lyrics / what the vocals should sing" });
          const lyricsPrompt = value?.trim();
          if (!lyricsPrompt) return;
          try { await addVocals(s.id, lyricsPrompt); started("Vocals"); }
          catch (e) { Alert.alert("Couldn't add vocals", e instanceof HttpError && e.message ? e.message : "Please try again."); console.error("[song-detail] add vocals failed", e); }
        },
      },
      { label: "Replace a section", fn: () => router.push(`/replace-section/${s.id}` as Href) },
      {
        label: "Set cover art (URL)",
        fn: async () => {
          const value = await prompt({ title: "Set cover art", message: "Paste an image URL", defaultValue: s.artworkUrl ?? "" });
          const url = value?.trim();
          if (!url) return;
          try { await setCoverArt(s.id, url); setSong((prev) => (prev ? { ...prev, artworkUrl: url } : prev)); }
          catch (e) { Alert.alert("Couldn't set cover", e instanceof HttpError && e.message ? e.message : "Please try again."); console.error("[song-detail] cover art failed", e); }
        },
      },
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: "Studio", options: [...acts.map((a) => a.label), "Cancel"], cancelButtonIndex: acts.length },
      (i) => { if (i >= 0 && i < acts.length) void acts[i].fn(); },
    );
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

  // Labeled metadata — mirrors the web SongMetadataCard (Style is the Suno
  // "style" prompt = tagsString; it was previously not shown at all).
  const createdLabel = fmtDate(song.createdAt);
  const metaFields: { label: string; value: string }[] = [
    song.tagsString.trim() ? { label: "Style", value: song.tagsString.trim() } : null,
    song.model ? { label: "Model", value: song.model } : null,
    song.durationSeconds ? { label: "Duration", value: formatDuration(song.durationSeconds) } : null,
    createdLabel ? { label: "Created", value: createdLabel } : null,
    song.isInstrumental ? { label: "Type", value: "Instrumental" } : null,
    song.sunoJobId ? { label: "Suno ID", value: song.sunoJobId } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);
  const lyricsText = lyrics.map((l) => l.text).join("\n").trim();

  async function play() {
    const s = song && detailToSong(song);
    if (!s) return;
    try {
      await playQueue([s], 0);
      router.navigate("/player");
    } catch (e) {
      console.error("[song-detail] play failed", e);
    }
  }

  const favCount = song.favoriteCount + (favorite && !song.isFavorite ? 1 : 0);
  const secondary: { key: string; label: string; Icon: LucideIcon; onPress: () => void }[] = [
    { key: "extend", label: "Extend", Icon: Sparkles, onPress: () => router.push(`/generate?parentSongId=${song.id}`) },
    { key: "playlist", label: "Add to playlist", Icon: ListPlus, onPress: () => router.push(`/add-to-playlist?songId=${song.id}&title=${encodeURIComponent(song.title)}` as Href) },
    { key: "versions", label: "Versions", Icon: GitBranch, onPress: () => router.push(`/song-versions/${song.id}` as Href) },
    { key: "stems", label: "Stems", Icon: Layers, onPress: () => router.push(`/stems/${song.id}` as Href) },
    { key: "download", label: "Download", Icon: Download, onPress: () => downloadExport(song) },
    { key: "studio", label: "Studio", Icon: Wand2, onPress: () => studioActions(song) },
    { key: "related", label: "Related", Icon: Disc3, onPress: () => router.push(`/related/${song.id}`) },
    { key: "analytics", label: "Analytics", Icon: BarChart2, onPress: () => router.push(`/song-analytics/${song.id}` as Href) },
    { key: "tags", label: "Edit tags", Icon: TagIcon, onPress: () => router.push(`/song-tags/${song.id}` as Href) },
    { key: "more", label: "More", Icon: MoreHorizontal, onPress: () => moreActions(song) },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: song.title }} />

      {/* Hero — music video plays in place of the cover when one exists */}
      <View style={styles.hero}>
        {song.videoUrl ? (
          <VideoCover uri={song.videoUrl} style={styles.art} />
        ) : song.artworkUrl ? (
          <Image source={{ uri: song.artworkUrl }} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.artPlaceholder]}>
            <Disc3 color={colors.textFaint} size={56} />
          </View>
        )}
        <Text style={styles.title}>{song.title}</Text>
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

      {/* Variation of … */}
      {song.parentSongId ? (
        <Pressable style={styles.variationLink} onPress={() => router.push(`/song/${song.parentSongId}` as Href)}>
          <GitBranch color={colors.accent} size={16} />
          <Text style={styles.variationText}>Variation: view the original</Text>
        </Pressable>
      ) : null}

      {/* Metadata (Style / Model / Duration / Created / …) */}
      {metaFields.length > 0 ? (
        <View style={[styles.card, styles.metaGrid]}>
          {metaFields.map((f) => (
            <View key={f.label} style={f.label === "Suno ID" ? styles.metaItemFull : styles.metaItem}>
              <Text style={styles.metaLabel}>{f.label}</Text>
              <Text style={styles.metaValue}>{f.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Rating + quick thumbs feedback */}
      <View style={styles.ratingRow}>
        <Text style={styles.ratingLabel}>Your rating</Text>
        <RatingStars songId={song.id} size={24} />
      </View>
      <View style={styles.thumbsRow}>
        <Text style={styles.ratingLabel}>How did this turn out?</Text>
        <View style={styles.thumbsBtns}>
          <Pressable
            style={[styles.thumbBtn, thumbs === "thumbs_up" && styles.thumbActive]}
            onPress={() => void onThumbs("thumbs_up")}
            hitSlop={6}
            accessibilityLabel="Thumbs up"
          >
            <ThumbsUp color={thumbs === "thumbs_up" ? colors.onAccent : colors.text} size={18} />
          </Pressable>
          <Pressable
            style={[styles.thumbBtn, thumbs === "thumbs_down" && styles.thumbActiveDown]}
            onPress={() => void onThumbs("thumbs_down")}
            hitSlop={6}
            accessibilityLabel="Thumbs down"
          >
            <ThumbsDown color={thumbs === "thumbs_down" ? colors.onAccent : colors.text} size={18} />
          </Pressable>
        </View>
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

      {/* Music video — generate / regenerate (the hero swaps to the video when ready) */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Music video</Text>
          {song.videoUrl && !videoBusy ? <Text style={styles.cardEmpty}>Ready</Text> : null}
        </View>
        {videoBusy ? (
          <View style={styles.videoBusy}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.body}>Generating your music video... this can take a minute.</Text>
          </View>
        ) : (
          <>
            {videoError ? <Text style={styles.videoError}>{videoError}</Text> : null}
            <Pressable style={styles.videoBtn} onPress={() => void generateVideo(song)}>
              <Film color={colors.onAccent} size={18} />
              <Text style={styles.videoBtnText}>{song.videoUrl ? "Regenerate video" : "Generate music video"}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Tags (tap to edit) */}
      <Pressable style={styles.card} onPress={() => router.push(`/song-tags/${song.id}` as Href)}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>Tags</Text>
          <Text style={styles.editLink}>Edit</Text>
        </View>
        {customTags.length > 0 ? (
          <View style={styles.tags}>
            {customTags.map((t) => (
              <View key={t.id} style={styles.tag}><Text style={styles.tagText}>{t.name}</Text></View>
            ))}
          </View>
        ) : (
          <Text style={styles.cardEmpty}>No tags, tap to add.</Text>
        )}
      </Pressable>

      {song.prompt ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prompt</Text>
          <Text style={styles.contentBody}>{song.prompt}</Text>
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
          <Text style={styles.contentBody}>{lyricsText}</Text>
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
                  router.navigate("/player");
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
    art: { width: 220, height: 220, borderRadius: 18, marginBottom: 16 },
    artPlaceholder: { backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" },
    title: { color: c.text, fontSize: 22, fontWeight: "800", textAlign: "center", lineHeight: 28 },
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

    thumbsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
    thumbsBtns: { flexDirection: "row", gap: 10 },
    thumbBtn: { width: 44, height: 38, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceAlt, borderRadius: 10 },
    thumbActive: { backgroundColor: c.accentStrong },
    thumbActiveDown: { backgroundColor: c.danger },

    variationLink: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
    variationText: { color: c.accent, fontSize: 14, fontWeight: "600" },

    metaGrid: { flexDirection: "row", flexWrap: "wrap" },
    metaItem: { width: "50%", paddingVertical: 6, paddingRight: 8 },
    metaItemFull: { width: "100%", paddingVertical: 6 },
    metaLabel: { color: c.textFaint, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
    metaValue: { color: c.text, fontSize: 14, fontFamily: fonts.mono },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
    gridItem: { flexBasis: "31%", flexGrow: 1, alignItems: "center", gap: 6, backgroundColor: c.surface, borderRadius: 14, paddingVertical: 14 },
    gridLabel: { color: c.text, fontSize: 12, fontWeight: "600" },

    card: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginTop: 16 },
    cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    cardTitle: { color: c.text, fontSize: 15, fontWeight: "700" },
    cardEmpty: { color: c.textFaint, fontSize: 13 },
    editLink: { color: c.accent, fontSize: 13, fontWeight: "600" },
    videoBusy: { flexDirection: "row", alignItems: "center", gap: 12 },
    videoError: { color: c.danger, fontSize: 13, marginBottom: 10 },
    videoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 12 },
    videoBtnText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },

    section: { marginTop: 24 },
    sectionTitle: { color: c.textDim, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: { backgroundColor: c.surfaceAlt, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    tagText: { color: c.textDim, fontSize: 13 },
    body: { color: c.textDim, fontSize: 14, lineHeight: 21 },
    contentBody: { color: c.textDim, fontSize: 14, lineHeight: 21, fontFamily: fonts.mono },
    dim: { color: c.textDim, fontSize: 14 },
  });
}
