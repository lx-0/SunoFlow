import { View, FlatList, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { Stack } from "expo-router";
import { ListMusic, ChevronUp, ChevronDown, X } from "lucide-react-native";
import { usePlayback } from "@/playback/usePlayback";
import { jumpTo } from "@/playback/audio";
import { reorderQueue, removeFromQueue } from "@/playback/controls";
import { PlayIcon } from "@/components/Icons";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

// Up-Next: the live playback queue (reads the controller's snapshot). Tap a row
// to jump to that track; reorder with the up/down controls; remove with the X.
// (True drag-and-drop is deferred — the reorder library predates Reanimated 4.)
export default function QueueScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { queue, index } = usePlayback();
  const last = queue.length - 1;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Up Next" }} />
      {queue.length === 0 ? (
        <EmptyState
          Icon={ListMusic}
          title="Queue is empty"
          subtitle="Play something to build a queue."
        />
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(s, i) => `${s.id}:${i}`}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          renderItem={({ item, index: i }) => {
            const isCurrent = i === index;
            return (
              <View style={styles.row}>
                <Pressable style={styles.tap} onPress={() => void jumpTo(i)}>
                  <View style={styles.position}>
                    {isCurrent ? (
                      <PlayIcon color={colors.accent} size={13} />
                    ) : (
                      <Text style={styles.positionNum}>{i + 1}</Text>
                    )}
                  </View>
                  <View style={styles.meta}>
                    <Text style={[styles.title, isCurrent && styles.current]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.artist ? (
                      <Text style={styles.dim} numberOfLines={1}>{item.artist}</Text>
                    ) : null}
                  </View>
                </Pressable>
                <View style={styles.actions}>
                  <Pressable
                    hitSlop={HIT}
                    disabled={i === 0}
                    onPress={() => reorderQueue(i, i - 1)}
                    style={styles.actBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Move up"
                  >
                    <ChevronUp color={i === 0 ? colors.textFaint : colors.textDim} size={20} />
                  </Pressable>
                  <Pressable
                    hitSlop={HIT}
                    disabled={i === last}
                    onPress={() => reorderQueue(i, i + 1)}
                    style={styles.actBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Move down"
                  >
                    <ChevronDown color={i === last ? colors.textFaint : colors.textDim} size={20} />
                  </Pressable>
                  <Pressable
                    hitSlop={HIT}
                    onPress={() => void removeFromQueue(i)}
                    style={styles.actBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Remove from queue"
                  >
                    <X color={colors.textDim} size={18} />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 20,
      paddingRight: 12,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tap: { flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 14 },
    position: { width: 28, alignItems: "flex-start", justifyContent: "center" },
    positionNum: { color: c.textFaint, fontSize: 13, fontVariant: ["tabular-nums"] },
    meta: { flex: 1 },
    title: { color: c.text, fontSize: 16 },
    current: { color: c.accent, fontWeight: "700" },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
    actions: { flexDirection: "row", alignItems: "center" },
    actBtn: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  });
}
