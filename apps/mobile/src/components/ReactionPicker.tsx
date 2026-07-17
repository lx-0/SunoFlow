import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { pickReactionEmojis } from "@sunoflow/core";
import { ReactIcon } from "@/components/Icons";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Emoji reaction picker as a popover (mirrors the PWA): a trigger button opens a
// floating pill of 6 emojis — the 4 most-used for this song plus 2 random — and
// tapping one reacts at the current playback time, then closes. The emoji set +
// pick rule come from @sunoflow/core, shared 1:1 with the web picker.

export function ReactionPicker({
  onReact,
  reactionEmojis,
}: {
  onReact: (emoji: string) => void;
  reactionEmojis: string[];
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState<string[]>([]);

  function toggle() {
    if (!open) setDisplay(pickReactionEmojis(reactionEmojis));
    setOpen((o) => !o);
  }

  return (
    <View style={styles.wrap}>
      {open ? (
        <View style={styles.popover}>
          {display.map((e) => (
            <Pressable
              key={e}
              hitSlop={4}
              style={styles.emojiBtn}
              accessibilityRole="button"
              accessibilityLabel={`React with ${e}`}
              onPress={() => {
                onReact(e);
                setOpen(false);
              }}
            >
              <Text style={styles.emoji}>{e}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        hitSlop={10}
        style={styles.trigger}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel="Add reaction"
        accessibilityState={{ expanded: open }}
      >
        <ReactIcon color={open ? colors.accent : colors.textDim} size={24} />
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { alignItems: "center" },
    popover: {
      position: "absolute",
      bottom: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.surfaceAlt,
      borderRadius: 24,
      paddingHorizontal: 8,
      paddingVertical: 6,
      shadowColor: "#000",
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    emojiBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
    emoji: { fontSize: 22 },
    trigger: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  });
}
