import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SendIcon } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchComments, addComment, type Comment } from "@/api/comments";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Comments on a public song. Loads on focus, posts optimistically (the new
// comment is appended to the top before the server confirms; on failure it's
// rolled back and an error is surfaced). Four states: loading / error / empty / data.
export default function CommentsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Post failures are separate from load failures — a failed post must NOT replace
  // the whole loaded thread with an error screen.
  const [postError, setPostError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setComments(null);
      setError(null);
      fetchComments(id)
        .then(setComments)
        .catch((e: unknown) => {
          setError(e instanceof HttpError ? `Failed to load comments (HTTP ${e.status})` : "Network error");
          console.error("[comments] load failed", e);
        });
    }, [id]),
  );

  const onSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!id || !trimmed || sending) return;
    setSending(true);
    setPostError(null);
    const optimistic: Comment = {
      id: `optimistic:${Date.now()}`,
      body: trimmed,
      author: "You",
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [optimistic, ...(prev ?? [])]);
    setText("");
    try {
      const saved = await addComment(id, trimmed);
      if (saved) {
        setComments((prev) => (prev ?? []).map((c) => (c.id === optimistic.id ? saved : c)));
      }
    } catch (e) {
      setComments((prev) => (prev ?? []).filter((c) => c.id !== optimistic.id));
      setText(trimmed);
      setPostError(e instanceof HttpError ? `Failed to post (HTTP ${e.status})` : "Failed to post comment");
      console.error("[comments] post failed", e);
    } finally {
      setSending(false);
    }
  }, [id, text, sending]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Comments" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !comments ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : comments.length === 0 ? (
        <View style={styles.centered}><Text style={styles.dim}>No comments yet. Be the first.</Text></View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.head}>
                <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
                <Text style={styles.time}>{formatWhen(item.createdAt)}</Text>
              </View>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />
      )}
      {postError ? <Text style={styles.postError}>{postError}</Text> : null}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          placeholderTextColor={colors.textFaint}
          maxLength={500}
          multiline
        />
        <Pressable
          style={[styles.send, (!text.trim() || sending) && styles.sendDisabled]}
          onPress={() => void onSend()}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator color={colors.onAccent} size="small" /> : <SendIcon color={colors.onAccent} size={18} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// Lightweight relative time. Falls back to an empty string for unknown dates.
function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(then).toLocaleDateString();
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    row: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    author: { color: c.text, fontSize: 15, fontWeight: "600", flex: 1, marginRight: 12 },
    time: { color: c.textFaint, fontSize: 12 },
    body: { color: c.textDim, fontSize: 15, marginTop: 4, lineHeight: 20 },
    composer: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 8,
    },
    input: {
      flex: 1,
      color: c.text,
      fontSize: 15,
      maxHeight: 120,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: c.surface,
      borderRadius: 18,
    },
    send: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accent,
    },
    sendDisabled: { opacity: 0.4 },
    postError: { color: c.danger, fontSize: 13, paddingHorizontal: 16, paddingBottom: 6 },
    dim: { color: c.textDim, fontSize: 13 },
  });
}
