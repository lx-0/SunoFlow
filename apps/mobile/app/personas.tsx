import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchPersonas, type Persona } from "@/api/personas";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";

// Personas: the user's saved voice/style personas. Reloads on focus. Tapping a
// row jumps to the Generate screen prefilled with that persona, so a new song
// can be generated in its voice. Style is passed too when the persona carries
// one (Generate reads these params separately).
export default function PersonasScreen() {
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setPersonas(null);
      setError(null);
      fetchPersonas()
        .then(setPersonas)
        .catch((e: unknown) => {
          setError(
            e instanceof HttpError ? `Failed to load personas (HTTP ${e.status})` : "Network error",
          );
          console.error("[personas] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Personas" }} />
      {error ? (
        <View style={styles.centered}><Text style={styles.dim}>{error}</Text></View>
      ) : !personas ? (
        <View style={styles.centered}><ActivityIndicator color="#fff" /></View>
      ) : personas.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>No personas yet.</Text>
          <Text style={styles.dim}>Create one from a song to reuse its voice.</Text>
        </View>
      ) : (
        <FlatList
          data={personas}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/generate",
                  params: {
                    personaId: item.id,
                    ...(item.style ? { style: item.style } : {}),
                  },
                })
              }
            >
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.dim} numberOfLines={2}>{item.description}</Text>
                ) : item.style ? (
                  <Text style={styles.dim} numberOfLines={1}>{item.style}</Text>
                ) : null}
              </View>
              <ChevronRight color="#6a6a72" size={18} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: "#1c1c22",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  meta: { flex: 1, marginRight: 12 },
  title: { color: "#fff", fontSize: 16 },
  empty: { color: "#fff", fontSize: 15, marginBottom: 4 },
  dim: { color: "#9a9aa2", fontSize: 13, marginTop: 2 },
});
