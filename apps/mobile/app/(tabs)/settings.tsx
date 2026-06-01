import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { getApiKeyId, clearSession } from "@/auth/session";
import { apiDelete } from "@/api/client";

// STUB — M004-S04 fleshes this out. Sign-out revokes the API key server-side
// (so a stolen device key can't be reused) then clears the keychain.
export default function SettingsScreen() {
  return (
    <View style={styles.c}>
      <Pressable
        style={styles.btn}
        onPress={async () => {
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
        }}
      >
        <Text style={styles.btnText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f" },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: "#1c1c22" },
  btnText: { color: "#fff", fontSize: 15 },
});
