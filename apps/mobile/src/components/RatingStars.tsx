import { useEffect, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Star } from "lucide-react-native";
import { getRating, setRating } from "@/api/ratings";

// Compact 5-star rater for a single song. Loads the current user's rating when
// songId changes; tapping a star sets it optimistically and reverts on failure.
// Tapping the currently-selected star clears the rating (sends 0).
export function RatingStars({ songId, size = 28 }: { songId: string; size?: number }) {
  const [rating, setLocalRating] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLocalRating(null);
    getRating(songId)
      .then((value) => {
        if (!cancelled) setLocalRating(value);
      })
      .catch((e: unknown) => {
        console.error("[rating] load failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, [songId]);

  const onTap = (star: number) => {
    const next = rating === star ? 0 : star;
    const previous = rating;
    setLocalRating(next === 0 ? null : next);
    setRating(songId, next).catch((e: unknown) => {
      console.error("[rating] set failed", e);
      setLocalRating(previous);
    });
  };

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = rating !== null && star <= rating;
        return (
          <Pressable
            key={star}
            onPress={() => onTap(star)}
            hitSlop={6}
            style={styles.star}
          >
            <Star
              size={28}
              color={active ? "#f5c518" : "#9a9aa2"}
              fill={active ? "#f5c518" : "transparent"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  star: { paddingHorizontal: 4 },
});
