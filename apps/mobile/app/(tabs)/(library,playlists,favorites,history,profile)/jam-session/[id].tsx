import { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Share,
  Alert,
} from "react-native";
import { Text } from "@/components/Themed";
import { Stack, useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Loader2, Music, Play, Share2, Tv, X } from "lucide-react-native";
import { JamPartyDisplay } from "@/components/JamPartyDisplay";
import { playQueue } from "@/playback/controls";
import { fetchPlaylistSongs } from "@/api/playlists";
import { openPlayer } from "@/navigation";
import { HttpError } from "@/api/client";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii, spacing } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";
import {
  closeJamSession,
  fetchJamSessionDetail,
  fetchJamState,
  jamJoinUrl,
  vetoJamEntry,
  type JamSessionSummary,
  type JamState,
} from "@/api/jam";

const POLL_INTERVAL_MS = 5000;

// Native host console for a jam session: QR + share sheet, live queue,
// veto on pending requests, end session. Mirrors the web /party/[id] view.
export default function JamSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [detail, setDetail] = useState<JamSessionSummary | null>(null);
  const [state, setState] = useState<JamState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vetoingId, setVetoingId] = useState<string | null>(null);
  const [showDisplay, setShowDisplay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchJamSessionDetail(id)
      .then((s) => {
        if (!cancelled) setDetail(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof HttpError ? e.message : "Couldn't load the session");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const shareToken = detail?.shareToken ?? null;

  const refresh = useCallback(async () => {
    if (!shareToken) return;
    try {
      const s = await fetchJamState(shareToken);
      if (s) setState(s);
      setError(null);
    } catch {
      // transient poll failure — keep the last state visible
    }
  }, [shareToken]);

  useEffect(() => {
    if (!shareToken) return;
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [shareToken, refresh]);

  const meta = state?.session;
  const isClosed = meta?.status === "closed";
  const budgetLeft = meta ? meta.budgetTotal - meta.budgetUsed : null;
  const joinUrl = detail ? jamJoinUrl(detail.shareToken) : null;

  const [startingPlayback, setStartingPlayback] = useState(false);

  async function handlePlaySession() {
    if (!detail || startingPlayback) return;
    setStartingPlayback(true);
    try {
      const songs = await fetchPlaylistSongs(detail.playlistId);
      if (songs.length === 0) {
        setError("No finished songs in this session yet");
        return;
      }
      await playQueue(songs, 0);
      openPlayer();
    } catch (e) {
      setError(e instanceof HttpError ? e.message : "Couldn't start playback");
    } finally {
      setStartingPlayback(false);
    }
  }

  async function handleShare() {
    if (!joinUrl) return;
    try {
      await Share.share({ message: joinUrl, url: joinUrl });
    } catch {
      // user dismissed the sheet — nothing to do
    }
  }

  function confirmClose() {
    Alert.alert("End the session?", "Guests can no longer push requests.", [
      { text: "Keep going", style: "cancel" },
      {
        text: "End session",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await closeJamSession(id);
              await refresh();
            } catch (e) {
              setError(e instanceof HttpError ? e.message : "Couldn't end the session");
            }
          })();
        },
      },
    ]);
  }

  async function handleVeto(entryId: string) {
    setVetoingId(entryId);
    try {
      await vetoJamEntry(id, entryId);
      await refresh();
    } catch (e) {
      setError(e instanceof HttpError ? e.message : "Couldn't remove the request");
    } finally {
      setVetoingId(null);
    }
  }

  if (!detail) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: "Jam Session" }} />
        {error ? (
          <EmptyState Icon={X} title={error} tone="error" />
        ) : (
          <ActivityIndicator color={colors.textDim} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: meta?.name ?? detail.name }} />
      <FlatList
        data={state?.entries ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>
                {isClosed ? "Session ended" : "Live jam session"}
              </Text>
              {budgetLeft !== null && !isClosed && (
                <Text style={styles.budget}>
                  {budgetLeft} <Text style={styles.budgetLabel}>songs left</Text>
                </Text>
              )}
            </View>

            {/* Join QR + share */}
            <View style={styles.qrCard}>
              <View style={styles.qrWrap}>
                {joinUrl && <QRCode value={joinUrl} size={180} />}
              </View>
              <Text style={styles.joinUrl} numberOfLines={1}>
                {joinUrl}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.shareBtn, styles.actionFlex]}
                  onPress={() => setShowDisplay(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Open party display"
                >
                  <Tv size={16} color="#fff" />
                  <Text style={styles.shareBtnText}>Party display</Text>
                </Pressable>
                <Pressable
                  style={[styles.shareBtnAlt, styles.actionFlex]}
                  onPress={handleShare}
                  accessibilityRole="button"
                  accessibilityLabel="Share join link"
                >
                  <Share2 size={16} color={colors.text} />
                  <Text style={styles.shareBtnAltText}>Share link</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.playBtn, startingPlayback && styles.disabled]}
              onPress={handlePlaySession}
              disabled={startingPlayback}
              accessibilityRole="button"
              accessibilityLabel="Play session"
            >
              {startingPlayback ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Play size={16} color="#fff" fill="#fff" />
              )}
              <Text style={styles.playBtnText}>Play session</Text>
            </Pressable>

            {!isClosed && (
              <Pressable
                style={styles.closeBtn}
                onPress={confirmClose}
                accessibilityRole="button"
              >
                <Text style={styles.closeBtnText}>End session</Text>
              </Pressable>
            )}

            {error && (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            )}

            <Text style={styles.sectionTitle}>
              Requests{state ? ` (${state.entries.length})` : ""}
            </Text>
          </View>
        }
        ListEmptyComponent={
          state === null ? (
            <ActivityIndicator style={styles.loading} color={colors.textDim} />
          ) : (
            <EmptyState
              Icon={Music}
              title="No requests yet — put the QR where the party can see it."
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.entryCard}>
            <View style={styles.entryIcon}>
              {item.status === "pending" ? (
                <Loader2 size={16} color={colors.accent} />
              ) : (
                <Music size={16} color={colors.textDim} />
              )}
            </View>
            <View style={styles.entryText}>
              <Text style={styles.entryTitle} numberOfLines={1}>
                {item.song?.title ?? item.promptText}
              </Text>
              <Text style={styles.entrySub} numberOfLines={1}>
                {item.guestName ?? "Guest"}
                {item.status === "pending" && " · generating…"}
                {item.status === "failed" && " · failed"}
                {item.status === "ready" && " · ready"}
              </Text>
            </View>
            {item.status === "pending" && !isClosed && (
              <Pressable
                style={styles.vetoBtn}
                onPress={() => handleVeto(item.id)}
                disabled={vetoingId === item.id}
                accessibilityRole="button"
                accessibilityLabel="Remove request"
              >
                <X size={16} color={colors.textDim} />
              </Pressable>
            )}
          </View>
        )}
      />
      {joinUrl && detail && (
        <JamPartyDisplay
          visible={showDisplay}
          joinUrl={joinUrl}
          slug={detail.shareToken}
          state={state}
          onClose={() => setShowDisplay(false)}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { alignItems: "center", justifyContent: "center" },
    content: { padding: spacing.md, paddingBottom: MINIPLAYER_CLEARANCE, gap: spacing.sm },
    header: { gap: spacing.sm, marginBottom: spacing.xs },
    statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    statusText: { color: c.textDim, fontSize: 13 },
    budget: { color: c.accent, fontFamily: fonts.sansSemibold, fontSize: 20 },
    budgetLabel: { color: c.textDim, fontSize: 12, fontFamily: fonts.sans },
    qrCard: {
      backgroundColor: c.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
      alignItems: "center",
      gap: spacing.sm,
    },
    qrWrap: { backgroundColor: "#fff", borderRadius: radii.lg, padding: spacing.sm },
    joinUrl: { color: c.accent, fontSize: 12, fontFamily: fonts.mono },
    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: c.accent,
      borderRadius: radii.lg,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
    },
    shareBtnText: { color: "#fff", fontFamily: fonts.sansSemibold, fontSize: 14 },
    actionRow: { flexDirection: "row", gap: spacing.sm, alignSelf: "stretch" },
    actionFlex: { flex: 1, justifyContent: "center" },
    shareBtnAlt: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: c.surfaceAlt,
      borderRadius: radii.lg,
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
    },
    shareBtnAltText: { color: c.text, fontFamily: fonts.sansSemibold, fontSize: 14 },
    playBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      backgroundColor: c.accent,
      borderRadius: radii.lg,
      paddingVertical: 12,
    },
    playBtnText: { color: "#fff", fontFamily: fonts.sansSemibold, fontSize: 15 },
    disabled: { opacity: 0.6 },
    closeBtn: {
      alignItems: "center",
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingVertical: 10,
    },
    closeBtnText: { color: c.textDim, fontSize: 14 },
    error: { color: c.danger, fontSize: 13 },
    sectionTitle: { color: c.text, fontFamily: fonts.sansSemibold, fontSize: 14, marginTop: spacing.xs },
    loading: { marginTop: spacing.xl },
    entryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radii.xl,
      padding: spacing.md,
    },
    entryIcon: {
      width: 36,
      height: 36,
      borderRadius: radii.lg,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    entryText: { flex: 1, minWidth: 0 },
    entryTitle: { color: c.text, fontFamily: fonts.sansSemibold, fontSize: 14 },
    entrySub: { color: c.textDim, fontSize: 12, marginTop: 2 },
    vetoBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.full,
    },
  });
}
