import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { Star, CheckCircle2 } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { sendFeedback, type FeedbackCategory } from "@/api/feedback";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

const CATEGORIES: { key: FeedbackCategory; label: string }[] = [
  { key: "bug_report", label: "Bug" },
  { key: "feature_request", label: "Idea" },
  { key: "general", label: "General" },
];

// Send-feedback form. Mirrors the server rule (bug reports require a comment)
// in the disabled state so the user isn't 400'd. score 0 = unset.
export default function FeedbackScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [comment, setComment] = useState("");
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const needsComment = category === "bug_report";
  const canSubmit = !busy && !(needsComment && comment.trim().length === 0);

  async function run() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await sendFeedback({ category, comment, score: score || undefined });
      setSent(true);
    } catch (e) {
      setError(
        e instanceof HttpError
          ? `Couldn't send feedback (HTTP ${e.status})`
          : "Couldn't send feedback.",
      );
      console.error("[feedback] failed", e);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <View style={[styles.container, styles.sentBox]}>
        <Stack.Screen options={{ title: "Send Feedback" }} />
        <CheckCircle2 size={56} color={colors.accent} />
        <Text style={styles.sentTitle}>Thanks for the feedback!</Text>
        <Text style={styles.sentSub}>We read every message.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Send Feedback" }} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.segment}>
        {CATEGORIES.map((cat) => {
          const active = category === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => setCategory(cat.key)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{cat.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Comment</Text>
      <TextInput
        style={styles.input}
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={5000}
        placeholder={needsComment ? "Describe the bug (required)" : "Tell us what's on your mind"}
        placeholderTextColor={colors.textFaint}
      />

      <Text style={styles.label}>Rating (optional)</Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setScore(score === n ? 0 : n)} hitSlop={8}>
            <Star
              size={32}
              color={colors.star}
              fill={n <= score ? colors.star : "transparent"}
            />
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.btn, !canSubmit && styles.btnDisabled]} disabled={!canSubmit} onPress={run}>
        {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Send</Text>}
      </Pressable>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg, padding: 20 },
    label: { color: c.textDim, fontSize: 13, marginTop: 14, marginBottom: 6 },
    segment: { flexDirection: "row", backgroundColor: c.surface, borderRadius: 12, padding: 4, gap: 4 },
    segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
    segmentItemActive: { backgroundColor: c.accentStrong },
    segmentText: { fontSize: 14, fontWeight: "600", color: c.textDim },
    segmentTextActive: { color: c.onAccent },
    input: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 10,
      color: c.text,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 120,
      textAlignVertical: "top",
    },
    starRow: { flexDirection: "row", gap: 10 },
    error: { color: c.danger, fontSize: 13, marginTop: 14 },
    btn: { backgroundColor: c.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: "700" },
    sentBox: { alignItems: "center", justifyContent: "center", gap: 12 },
    sentTitle: { color: c.text, fontSize: 20, fontWeight: "700" },
    sentSub: { color: c.textDim, fontSize: 14 },
  });
}
