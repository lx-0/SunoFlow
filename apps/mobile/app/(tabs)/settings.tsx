import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { getApiKeyId, clearSession } from "@/auth/session";
import { apiDelete } from "@/api/client";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeMode } from "@/theme/theme";

const MODES: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();

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
  signOut: { marginTop: "auto", alignItems: "center", paddingVertical: 14, borderRadius: 12 },
  signOutText: { fontSize: 15, fontWeight: "600" },
});
