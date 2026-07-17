import { useCallback, useState } from "react";
import {
  View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS,
} from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { AlertCircle, Plus, Tag as TagIcon, X } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchTags, createTag, renameTag, deleteTag, type Tag } from "@/api/tags";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { usePrompt } from "@/components/PromptSheet";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Global tag management: rename or delete the user's tags across all songs, and
// create new ones. Mirrors the web Settings → Tag Management section. Per-song
// tagging and tag browsing live elsewhere; this is the cross-song view.
export default function ManageTagsScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const prompt = usePrompt();
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetchTags()
      .then(setTags)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load (HTTP ${e.status})` : "Network error");
        console.error("[manage-tags] load failed", e);
      });
  }, []);

  useFocusEffect(useCallback(() => { setTags(null); load(); }, [load]));

  async function onCreate() {
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      await createTag(name);
      setName("");
      setCreating(false);
      load();
    } catch (e) {
      Alert.alert("Couldn't create tag", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[manage-tags] create failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function rename(t: Tag) {
    const value = await prompt({ title: "Rename tag", defaultValue: t.name });
    const next = value?.trim();
    if (!next || next === t.name) return;
    try { await renameTag(t.id, next); load(); }
    catch (e) { Alert.alert("Couldn't rename", "Please try again."); console.error("[manage-tags] rename failed", e); }
  }

  function confirmDelete(t: Tag) {
    Alert.alert("Delete tag?", `Removes "${t.name}" from all songs.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteTag(t.id); load(); }
          catch (e) { Alert.alert("Couldn't delete", "Please try again."); console.error("[manage-tags] delete failed", e); }
        },
      },
    ]);
  }

  function rowActions(t: Tag) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t.name,
        options: ["Browse songs", "Rename", "Delete", "Cancel"],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      (i) => {
        if (i === 0) router.push(`/tag/${t.id}`);
        else if (i === 1) rename(t);
        else if (i === 2) confirmDelete(t);
      },
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Manage Tags",
          headerRight: () => (
            <Pressable onPress={() => setCreating((v) => !v)} hitSlop={8}>
              {creating ? <X color={colors.accent} size={22} /> : <Plus color={colors.accent} size={22} />}
            </Pressable>
          ),
        }}
      />

      {creating ? (
        <View style={styles.createCard}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Workout"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            onSubmitEditing={onCreate}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.saveBtn, (!name.trim() || busy) && styles.btnDisabled]}
            onPress={onCreate}
            disabled={!name.trim() || busy}
          >
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Add tag</Text>}
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !tags ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : tags.length === 0 ? (
        <EmptyState
          Icon={TagIcon}
          title="No tags yet"
          subtitle="Tap + to create one."
        />
      ) : (
        <FlatList
          data={tags}
          contentContainerStyle={styles.listContent}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => rowActions(item)}>
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
              </View>
              {typeof item.songCount === "number" ? (
                <Text style={styles.count}>
                  {item.songCount} {item.songCount === 1 ? "song" : "songs"}
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    listContent: { paddingBottom: MINIPLAYER_CLEARANCE },
    createCard: { padding: 16, gap: 8, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    label: { color: c.textDim, fontSize: 13, marginTop: 4 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    saveBtn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 8 },
    saveText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    btnDisabled: { opacity: 0.45 },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    meta: { flex: 1, marginRight: 12 },
    title: { color: c.text, fontSize: 16 },
    count: { color: c.textFaint, fontSize: 13, fontVariant: ["tabular-nums"] },
  });
}
