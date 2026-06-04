import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ReactIcon } from "@/components/Icons";

// Emoji reaction picker as a popover (mirrors the PWA): a trigger button opens a
// floating pill of 6 emojis — the 4 most-used for this song plus 2 random — and
// tapping one reacts at the current playback time, then closes.

const ALL_EMOJIS = [
  "🔥", "🤯", "😭", "🥵", "💀", "🫶", "👑", "🎸", "😤", "🚀", "💥", "✨",
  "🎵", "🎶", "💜", "🙌", "😍", "🫠", "🤩", "🥹", "💫", "🌊", "⚡",
  "🎤", "🪩", "🤘", "💃", "🕺", "🧠", "👏", "😈", "🦋", "🌟", "🫡",
];
const DISPLAY_COUNT = 6;
const TOP_USED_COUNT = 4;

function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickEmojis(reactionEmojis: string[]): string[] {
  const counts = new Map<string, number>();
  for (const e of reactionEmojis) counts.set(e, (counts.get(e) ?? 0) + 1);
  const topUsed = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_USED_COUNT)
    .map(([e]) => e);
  const remaining = ALL_EMOJIS.filter((e) => !topUsed.includes(e));
  return [...topUsed, ...shuffled(remaining).slice(0, DISPLAY_COUNT - topUsed.length)];
}

export function ReactionPicker({
  onReact,
  reactionEmojis,
}: {
  onReact: (emoji: string) => void;
  reactionEmojis: string[];
}) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState<string[]>([]);

  function toggle() {
    if (!open) setDisplay(pickEmojis(reactionEmojis));
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
      <Pressable hitSlop={10} style={styles.trigger} onPress={toggle}>
        <ReactIcon color={open ? "#8b7cff" : "#9a9aa2"} size={24} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  popover: {
    position: "absolute",
    bottom: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1c1c22",
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
