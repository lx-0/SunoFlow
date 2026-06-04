import { useEffect, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, ActionSheetIOS } from "react-native";
import { router } from "expo-router";
import { formatDuration } from "@sunoflow/core";
import { usePlayback } from "@/playback/usePlayback";
import { togglePlay, skipToNext, skipToPrevious, seekTo, toggleShuffle, toggleRepeat } from "@/playback/audio";
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon, ShuffleIcon, HeartIcon, RepeatIcon, MoreIcon } from "@/components/Icons";
import { ReactionPicker } from "@/components/ReactionPicker";
import { RatingStars } from "@/components/RatingStars";
import { Waveform } from "@/components/Waveform";
import { useTimedPopups } from "@/hooks/useTimedPopups";
import { getFavorite, setFavorite as setFavoriteApi } from "@/api/favorites";
import { fetchReactions, addReaction, type Reaction } from "@/api/reactions";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Now-Playing screen — mirrors the web ExpandedPlayer: cover, title, a seek bar
// with timecoded emoji-reaction markers, a quick-react row, transport controls,
// and an overflow (kebab) menu for the secondary actions.
export default function PlayerScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { current, playing, positionSeconds, durationSeconds, shuffle, repeat } = usePlayback();
  const [favorite, setFavorite] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const songId = current?.id;

  // Transient emoji popups that float up as playback crosses each reaction's time.
  const { activePopups } = useTimedPopups({
    items: reactions,
    currentTime: positionSeconds,
    duration: durationSeconds,
    isPlaying: playing,
    displayDurationMs: 2000,
    makePopup: (r, key, leftPct) => ({ key, emoji: r.emoji, leftPct }),
  });

  // Favorite + reaction state load whenever the song changes.
  useEffect(() => {
    setFavorite(false);
    setReactions([]);
    if (!songId) return;
    let cancelled = false;
    getFavorite(songId).then((f) => !cancelled && setFavorite(f)).catch(() => {});
    fetchReactions(songId).then((r) => !cancelled && setReactions(r)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [songId]);

  async function onToggleFavorite() {
    if (!songId) return;
    const next = !favorite;
    setFavorite(next);
    try {
      await setFavoriteApi(songId, next);
    } catch {
      setFavorite(!next);
    }
  }

  async function onReact(emoji: string) {
    if (!songId) return;
    const at = positionSeconds;
    // optimistic marker; reconcile with the server id on success
    const optimistic: Reaction = { id: `tmp:${emoji}:${at}`, emoji, timestamp: at };
    setReactions((prev) => [...prev, optimistic]);
    try {
      const created = await addReaction(songId, emoji, at);
      if (created) {
        setReactions((prev) => prev.map((r) => (r.id === optimistic.id ? created : r)));
      }
    } catch (e) {
      setReactions((prev) => prev.filter((r) => r.id !== optimistic.id));
      console.error("[player] react failed", e);
    }
  }

  function openMenu() {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Lyrics", "Add to Playlist", "Up Next", "Comments", "Related", "Song Details", "Extend", "Cancel"],
        cancelButtonIndex: 7,
        userInterfaceStyle: "dark",
      },
      (i) => {
        if (i === 0) router.push("/lyrics");
        else if (i === 1) router.push("/add-to-playlist");
        else if (i === 2) router.push("/queue");
        else if (i === 3 && songId) router.push(`/comments/${songId}`);
        else if (i === 4 && songId) router.push(`/related/${songId}`);
        else if (i === 5 && songId) router.push(`/song/${songId}`);
        else if (i === 6 && songId) router.push(`/generate?parentSongId=${songId}`);
      },
    );
  }

  return (
    <View style={styles.container}>
      {/* Header actions (right-aligned), like the web overflow menu placement */}
      <View style={styles.header}>
        <Pressable hitSlop={10} style={styles.headerBtn} onPress={onToggleFavorite}>
          <HeartIcon color={favorite ? colors.danger : colors.textDim} filled={favorite} size={24} />
        </Pressable>
        <Pressable hitSlop={10} style={styles.headerBtn} onPress={openMenu}>
          <MoreIcon color={colors.textDim} size={24} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {current?.artworkUrl ? (
          <Image source={{ uri: current.artworkUrl }} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.artPlaceholder]} />
        )}

        <Text style={styles.title} numberOfLines={1}>{current?.title ?? "Nothing playing"}</Text>
        <Text style={styles.artist} numberOfLines={1}>{current?.artist ?? ""}</Text>

        {/* Real waveform + timecoded reaction popups */}
        <Waveform
          songId={songId}
          streamUrl={current?.streamUrl}
          positionSeconds={positionSeconds}
          durationSeconds={durationSeconds}
          onSeek={seekTo}
          popups={activePopups}
        />
        <View style={styles.times}>
          <Text style={styles.time}>{formatDuration(positionSeconds)}</Text>
          <Text style={styles.time}>{formatDuration(durationSeconds)}</Text>
        </View>

        {/* Rating stars + emoji reaction popover share one row to save space */}
        <View style={styles.emojiRow}>
          {songId ? <RatingStars songId={songId} size={20} /> : null}
          <ReactionPicker onReact={(e) => void onReact(e)} reactionEmojis={reactions.map((r) => r.emoji)} />
        </View>

        {/* Main transport */}
        <View style={styles.row}>
          <Pressable hitSlop={10} style={styles.btnSmall} onPress={toggleShuffle}>
            <ShuffleIcon color={shuffle ? colors.accent : colors.textFaint} size={22} />
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
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, gap: 8 },
    headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
    art: { width: 280, height: 280, borderRadius: 16, marginBottom: 28 },
    artPlaceholder: { backgroundColor: c.surfaceAlt },
    title: { color: c.text, fontSize: 22, fontWeight: "700", textAlign: "center", alignSelf: "stretch" },
    artist: { color: c.textDim, fontSize: 16, marginTop: 4, textAlign: "center" },
    times: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
    time: { color: c.textDim, fontSize: 12, fontVariant: ["tabular-nums"] },
    emojiRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 14 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22, marginTop: 24 },
    btnSmall: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    btn: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
    btnPlay: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.accentStrong },
  });
}
