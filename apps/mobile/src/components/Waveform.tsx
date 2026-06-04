import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Animated, StyleSheet, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { useAudioPlayer } from "@simform_solutions/react-native-audio-waveform";
import { downloadAudioForPeaks, normalizePeaks } from "@/playback/peaks";
import { useTheme } from "@/theme/ThemeContext";

// Real waveform: peaks are extracted natively from the audio file (see peaks.ts),
// the same signal the web player draws. Played portion fills white; tap to seek;
// timecoded reaction emojis float up over their position as playback reaches them.
// While peaks load (download + decode) a flat placeholder is shown.

const BAR_COUNT = 56;
const PLACEHOLDER = Array.from({ length: BAR_COUNT }, () => 0.12);

export interface WaveformPopup {
  key: number;
  emoji: string;
  leftPct: number;
}

function ReactionPopup({ emoji, leftPct }: { emoji: string; leftPct: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }).start();
  }, [anim]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -52] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View style={[styles.popup, { left: `${leftPct}%`, opacity, transform: [{ translateY }] }]}>
      <Text style={styles.popupEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

export function Waveform({
  songId,
  streamUrl,
  positionSeconds,
  durationSeconds,
  onSeek,
  popups,
}: {
  songId: string | undefined;
  streamUrl: string | undefined;
  positionSeconds: number;
  durationSeconds: number;
  onSeek: (seconds: number) => void;
  popups: WaveformPopup[];
}) {
  const { colors } = useTheme();
  const { extractWaveformData, onCurrentExtractedWaveformData } = useAudioPlayer();
  const [width, setWidth] = useState(0);
  const [peaks, setPeaks] = useState<number[] | null>(null);

  // The native extractor emits progress events during extractWaveformData; we only
  // use the final Promise, but RN warns "Sending onCurrentExtractedWaveformData
  // with no listeners registered" unless something is subscribed. Register a no-op.
  useEffect(() => {
    const sub = onCurrentExtractedWaveformData(() => {});
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPeaks(null);
    if (!songId || !streamUrl) return;
    (async () => {
      try {
        const path = await downloadAudioForPeaks(songId, streamUrl);
        const data = await extractWaveformData({ playerKey: songId, path, noOfSamples: BAR_COUNT });
        const norm = normalizePeaks(data, BAR_COUNT);
        if (!cancelled && norm.length) setPeaks(norm);
      } catch (e) {
        console.error("[waveform] peaks failed", e); // keep the flat placeholder
      }
    })();
    return () => {
      cancelled = true;
    };
    // extractWaveformData identity isn't stable across renders; depend on the song only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, streamUrl]);

  const bars = peaks ?? PLACEHOLDER;
  const progress = durationSeconds > 0 ? Math.min(1, positionSeconds / durationSeconds) : 0;
  const playedBars = Math.round(progress * BAR_COUNT);

  function handlePress(e: GestureResponderEvent) {
    if (width <= 0 || durationSeconds <= 0) return;
    const frac = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
    onSeek(frac * durationSeconds);
  }

  return (
    <View style={styles.wrap}>
      <View pointerEvents="none" style={styles.popupLayer}>
        {popups.map((p) => (
          <ReactionPopup key={p.key} emoji={p.emoji} leftPct={p.leftPct} />
        ))}
      </View>

      <Pressable style={styles.bars} onPress={handlePress} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {bars.map((amp, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              marginHorizontal: 1,
              height: `${Math.max(2, amp * 100)}%`,
              borderRadius: 1,
              backgroundColor: i < playedBars ? colors.text : colors.border,
            }}
          />
        ))}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "stretch", marginTop: 24 },
  popupLayer: { position: "absolute", left: 0, right: 0, bottom: 40, height: 1 },
  popup: { position: "absolute", width: 28, marginLeft: -14, alignItems: "center" },
  popupEmoji: { fontSize: 22 },
  bars: { flexDirection: "row", alignItems: "center", height: 48 },
});
