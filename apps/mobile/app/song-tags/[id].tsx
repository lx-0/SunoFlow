import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Plus, X, Tag, AlertCircle } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchSongTags,
  addSongTag,
  removeSongTag,
  type SongTag,
} from "@/api/tags";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Per-song tag editor (mobile parity with the web owner view). Loads the song's
// tags on focus, adds via an inline input, and removes a tag by tapping its chip
// ✕. Adds reload from the server; removes are optimistic with revert-on-error so
// the chip vanishes instantly but reappears if the request fails. Four states:
// loading / error / empty / data. Errors are surfaced (Alert + console.error).
export default function SongTagsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tags, setTags] = useState<SongTag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) {
      setError("Missing song id");
      return;
    }
    setError(null);
    fetchSongTags(id)
      .then(setTags)
      .catch((e: unknown) => {
        setError(
          e instanceof HttpError ? `Failed to load tags (HTTP ${e.status})` : "Network error",
        );
        console.error("[song-tags] load failed", e);
      });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setTags(null);
      load();
    }, [load]),
  );

  async function onAdd() {
    const trimmed = name.trim();
    if (!id || !trimmed || busy) return;
    setBusy(true);
    try {
      await addSongTag(id, trimmed);
      setName("");
      load();
    } catch (e) {
      Alert.alert(
        "Couldn't add tag",
        e instanceof HttpError && e.message ? e.message : "Please try again.",
      );
      console.error("[song-tags] add failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(tag: SongTag) {
    if (!id) return;
    const prev = tags;
    // Optimistic: drop the chip immediately, revert if the server rejects.
    setTags((cur) => (cur ?? []).filter((t) => t.id !== tag.id));
    try {
      await removeSongTag(id, tag.id);
    } catch (e) {
      setTags(prev);
      Alert.alert(
        "Couldn't remove tag",
        e instanceof HttpError && e.message ? e.message : "Please try again.",
      );
      console.error("[song-tags] remove failed", e);
    }
  }

  const canAdd = !!name.trim() && !busy;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Edit Tags" }} />

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Add a tag"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={50}
          returnKeyType="done"
          onSubmitEditing={() => void onAdd()}
        />
        <Pressable
          style={[styles.addBtn, !canAdd && styles.btnDisabled]}
          onPress={() => void onAdd()}
          disabled={!canAdd}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} size="small" />
          ) : (
            <Plus color={colors.onAccent} size={20} />
          )}
        </Pressable>
      </View>

      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !tags ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : tags.length === 0 ? (
        <EmptyState
          Icon={Tag}
          title="No tags yet"
          subtitle="Add one with the field above."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.chips}>
          {tags.map((tag) => (
            <View key={tag.id} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {tag.name}
              </Text>
              <Pressable
                onPress={() => void onRemove(tag)}
                hitSlop={8}
                style={styles.chipRemove}
                accessibilityLabel={`Remove tag ${tag.name}`}
              >
                <X color={colors.textDim} size={15} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    input: {
      flex: 1,
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 10,
      color: c.text,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentStrong,
    },
    btnDisabled: { opacity: 0.45 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingBottom: MINIPLAYER_CLEARANCE },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      maxWidth: "100%",
      backgroundColor: c.surfaceAlt,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 16,
      paddingLeft: 14,
      paddingRight: 8,
      paddingVertical: 8,
    },
    chipText: { color: c.text, fontSize: 14, flexShrink: 1 },
    chipRemove: { alignItems: "center", justifyContent: "center" },
  });
}
