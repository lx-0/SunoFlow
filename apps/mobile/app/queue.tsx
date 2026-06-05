import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { ListMusic } from "lucide-react-native";
import { usePlayback } from "@/playback/usePlayback";
import { jumpTo } from "@/playback/audio";
import { PlayIcon } from "@/components/Icons";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Up-Next: the live playback queue (reads the controller's snapshot). Tap a row
// to jump straight to that track. The currently-playing row is highlighted.
export default function QueueScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { queue, index } = usePlayback();

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
              <Pressable style={styles.row} onPress={() => void jumpTo(i)}>
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
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    position: { width: 28, alignItems: "flex-start", justifyContent: "center" },
    positionNum: { color: c.textFaint, fontSize: 13, fontVariant: ["tabular-nums"] },
    meta: { flex: 1 },
    title: { color: c.text, fontSize: 16 },
    current: { color: c.accent, fontWeight: "700" },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
