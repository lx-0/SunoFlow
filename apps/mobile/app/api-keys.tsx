import { useCallback, useState } from "react";
import {
  View, Text, TextInput, FlatList, Pressable, Switch, ActivityIndicator, StyleSheet, Alert,
} from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { Plus, X } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchSunoKey, setUsePersonalKey, setSunoApiKey,
  fetchPersonalKeys, createPersonalKey, deletePersonalKey,
  type SunoKeyState, type PersonalKey,
} from "@/api/api-keys";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

const KEY_NAME_MAX = 64;

// API Keys management. Mirrors the web settings/api-key-sections.tsx:
//   1. Suno API key — a switch to use the user's personal Suno key, plus a
//      paste-and-save field for the secret (only the masked value is ever read
//      back from the server).
//   2. Personal API keys — list / create / revoke keys for programmatic access.
//      The create response carries the secret exactly once; we show it in an
//      Alert and tell the user to copy it before it's gone.
export default function ApiKeysScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [suno, setSuno] = useState<SunoKeyState | null>(null);
  const [keys, setKeys] = useState<PersonalKey[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [togglingPersonal, setTogglingPersonal] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchSunoKey(), fetchPersonalKeys()])
      .then(([s, k]) => { setSuno(s); setKeys(k); })
      .catch((e: unknown) => {
        setError(e instanceof HttpError ? `Failed to load (HTTP ${e.status})` : "Network error");
        console.error("[api-keys] load failed", e);
      });
  }, []);

  useFocusEffect(useCallback(() => { setSuno(null); setKeys(null); load(); }, [load]));

  async function onTogglePersonal(next: boolean) {
    if (!suno || togglingPersonal) return;
    if (next && !suno.sunoApiKey) {
      Alert.alert("Add your Suno key first", "Paste and save your personal Suno API key before enabling it.");
      return;
    }
    const prev = suno.usePersonalApiKey;
    setSuno({ ...suno, usePersonalApiKey: next }); // optimistic
    setTogglingPersonal(true);
    try {
      await setUsePersonalKey(next);
    } catch (e) {
      setSuno((s) => (s ? { ...s, usePersonalApiKey: prev } : s)); // revert
      Alert.alert("Couldn't update", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[api-keys] toggle personal failed", e);
    } finally {
      setTogglingPersonal(false);
    }
  }

  async function onSaveSunoKey() {
    const value = keyDraft.trim();
    if (!value || savingKey) return;
    setSavingKey(true);
    try {
      await setSunoApiKey(value);
      setKeyDraft("");
      load();
    } catch (e) {
      Alert.alert("Couldn't save key", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[api-keys] save suno key failed", e);
    } finally {
      setSavingKey(false);
    }
  }

  async function onCreate() {
    const name = newKeyName.trim();
    if (busy || !name) return;
    setBusy(true);
    try {
      const { secret } = await createPersonalKey(name);
      setNewKeyName("");
      setCreating(false);
      if (secret) {
        Alert.alert(
          "API key created",
          `Copy this key now — it won't be shown again:\n\n${secret}`,
        );
      } else {
        Alert.alert("API key created", "The key was created but its secret was not returned.");
      }
      load();
    } catch (e) {
      Alert.alert("Couldn't create key", e instanceof HttpError && e.message ? e.message : "Please try again.");
      console.error("[api-keys] create failed", e);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(k: PersonalKey) {
    Alert.alert("Revoke key?", `Revoke "${k.name}"? Apps using it will stop working.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke", style: "destructive",
        onPress: async () => {
          try { await deletePersonalKey(k.id); load(); }
          catch (e) { Alert.alert("Couldn't revoke", "Please try again."); console.error("[api-keys] delete failed", e); }
        },
      },
    ]);
  }

  const usePersonal = suno?.usePersonalApiKey === true;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "API Keys" }} />

      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !suno || !keys ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : (
        <FlatList
          data={keys}
          keyExtractor={(k) => k.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerArea}>
              {/* Suno API key */}
              <Text style={styles.sectionTitle}>Suno API key</Text>
              <View style={styles.card}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleMeta}>
                    <Text style={styles.rowTitle}>Use personal Suno API key</Text>
                    <Text style={styles.dim}>
                      {usePersonal
                        ? "Using your personal key — app rate limits and credits don't apply."
                        : "When on, generation uses your key instead of the shared app key."}
                    </Text>
                  </View>
                  <Switch
                    value={usePersonal}
                    onValueChange={onTogglePersonal}
                    disabled={togglingPersonal}
                    trackColor={{ true: colors.accentStrong, false: colors.surfaceAlt }}
                    thumbColor={colors.onAccent}
                  />
                </View>

                {usePersonal ? (
                  <View style={styles.keyEntry}>
                    <TextInput
                      style={styles.input}
                      value={keyDraft}
                      onChangeText={setKeyDraft}
                      placeholder={suno.sunoApiKey ? `Current: ${suno.sunoApiKey}` : "Paste your Suno API key"}
                      placeholderTextColor={colors.textFaint}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      style={[styles.saveBtn, (!keyDraft.trim() || savingKey) && styles.btnDisabled]}
                      onPress={onSaveSunoKey}
                      disabled={!keyDraft.trim() || savingKey}
                    >
                      {savingKey ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Save key</Text>}
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {/* Personal API keys */}
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Personal API keys</Text>
                <Pressable onPress={() => setCreating((v) => !v)} hitSlop={8}>
                  {creating ? <X color={colors.accent} size={22} /> : <Plus color={colors.accent} size={22} />}
                </Pressable>
              </View>
              <Text style={[styles.dim, styles.sectionHint]}>
                Keys for programmatic access to your SunoFlow account. Max 5 active.
              </Text>

              {creating ? (
                <View style={styles.card}>
                  <TextInput
                    style={styles.input}
                    value={newKeyName}
                    onChangeText={setNewKeyName}
                    placeholder="Key name (e.g. CI/CD, Mobile app)"
                    placeholderTextColor={colors.textFaint}
                    maxLength={KEY_NAME_MAX}
                    autoFocus
                  />
                  <Pressable
                    style={[styles.saveBtn, (!newKeyName.trim() || busy) && styles.btnDisabled]}
                    onPress={onCreate}
                    disabled={!newKeyName.trim() || busy}
                  >
                    {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.saveText}>Create key</Text>}
                  </Pressable>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
              <Pressable onPress={() => confirmDelete(item)} hitSlop={10} style={styles.deleteBtn}>
                <X color={colors.danger} size={20} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.dim}>No API keys yet. Tap + to create one.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    listContent: { paddingBottom: 32 },
    headerArea: { paddingTop: 8 },
    sectionTitle: { color: c.textFaint, fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 20, marginTop: 16, marginBottom: 8 },
    sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 18 },
    sectionHint: { paddingHorizontal: 20, marginTop: -2, marginBottom: 8 },
    card: { marginHorizontal: 16, backgroundColor: c.surface, borderRadius: 12, padding: 16, gap: 12 },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    toggleMeta: { flex: 1, marginRight: 12 },
    keyEntry: { gap: 8 },
    input: { backgroundColor: c.bg, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, color: c.text, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
    saveBtn: { backgroundColor: c.accentStrong, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
    saveText: { color: c.onAccent, fontSize: 15, fontWeight: "700" },
    btnDisabled: { opacity: 0.45 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginTop: 8, backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
    rowTitle: { color: c.text, fontSize: 16, flex: 1, marginRight: 12 },
    deleteBtn: { padding: 2 },
    emptyBox: { paddingHorizontal: 20, paddingVertical: 16 },
    dim: { color: c.textDim, fontSize: 13 },
  });
}
