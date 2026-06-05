import { useEffect, useState } from "react";
import { Pressable, Text, StyleSheet, ActionSheetIOS } from "react-native";
import { Star } from "lucide-react-native";
import { getRating, setRating } from "@/api/ratings";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Compact rating control: one star button showing the current value; tapping
// opens a context menu (1–5 / clear) — saves the horizontal space the 5-star row
// used. Optimistic with revert on failure.
export function RatingButton({ songId }: { songId: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [rating, setLocalRating] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLocalRating(null);
    getRating(songId)
      .then((v) => !cancelled && setLocalRating(v))
      .catch((e: unknown) => console.error("[rating] load failed", e));
    return () => { cancelled = true; };
  }, [songId]);

  function apply(value: number) {
    const prev = rating;
    setLocalRating(value === 0 ? null : value);
    setRating(songId, value).catch((e: unknown) => {
      console.error("[rating] set failed", e);
      setLocalRating(prev);
    });
  }

  function open() {
    const stars = [1, 2, 3, 4, 5].map((n) => "★".repeat(n));
    const hasRating = rating !== null && rating > 0;
    const options = [...stars, ...(hasRating ? ["Clear rating"] : []), "Cancel"];
    const clearIdx = hasRating ? 5 : -1;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: "Rate this song",
        options,
        cancelButtonIndex: options.length - 1,
        ...(hasRating ? { destructiveButtonIndex: clearIdx } : {}),
      },
      (i) => {
        if (i >= 0 && i <= 4) apply(i + 1);
        else if (hasRating && i === clearIdx) apply(0);
      },
    );
  }

  const rated = rating !== null && rating > 0;
  return (
    <Pressable style={styles.btn} hitSlop={6} onPress={open} accessibilityLabel="Rate this song">
      <Star size={20} color={rated ? colors.star : colors.textFaint} fill={rated ? colors.star : "transparent"} />
      <Text style={[styles.label, rated && styles.labelRated]}>{rated ? String(rating) : "Rate"}</Text>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    btn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.surface, borderRadius: 999, paddingHorizontal: 12, height: 44 },
    label: { color: c.textDim, fontSize: 13, fontWeight: "600" },
    labelRated: { color: c.star },
  });
}
