import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, Modal, StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { formatDuration } from "@sunoflow/core";
import { usePlayback } from "@/playback/usePlayback";
import {
  togglePlay, skipToNext, skipToPrevious, seekTo, toggleShuffle, toggleRepeat,
  toggleShuffleVersions,
} from "@/playback/audio";
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon, ShuffleIcon, HeartIcon, RepeatIcon, MoreIcon } from "@/components/Icons";
import {
  ChevronDown, Disc3, Boxes, Info, FileText, GitBranch, ListPlus,
  ListMusic, MessageCircle, Sparkles, type LucideIcon,
} from "lucide-react-native";
import { ReactionPicker } from "@/components/ReactionPicker";
import { RatingButton } from "@/components/RatingButton";
import { Waveform } from "@/components/Waveform";
import { useTimedPopups } from "@/hooks/useTimedPopups";
import { getFavorite, setFavorite as setFavoriteApi } from "@/api/favorites";
import { fetchReactions, addReaction, type Reaction } from "@/api/reactions";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Now-Playing screen — cover, seek bar with timecoded reactions, rating/reactions,
// transport (incl. shuffle-versions + mute), and a themed bottom-sheet menu.
export default function PlayerScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { current, playing, positionSeconds, durationSeconds, shuffle, repeat, shuffleVersions, currentIsAlternate, index, queueLength } = usePlayback();
  const [favorite, setFavorite] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const songId = current?.id;

  const { activePopups } = useTimedPopups({
    items: reactions,
    currentTime: positionSeconds,
    duration: durationSeconds,
    isPlaying: playing,
    displayDurationMs: 2000,
    makePopup: (r, key, leftPct) => ({ key, emoji: r.emoji, leftPct }),
  });

  useEffect(() => {
    setFavorite(false);
    setReactions([]);
    if (!songId) return;
    let cancelled = false;
    getFavorite(songId).then((f) => !cancelled && setFavorite(f)).catch(() => {});
    fetchReactions(songId).then((r) => !cancelled && setReactions(r)).catch(() => {});
    return () => { cancelled = true; };
  }, [songId]);

  async function onToggleFavorite() {
    if (!songId) return;
    const next = !favorite;
    setFavorite(next);
    try { await setFavoriteApi(songId, next); } catch { setFavorite(!next); }
  }

  async function onReact(emoji: string) {
    if (!songId) return;
    const at = positionSeconds;
    const optimistic: Reaction = { id: `tmp:${emoji}:${at}`, emoji, timestamp: at };
    setReactions((prev) => [...prev, optimistic]);
    try {
      const created = await addReaction(songId, emoji, at);
      if (created) setReactions((prev) => prev.map((r) => (r.id === optimistic.id ? created : r)));
    } catch (e) {
      setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
      console.error("[player] react failed", e);
    }
  }

  const menu: { label: string; Icon: LucideIcon; go: () => void }[] = [
    { label: "Lyrics", Icon: FileText, go: () => router.push("/lyrics") },
    { label: "Versions", Icon: GitBranch, go: () => songId && router.push(`/song-versions/${songId}` as Href) },
    { label: "Add to playlist", Icon: ListPlus, go: () => router.push("/add-to-playlist") },
    { label: "Up next (queue)", Icon: ListMusic, go: () => router.push("/queue") },
    { label: "Comments", Icon: MessageCircle, go: () => songId && router.push(`/comments/${songId}`) },
    { label: "Related songs", Icon: Disc3, go: () => songId && router.push(`/related/${songId}`) },
    { label: "Song details", Icon: Info, go: () => songId && router.push(`/song/${songId}`) },
    { label: "Extend this song", Icon: Sparkles, go: () => songId && router.push(`/generate?parentSongId=${songId}`) },
  ];

  function runMenu(go: () => void) {
    setMenuOpen(false);
    go();
  }

  // Combined shuffle control: cycles off → shuffle → shuffle+versions → off.
  function cycleShuffle() {
    if (shuffleVersions) {
      if (shuffle) toggleShuffle();
      toggleShuffleVersions();
    } else if (shuffle) {
      toggleShuffleVersions();
    } else {
      toggleShuffle();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable hitSlop={10} style={styles.headerBtn} onPress={() => router.back()}>
          <ChevronDown color={colors.text} size={26} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Pressable style={styles.artWrap} disabled={!songId} onPress={() => songId && router.push(`/song/${songId}`)}>
          {current?.artworkUrl ? (
            <Image source={{ uri: current.artworkUrl }} style={styles.art} />
          ) : (
            <View style={[styles.art, styles.artPlaceholder]}><Disc3 color={colors.textFaint} size={72} /></View>
          )}
        </Pressable>

        <View style={styles.titleWrap}>
          <View style={styles.titleRow}>
            <Pressable style={styles.titleTap} disabled={!songId} onPress={() => songId && router.push(`/song/${songId}`)}>
              <Text style={styles.title} numberOfLines={1}>{current?.title ?? "Nothing playing"}</Text>
            </Pressable>
            {currentIsAlternate ? (
              <View style={styles.altBadge} accessibilityLabel="Alternate version">
                <GitBranch color={colors.accent} size={14} />
              </View>
            ) : null}
            <Pressable hitSlop={10} style={styles.titleMore} onPress={() => setMenuOpen(true)} accessibilityLabel="More options">
              <MoreIcon color={colors.textDim} size={22} />
            </Pressable>
          </View>
          <Text style={styles.artist} numberOfLines={1}>
            {[current?.artist, queueLength > 1 ? `${index + 1} of ${queueLength}` : null].filter(Boolean).join("  ·  ")}
          </Text>
        </View>

        <Waveform
          songId={songId}
          streamUrl={current?.streamUrl}
          positionSeconds={positionSeconds}
          durationSeconds={durationSeconds}
          onSeek={seekTo}
          popups={activePopups}
          reactionTimes={reactions.map((r) => r.timestamp)}
        />
        <View style={styles.times}>
          <Text style={styles.time}>{formatDuration(positionSeconds)}</Text>
          <Text style={styles.time}>{formatDuration(durationSeconds)}</Text>
        </View>

        {/* Rating (context menu) + reactions + shuffle-versions + details — one row */}
        <View style={styles.emojiRow}>
          <Pressable style={styles.secBtn} hitSlop={8} onPress={onToggleFavorite} accessibilityLabel={favorite ? "Unfavorite" : "Favorite"}>
            <HeartIcon color={favorite ? colors.danger : colors.textDim} filled={favorite} size={20} />
          </Pressable>
          {songId ? <RatingButton songId={songId} /> : null}
          <ReactionPicker onReact={(e) => void onReact(e)} reactionEmojis={reactions.map((r) => r.emoji)} />
        </View>

        {/* Main transport */}
        <View style={styles.row}>
          {/* One combined shuffle button: off → shuffle → shuffle + versions → off.
              In versions mode the shuffle icon gets a tiny Boxes badge. */}
          <Pressable hitSlop={10} style={styles.btnSmall} onPress={cycleShuffle} accessibilityLabel="Shuffle mode">
            <View>
              <ShuffleIcon color={shuffle ? colors.accent : colors.textFaint} size={22} />
              {shuffleVersions ? (
                <View style={styles.shuffleBadge}>
                  <Boxes color={colors.onAccent} size={9} />
                </View>
              ) : null}
            </View>
          </Pressable>
          <Pressable hitSlop={12} style={styles.btn} onPress={() => skipToPrevious()}>
            <SkipPrevIcon color={colors.text} size={28} />
          </Pressable>
          <Pressable hitSlop={12} style={[styles.btn, styles.btnPlay]} onPress={togglePlay}>
            {playing ? <PauseIcon color={colors.onAccent} size={24} /> : <PlayIcon color={colors.onAccent} size={24} />}
          </Pressable>
          <Pressable hitSlop={12} style={styles.btn} onPress={() => skipToNext()}>
            <SkipNextIcon color={colors.text} size={28} />
          </Pressable>
          <Pressable hitSlop={10} style={styles.btnSmall} onPress={toggleRepeat}>
            <RepeatIcon color={repeat !== "off" ? colors.accent : colors.textFaint} one={repeat === "one"} size={22} />
          </Pressable>
        </View>

      </View>

      {/* Themed bottom-sheet menu (replaces the iOS action sheet) */}
      <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          {current?.title ? <Text style={styles.sheetTitle} numberOfLines={1}>{current.title}</Text> : null}
          {menu.map((m) => (
            <Pressable key={m.label} style={styles.menuRow} onPress={() => runMenu(m.go)}>
              <m.Icon color={colors.accent} size={20} />
              <Text style={styles.menuLabel}>{m.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancelRow} onPress={() => setMenuOpen(false)}>
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8 },
    headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
    artWrap: { marginBottom: 28, borderRadius: 20, shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
    art: { width: 300, height: 300, borderRadius: 20 },
    artPlaceholder: { backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" },
    titleWrap: { alignSelf: "stretch" },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    titleTap: { flexShrink: 1 },
    title: { color: c.text, fontSize: 23, fontWeight: "800", textAlign: "center" },
    titleMore: { padding: 2 },
    altBadge: { backgroundColor: c.surfaceAlt, borderRadius: 999, padding: 5 },
    artist: { color: c.textDim, fontSize: 15, marginTop: 4, textAlign: "center" },
    times: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
    time: { color: c.textDim, fontSize: 12, fontVariant: ["tabular-nums"] },
    emojiRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22, marginTop: 24 },
    btnSmall: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    shuffleBadge: { position: "absolute", right: -7, bottom: -5, backgroundColor: c.accent, borderRadius: 999, padding: 2 },
    btn: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
    btnPlay: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.accentStrong },
    secBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, borderRadius: 22 },
    // bottom-sheet menu
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    sheet: { backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 34 },
    grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: 8 },
    sheetTitle: { color: c.textDim, fontSize: 13, fontWeight: "600", paddingHorizontal: 14, paddingBottom: 8 },
    menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
    menuLabel: { color: c.text, fontSize: 16 },
    cancelRow: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
    cancelText: { color: c.textDim, fontSize: 16, fontWeight: "600" },
  });
}
