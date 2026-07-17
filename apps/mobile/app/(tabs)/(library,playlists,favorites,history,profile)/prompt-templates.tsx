import { useCallback, useState } from "react";
import {
  View, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS, Switch,
} from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { Stack, useFocusEffect } from "expo-router";
import { goToSection } from "@/navigation";
import { AlertCircle, FileText, Plus, X } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchPromptTemplates, createPromptTemplate, updatePromptTemplate, deletePromptTemplate,
  PROMPT_TEMPLATE_NAME_MAX, type PromptTemplate,
} from "@/api/prompt-templates";
import { EmptyState } from "@/components/EmptyState";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { usePrompt } from "@/components/PromptSheet";
import { useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";

// Prompt Templates management: browse built-in + saved prompts, and create /
// rename / edit / delete your own. They feed the Generate screen — "Use in
// Generate" navigates to /generate with the template's prompt (and style)
// prefilled. Built-ins are read-only (the server scopes update/delete to the
// user's own non-built-in rows), so their row only offers "Use in Generate".
export default function PromptTemplatesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const showPrompt = usePrompt();
  const [templates, setTemplates] = useState<PromptTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    fetchPromptTemplates()
      .then(setTemplates)
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load (HTTP ${e.status})` : "Network error");
        console.error("[prompt-templates] load failed", e);
      });
  }, []);

  useFocusEffect(useCallback(() => { setTemplates(null); load(); }, [load]));

  async function onCreate() {
    if (busy || !name.trim() || !prompt.trim()) return;
    setBusy(true);
    try {
      await createPromptTemplate({
        name,
        prompt,
        ...(style.trim() ? { style } : {}),
        isInstrumental,
      });
      setName("");
      setPrompt("");
      setStyle("");
      setIsInstrumental(false);
      setCreating(false);
      load();
    } catch (e) {
      Alert.alert("Couldn't create template", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[prompt-templates] create failed", e);
    } finally {
      setBusy(false);
    }
  }

  async function rename(t: PromptTemplate) {
    const value = await showPrompt({ title: "Rename template", defaultValue: t.name });
    const next = value?.trim();
    if (!next || next === t.name) return;
    try { await updatePromptTemplate(t.id, { name: next }); load(); }
    catch (e) { Alert.alert("Couldn't rename", "Please try again."); console.error("[prompt-templates] rename failed", e); }
  }

  async function editPrompt(t: PromptTemplate) {
    const value = await showPrompt({ title: "Edit prompt", message: "The text dropped into the Generate prompt", defaultValue: t.prompt });
    const next = value?.trim();
    if (!next || next === t.prompt) return;
    try { await updatePromptTemplate(t.id, { prompt: next }); load(); }
    catch (e) { Alert.alert("Couldn't update", "Please try again."); console.error("[prompt-templates] edit prompt failed", e); }
  }

  async function editStyle(t: PromptTemplate) {
    const value = await showPrompt({ title: "Edit style", message: "The style/tags carried by this template", defaultValue: t.style ?? "" });
    const next = value?.trim() ?? "";
    if (next === (t.style ?? "")) return;
    try { await updatePromptTemplate(t.id, { style: next }); load(); }
    catch (e) { Alert.alert("Couldn't update", "Please try again."); console.error("[prompt-templates] edit style failed", e); }
  }

  function confirmDelete(t: PromptTemplate) {
    Alert.alert("Delete template?", `Delete "${t.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deletePromptTemplate(t.id); load(); }
          catch (e) { Alert.alert("Couldn't delete", "Please try again."); console.error("[prompt-templates] delete failed", e); }
        },
      },
    ]);
  }

  function openInGenerate(t: PromptTemplate) {
    goToSection({
      pathname: "/generate",
      params: { prompt: t.prompt, ...(t.style ? { style: t.style } : {}) },
    });
  }

  function rowActions(t: PromptTemplate) {
    if (t.isBuiltIn) {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: t.name, options: ["Use in Generate", "Cancel"], cancelButtonIndex: 1 },
        (i) => { if (i === 0) openInGenerate(t); },
      );
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t.name,
        options: ["Use in Generate", "Rename", "Edit prompt", "Edit style", "Delete", "Cancel"],
        destructiveButtonIndex: 4,
        cancelButtonIndex: 5,
      },
      (i) => {
        if (i === 0) openInGenerate(t);
        else if (i === 1) rename(t);
        else if (i === 2) editPrompt(t);
        else if (i === 3) editStyle(t);
        else if (i === 4) confirmDelete(t);
      },
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Prompt Templates",
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
            placeholder="e.g. Upbeat Pop Anthem"
            placeholderTextColor={colors.textFaint}
            maxLength={PROMPT_TEMPLATE_NAME_MAX}
          />
          <Text style={styles.label}>Prompt</Text>
          <TextInput
            style={[styles.input, styles.multiInput]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="e.g. An energetic pop anthem about chasing dreams"
            placeholderTextColor={colors.textFaint}
            multiline
          />
          <Text style={styles.label}>Style (optional)</Text>
          <TextInput
            style={styles.input}
            value={style}
            onChangeText={setStyle}
            placeholder="e.g. upbeat pop, anthemic, bright synths"
            placeholderTextColor={colors.textFaint}
          />
          <View style={styles.switchRow}>
            <Text style={styles.label}>Instrumental</Text>
            <Switch
              value={isInstrumental}
              onValueChange={setIsInstrumental}
              trackColor={{ false: colors.surfaceAlt, true: colors.accentStrong }}
              thumbColor={colors.onAccent}
            />
          </View>
          <Pressable
            style={[styles.saveBtn, (!name.trim() || !prompt.trim() || busy) && styles.btnDisabled]}
            onPress={onCreate}
            disabled={!name.trim() || !prompt.trim() || busy}
          >
            {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Save template</Text>}
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !templates ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : templates.length === 0 ? (
        <EmptyState
          Icon={FileText}
          title="No prompt templates yet"
          subtitle="Tap + to create one."
        />
      ) : (
        <FlatList
          data={templates}
          contentContainerStyle={styles.listContent}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => rowActions(item)}>
              <View style={styles.meta}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                  {item.isBuiltIn ? <Text style={styles.tag}>Built-in</Text> : null}
                </View>
                <Text style={styles.dim} numberOfLines={2}>{item.description ?? item.prompt}</Text>
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
    listContent: { paddingBottom: MINIPLAYER_CLEARANCE },
    createCard: { padding: 16, gap: 8, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    label: { color: c.textDim, fontSize: 13, marginTop: 4 },
    input: { backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    multiInput: { minHeight: 64, textAlignVertical: "top" },
    switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    saveBtn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 8 },
    saveText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    btnDisabled: { opacity: 0.45 },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth },
    meta: { flex: 1, marginRight: 12 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { color: c.text, fontSize: 16, flexShrink: 1 },
    tag: { color: c.textDim, fontSize: 11, backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden" },
    dim: { color: c.textDim, fontSize: 13, fontFamily: fonts.mono, marginTop: 2 },
  });
}
