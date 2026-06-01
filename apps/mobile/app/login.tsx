import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { API_BASE_URL } from "@/api/client";
import { setSession } from "@/auth/session";

// Login → POST /api/v1/auth/token (M004-S02-T01) → store the returned API key.
// Every branch ends in visible feedback (error text or redirect).
export default function LoginScreen() {
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
      router.replace("/(tabs)");
    } catch (e) {
      setError("Network error — check your connection.");
      console.error("[login] failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.c}>
      <Text style={styles.h}>SunoFlow</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#6a6a72"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#6a6a72"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Pressable style={styles.btn} disabled={busy} onPress={submit}>
        {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Sign in</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: "center", backgroundColor: "#0b0b0f", padding: 24, gap: 12 },
  h: { color: "#fff", fontSize: 28, fontWeight: "700", marginBottom: 16 },
  input: { backgroundColor: "#15151b", color: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  err: { color: "#ff6b6b", fontSize: 13 },
  btn: { backgroundColor: "#fff", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnText: { color: "#000", fontSize: 16, fontWeight: "600" },
});
