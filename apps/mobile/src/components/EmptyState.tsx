import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Shared empty / error state: a centered icon + title + optional subtitle and a
// single CTA. Used across list screens for a consistent, friendly empty look
// instead of a bare line of dim text.
export function EmptyState({
  Icon,
  title,
  subtitle,
  ctaLabel,
  onCta,
  tone = "empty",
}: {
  Icon: LucideIcon;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** "error" tints the icon with the danger color. */
  tone?: "empty" | "error";
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.wrap}>
      <Icon color={tone === "error" ? colors.danger : colors.textFaint} size={44} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {ctaLabel && onCta ? (
        <Pressable style={styles.cta} onPress={onCta} accessibilityRole="button">
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
    title: { color: c.text, fontSize: 16, fontWeight: "600", textAlign: "center" },
    sub: { color: c.textDim, fontSize: 14, lineHeight: 20, textAlign: "center" },
    cta: { marginTop: 6, backgroundColor: c.accentStrong, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11 },
    ctaText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
  });
}
