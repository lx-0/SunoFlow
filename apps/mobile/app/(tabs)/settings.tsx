import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { getApiKeyId, clearSession } from "@/auth/session";
import { apiDelete } from "@/api/client";
import { useTheme } from "@/theme/ThemeContext";
import { THEMES, THEME_LABELS, type ThemeMode, type ThemeName } from "@/theme/theme";

const MODES: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

const THEME_NAMES = Object.keys(THEMES) as ThemeName[];

export default function SettingsScreen() {
  const { colors, scheme, mode, setMode, themeName, setThemeName } = useTheme();

  async function signOut() {
    const id = await getApiKeyId();
    if (id) {
      try {
        await apiDelete(`/api/profile/api-keys/${id}`);
      } catch (e) {
        console.error("[signout] key revoke failed", e);
      }
    }
    await clearSession();
    router.replace("/login");
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Appearance</Text>
      <View style={[styles.segment, { backgroundColor: colors.surface }]}>
        {MODES.map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              style={[styles.segmentItem, active && { backgroundColor: colors.accentStrong }]}
              onPress={() => setMode(m.key)}
            >
              <Text style={[styles.segmentText, { color: active ? colors.onAccent : colors.textDim }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>Theme</Text>
      <View style={styles.themeRow}>
        {THEME_NAMES.map((name) => {
          const active = themeName === name;
          const swatch = THEMES[name][scheme].accent;
          return (
            <Pressable
              key={name}
              style={[styles.themeChip, { backgroundColor: colors.surface, borderColor: active ? colors.accent : "transparent" }]}
              onPress={() => setThemeName(name)}
            >
              <View style={[styles.swatch, { backgroundColor: swatch }]} />
              <Text style={[styles.themeText, { color: colors.text }]}>{THEME_LABELS[name]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={[styles.signOut, { backgroundColor: colors.surfaceAlt }]} onPress={signOut}>
        <Text style={[styles.signOutText, { color: colors.danger }]}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 8 },
  segment: { flexDirection: "row", borderRadius: 12, padding: 4, gap: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
  segmentText: { fontSize: 14, fontWeight: "600" },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  themeChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 2 },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  themeText: { fontSize: 14, fontWeight: "600" },
  signOut: { marginTop: "auto", alignItems: "center", paddingVertical: 14, borderRadius: 12 },
  signOutText: { fontSize: 15, fontWeight: "600" },
});
