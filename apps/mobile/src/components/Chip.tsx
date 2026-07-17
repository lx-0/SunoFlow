import { Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { useTheme } from "@/theme/ThemeContext";
import { radii } from "@/theme/theme";

// The one chip (DESIGN.md): pill, surface-hover plane, label typography;
// active = accent fill with on-accent text. Filter rows (moods, genres, tags)
// use this instead of hand-rolled per-screen chip recipes. Accessibility
// (button role + selected state) is built in.
export function Chip({
  label,
  active = false,
  onPress,
  disabled = false,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.accent : colors.surfaceHover },
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
    >
      <Text style={[styles.label, { color: active ? colors.onAccent : colors.textDim }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: { fontSize: 12, fontWeight: "500" },
  disabled: { opacity: 0.5 },
});
