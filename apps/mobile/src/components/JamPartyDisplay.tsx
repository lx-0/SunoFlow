import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "@/components/Themed";
import QRCode from "react-native-qrcode-svg";
import { X } from "lucide-react-native";
import { useKeepAwake } from "expo-keep-awake";
import * as ScreenOrientation from "expo-screen-orientation";
import { useTheme } from "@/theme/ThemeContext";
import { fonts, radii, spacing } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";
import type { JamState } from "@/api/jam";

// Fullscreen party display: the phone stands on the table and IS the party
// screen. Landscape-first (QR panel left, big type right), keep-awake while
// visible, orientation unlocked only for this view (the app stays
// portrait-locked everywhere else). Big Geist Extrabold + Electric Magenta —
// readable from across the room.
export function JamPartyDisplay({
  visible,
  joinUrl,
  slug,
  state,
  onClose,
}: {
  visible: boolean;
  joinUrl: string;
  slug: string;
  state: JamState | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      supportedOrientations={["portrait", "landscape"]}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {visible && <PartyDisplayContent joinUrl={joinUrl} slug={slug} state={state} onClose={onClose} />}
    </Modal>
  );
}

function PartyDisplayContent({
  joinUrl,
  slug,
  state,
  onClose,
}: {
  joinUrl: string;
  slug: string;
  state: JamState | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const styles = makeStyles(colors);

  useKeepAwake();

  // Unlock rotation while the display is up; back to portrait on close.
  useEffect(() => {
    void ScreenOrientation.unlockAsync().catch(() => {});
    return () => {
      void ScreenOrientation
        .lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
        .catch(() => {});
    };
  }, []);

  // Soft pulse on the LIVE dot — plain RN Animated (Reanimated is unwired).
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const meta = state?.session;
  const isClosed = meta?.status === "closed";
  const budgetLeft = meta ? meta.budgetTotal - meta.budgetUsed : null;
  const nowPlaying = state?.nowPlaying ?? null;
  const pendingCount = state?.entries.filter((e) => e.status === "pending").length ?? 0;
  const latest = state ? [...state.entries].slice(-3).reverse() : [];

  const qrSize = Math.min(width, height) * (isLandscape ? 0.62 : 0.55);

  const qrPanel = (
    <View style={styles.qrPanel}>
      <View style={styles.qrCard}>
        <QRCode value={joinUrl} size={qrSize} />
      </View>
      <Text style={[styles.slug, { fontSize: isLandscape ? 22 : 18 }]} numberOfLines={1}>
        /jam/{slug}
      </Text>
    </View>
  );

  const infoPanel = (
    <View style={[styles.infoPanel, isLandscape && styles.infoPanelLandscape]}>
      <View style={styles.liveRow}>
        {!isClosed && <Animated.View style={[styles.liveDot, { opacity: pulse }]} />}
        <Text style={styles.liveLabel}>{isClosed ? "PARTY ENDED" : "LIVE"}</Text>
      </View>
      <Text
        style={[styles.title, { fontSize: isLandscape ? 44 : 34 }]}
        numberOfLines={2}
      >
        {meta?.name ?? "Jam Session"}
      </Text>
      <Text style={[styles.cta, { fontSize: isLandscape ? 22 : 18 }]}>
        Scan to request a song
      </Text>

      {budgetLeft !== null && !isClosed && (
        <View style={styles.budgetRow}>
          <Text style={[styles.budgetNumber, { fontSize: isLandscape ? 88 : 64 }]}>
            {budgetLeft}
          </Text>
          <Text style={styles.budgetLabel}>songs{"\n"}left</Text>
        </View>
      )}

      {nowPlaying && (
        <View style={styles.nowPlaying}>
          <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>
          <Text style={styles.nowPlayingTitle} numberOfLines={1}>
            {nowPlaying.song.title ?? "Untitled"}
          </Text>
        </View>
      )}

      {latest.length > 0 && (
        <View style={styles.latest}>
          {pendingCount > 0 && (
            <Text style={styles.latestHeader}>
              {pendingCount} brewing…
            </Text>
          )}
          {latest.map((e) => (
            <Text key={e.id} style={styles.latestRow} numberOfLines={1}>
              {e.guestName ?? "Guest"}: {e.song?.title ?? e.promptText}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Pressable
        style={styles.closeBtn}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close party display"
        hitSlop={12}
      >
        <X size={22} color={colors.textDim} />
      </Pressable>
      <View style={[styles.body, isLandscape ? styles.bodyLandscape : styles.bodyPortrait]}>
        {qrPanel}
        {infoPanel}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0b0709" },
    closeBtn: {
      position: "absolute",
      top: spacing.lg,
      right: spacing.lg,
      zIndex: 10,
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.full,
    },
    body: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
    bodyLandscape: { flexDirection: "row", paddingHorizontal: spacing.xl },
    bodyPortrait: { flexDirection: "column", paddingVertical: spacing.xl },
    qrPanel: { alignItems: "center", gap: spacing.sm },
    qrCard: {
      backgroundColor: "#fff",
      borderRadius: radii.xxl,
      padding: spacing.md,
    },
    slug: { color: c.accent, fontFamily: fonts.monoSemibold },
    infoPanel: { alignItems: "center", gap: spacing.sm, maxWidth: 460 },
    infoPanelLandscape: { flex: 1, alignItems: "flex-start" },
    liveRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    liveDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: c.accent },
    liveLabel: {
      color: c.accent,
      fontFamily: fonts.sansExtrabold,
      fontSize: 16,
      letterSpacing: 3,
    },
    title: { color: c.text, fontFamily: fonts.sansExtrabold },
    cta: { color: c.textDim, fontFamily: fonts.sansMedium },
    budgetRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
    budgetNumber: { color: c.accent, fontFamily: fonts.sansExtrabold },
    budgetLabel: { color: c.textDim, fontFamily: fonts.sansSemibold, fontSize: 16, lineHeight: 20 },
    nowPlaying: { marginTop: spacing.sm, gap: 2 },
    nowPlayingLabel: {
      color: c.textFaint,
      fontFamily: fonts.sansSemibold,
      fontSize: 12,
      letterSpacing: 2,
    },
    nowPlayingTitle: { color: c.text, fontFamily: fonts.sansSemibold, fontSize: 22 },
    latest: { marginTop: spacing.sm, gap: 4, alignSelf: "stretch" },
    latestHeader: { color: c.accent, fontFamily: fonts.sansSemibold, fontSize: 14 },
    latestRow: { color: c.textDim, fontSize: 14 },
  });
}
