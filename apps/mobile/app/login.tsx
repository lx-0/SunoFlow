import { useState } from "react";
import { View, Pressable, ActivityIndicator, KeyboardAvoidingView, StyleSheet } from "react-native";
import { Text, TextInput } from "@/components/Themed";
import { router } from "expo-router";
import { API_BASE_URL } from "@/api/client";
import { setSession } from "@/auth/session";
import { useTheme } from "@/theme/ThemeContext";
import { radii } from "@/theme/theme";
import type { ThemeColors } from "@/theme/theme";

// Login → POST /api/v1/auth/token (M004-S02-T01) → store the returned API key.
// Every branch ends in visible feedback (error text or redirect).
export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, deviceName: "Mobile (iOS)" }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? "Invalid credentials" : `Login failed (${res.status})`);
        return;
      }
      const json = (await res.json()) as { key: string; id: string };
      await setSession(json.key, json.id);
      router.replace("/");
    } catch (e) {
      setError("Network error, check your connection.");
      console.error("[login] failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
      <View style={styles.c}>
        <Text style={styles.h}>SunoFlow</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={submit}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
        >
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.btnText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    c: { flex: 1, justifyContent: "center", backgroundColor: c.bg, padding: 24, gap: 12 },
    h: { color: c.text, fontSize: 28, fontWeight: "700", marginBottom: 16 },
    input: { backgroundColor: c.surface, color: c.text, borderRadius: radii.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
    err: { color: c.danger, fontSize: 13 },
    btn: { backgroundColor: c.accentStrong, borderRadius: radii.lg, paddingVertical: 14, alignItems: "center", marginTop: 4 },
    btnText: { color: c.onAccent, fontSize: 16, fontWeight: "600" },
  });
}
