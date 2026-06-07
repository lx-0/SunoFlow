import { useCallback, useState } from "react";
import {
  View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { goToSection } from "@/navigation";
import { Plus, X } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchStyleTemplates, createStyleTemplate, updateStyleTemplate, deleteStyleTemplate,
  STYLE_TEMPLATE_NAME_MAX, STYLE_TEMPLATE_TAGS_MAX, type StyleTemplate,
} from "@/api/style-templates";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Style Templates management: define (create), rename, re-tag, delete, and use
// saved style presets. They feed the Generate screen's Style field. A template is
// just { name, tags } — the `tags` string is what gets dropped into Style.
export default function StyleTemplatesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [templates, setTemplates] = useState<StyleTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetchStyleTemplates()
      .then(setTemplates)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load (HTTP ${e.status})` : "Network error");
        console.error("[style-templates] load failed", e);
      });
  }, []);

  useFocusEffect(useCallback(() => { setTemplates(null); load(); }, [load]));

  async function onCreate() {
    if (busy || !name.trim() || !tags.trim()) return;
    setBusy(true);
    try {
      await createStyleTemplate(name, tags);
      setName("");
      setTags("");
      setCreating(false);
      load();
    } catch (e) {
      Alert.alert("Couldn't create template", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[style-templates] create failed", e);
    } finally {
      setBusy(false);
    }
  }

  function rename(t: StyleTemplate) {
    Alert.prompt?.(
      "Rename template",
      undefined,
      async (value) => {
        const next = value?.trim();
        if (!next || next === t.name) return;
        try { await updateStyleTemplate(t.id, { name: next }); load(); }
        catch (e) { Alert.alert("Couldn't rename", "Please try again."); console.error("[style-templates] rename failed", e); }
      },
      "plain-text",
      t.name,
    );
  }

  function editTags(t: StyleTemplate) {
    Alert.prompt?.(
      "Edit style/tags",
      "The text dropped into the Style field",
      async (value) => {
        const next = value?.trim();
        if (!next || next === t.tags) return;
        try { await updateStyleTemplate(t.id, { tags: next }); load(); }
        catch (e) { Alert.alert("Couldn't update", "Please try again."); console.error("[style-templates] edit tags failed", e); }
      },
      "plain-text",
      t.tags,
    );
  }

  function confirmDelete(t: StyleTemplate) {
    Alert.alert("Delete template?", `Delete "${t.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteStyleTemplate(t.id); load(); }
          catch (e) { Alert.alert("Couldn't delete", "Please try again."); console.error("[style-templates] delete failed", e); }
        },
      },
    ]);
  }

  function rowActions(t: StyleTemplate) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t.name,
        options: ["Use in Generate", "Rename", "Edit style/tags", "Delete", "Cancel"],
        destructiveButtonIndex: 3,
        cancelButtonIndex: 4,
      },
      (i) => {
        if (i === 0) goToSection({ pathname: "/generate", params: { style: t.tags } });
        else if (i === 1) rename(t);
        else if (i === 2) editTags(t);
        else if (i === 3) confirmDelete(t);
      },
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Style Templates",
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
            placeholder="e.g. Dreamy Lo-fi"
            placeholderTextColor={colors.textFaint}
            maxLength={STYLE_TEMPLATE_NAME_MAX}
          />
          <Text style={styles.label}>Style / tags</Text>
          <TextInput
            style={[styles.input, styles.tagsInput]}
            value={tags}
            onChangeText={setTags}
            placeholder="e.g. dreamy lo-fi hip hop, mellow piano, rain"
            placeholderTextColor={colors.textFaint}
            maxLength={STYLE_TEMPLATE_TAGS_MAX}
            multiline
          />
          <Pressable
            style={[styles.saveBtn, (!name.trim() || !tags.trim() || busy) && styles.btnDisabled]}
            onPress={onCreate}
            disabled={!name.trim() || !tags.trim() || busy}
          >
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Save template</Text>}
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !templates ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : templates.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>No style templates yet. Tap + to create one.</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => rowActions(item)}>
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.dim} numberOfLines={2}>{item.tags}</Text>
              </View>
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
    createCard: { padding: 16, gap: 8, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    label: { color: c.textDim, fontSize: 13, marginTop: 4 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    tagsInput: { minHeight: 64, textAlignVertical: "top" },
    saveBtn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 8 },
    saveText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    btnDisabled: { opacity: 0.45 },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    meta: { flex: 1, marginRight: 12 },
    title: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
