import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ActionSheetIOS,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import { router } from "expo-router";
import { formatDuration } from "@sunoflow/core";
import { usePlayback } from "@/playback/usePlayback";
import { togglePlay, skipToNext, skipToPrevious, seekTo, toggleShuffle, toggleRepeat } from "@/playback/audio";
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon, ShuffleIcon, HeartIcon, RepeatIcon, MoreIcon } from "@/components/Icons";
import { ReactionPicker } from "@/components/ReactionPicker";
import { getFavorite, setFavorite as setFavoriteApi } from "@/api/favorites";
import { fetchReactions, addReaction, type Reaction } from "@/api/reactions";

const ACCENT = "#8b7cff";
const PLAY_BG = "#7c3aed"; // violet-600, matches the web player

// Now-Playing screen — mirrors the web ExpandedPlayer: cover, title, a seek bar
// with timecoded emoji-reaction markers, a quick-react row, transport controls,
// and an overflow (kebab) menu for the secondary actions.
export default function PlayerScreen() {
  const { current, playing, positionSeconds, durationSeconds, shuffle, repeat } = usePlayback();
  const [barWidth, setBarWidth] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const songId = current?.id;

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
      { options: ["Lyrics", "Add to Playlist", "Up Next", "Cancel"], cancelButtonIndex: 3, userInterfaceStyle: "dark" },
      (i) => {
        if (i === 0) router.push("/lyrics");
        else if (i === 1) router.push("/add-to-playlist");
        else if (i === 2) router.push("/queue");
      },
    );
  }

  const pct = durationSeconds > 0 ? Math.min(1, positionSeconds / durationSeconds) : 0;

  function onSeek(e: GestureResponderEvent) {
    if (barWidth <= 0 || durationSeconds <= 0) return;
    const frac = Math.max(0, Math.min(1, e.nativeEvent.locationX / barWidth));
    seekTo(frac * durationSeconds);
  }

  return (
    <View style={styles.container}>
      {/* Header actions (right-aligned), like the web overflow menu placement */}
      <View style={styles.header}>
        <Pressable hitSlop={10} style={styles.headerBtn} onPress={onToggleFavorite}>
          <HeartIcon color={favorite ? "#ff4d6d" : "#9a9aa2"} filled={favorite} size={24} />
        </Pressable>
        <Pressable hitSlop={10} style={styles.headerBtn} onPress={openMenu}>
          <MoreIcon color="#9a9aa2" size={24} />
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

        {/* Timecoded reaction markers above the seek bar */}
        <View style={styles.reactionLane}>
          {durationSeconds > 0 && barWidth > 0
            ? reactions.map((r) => (
                <Pressable
                  key={r.id}
                  hitSlop={6}
                  style={[styles.marker, { left: Math.min(1, r.timestamp / durationSeconds) * barWidth - 9 }]}
                  onPress={() => seekTo(r.timestamp)}
                >
                  <Text style={styles.markerEmoji}>{r.emoji}</Text>
                </Pressable>
              ))
            : null}
        </View>

        <Pressable
          style={styles.barWrap}
          onPress={onSeek}
          onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
          </View>
        </Pressable>
        <View style={styles.times}>
          <Text style={styles.time}>{formatDuration(positionSeconds)}</Text>
          <Text style={styles.time}>{formatDuration(durationSeconds)}</Text>
        </View>

        {/* Emoji reactions behind a popover (drops one at the current timestamp) */}
        <View style={styles.emojiRow}>
          <ReactionPicker onReact={(e) => void onReact(e)} reactionEmojis={reactions.map((r) => r.emoji)} />
        </View>

        {/* Main transport */}
        <View style={styles.row}>
          <Pressable hitSlop={10} style={styles.btnSmall} onPress={toggleShuffle}>
            <ShuffleIcon color={shuffle ? ACCENT : "#5a5a62"} size={22} />
          </Pressable>
          <Pressable hitSlop={12} style={styles.btn} onPress={() => skipToPrevious()}>
            <SkipPrevIcon color="#fff" size={28} />
          </Pressable>
          <Pressable hitSlop={12} style={[styles.btn, styles.btnPlay]} onPress={togglePlay}>
            {playing ? <PauseIcon color="#fff" size={24} /> : <PlayIcon color="#fff" size={24} />}
          </Pressable>
          <Pressable hitSlop={12} style={styles.btn} onPress={() => skipToNext()}>
            <SkipNextIcon color="#fff" size={28} />
          </Pressable>
          <Pressable hitSlop={10} style={styles.btnSmall} onPress={toggleRepeat}>
            <RepeatIcon color={repeat !== "off" ? ACCENT : "#5a5a62"} one={repeat === "one"} size={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  header: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  art: { width: 280, height: 280, borderRadius: 16, marginBottom: 28 },
  artPlaceholder: { backgroundColor: "#1c1c22" },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center", alignSelf: "stretch" },
  artist: { color: "#9a9aa2", fontSize: 16, marginTop: 4, textAlign: "center" },
  reactionLane: { alignSelf: "stretch", height: 22, marginTop: 24 },
  marker: { position: "absolute", bottom: 0, width: 18, alignItems: "center" },
  markerEmoji: { fontSize: 14 },
  barWrap: { alignSelf: "stretch", paddingVertical: 12 },
  barBg: { height: 4, borderRadius: 2, backgroundColor: "#2a2a32", overflow: "hidden" },
  barFill: { height: 4, backgroundColor: "#fff" },
  times: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between", marginTop: -4 },
  time: { color: "#9a9aa2", fontSize: 12, fontVariant: ["tabular-nums"] },
  emojiRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22, marginTop: 24 },
  btnSmall: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  btn: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  btnPlay: { width: 72, height: 72, borderRadius: 36, backgroundColor: PLAY_BG },
});
