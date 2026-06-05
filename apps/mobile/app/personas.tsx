import { useCallback, useState } from "react";
import {
  View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Alert, ActionSheetIOS,
} from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { AlertCircle, ChevronRight, UserSquare2 } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchPersonas, deletePersona, type Persona } from "@/api/personas";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Personas: the user's saved voice/style personas. Reloads on focus. Tapping a
// row jumps to the Generate screen prefilled with that persona, so a new song
// can be generated in its voice. Style is passed too when the persona carries
// one (Generate reads these params separately).
export default function PersonasScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchPersonas()
      .then(setPersonas)
      .catch((e: unknown) => {
        setError(
          e instanceof HttpError ? `Failed to load personas (HTTP ${e.status})` : "Network error",
        );
        console.error("[personas] load failed", e);
      });
  }, []);

  useFocusEffect(useCallback(() => { setPersonas(null); load(); }, [load]));

  function openInGenerate(p: Persona) {
    // Generate's persona picker matches on the Suno-side personaId (p.personaId),
    // not the DB row id, so we hand it the same identifier it compares against.
    const pid = p.personaId ?? undefined;
    router.push({
      pathname: "/generate",
      params: {
        ...(pid ? { personaId: pid } : {}),
        ...(p.style ? { style: p.style } : {}),
      },
    });
  }

  function confirmDelete(p: Persona) {
    Alert.alert("Delete persona?", `Delete "${p.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deletePersona(p.id); load(); }
          catch (e) { Alert.alert("Couldn't delete", "Please try again."); console.error("[personas] delete failed", e); }
        },
      },
    ]);
  }

  function rowActions(p: Persona) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: p.name,
        options: ["Use in Generate", "Delete", "Cancel"],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (i) => {
        if (i === 0) openInGenerate(p);
        else if (i === 1) confirmDelete(p);
      },
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Personas" }} />
      {error ? (
        <EmptyState tone="error" Icon={AlertCircle} title={error} />
      ) : !personas ? (
        <View style={styles.centered}><ActivityIndicator color={colors.text} /></View>
      ) : personas.length === 0 ? (
        <EmptyState
          Icon={UserSquare2}
          title="No personas yet"
          subtitle="Create one from a song to reuse its voice."
        />
      ) : (
        <FlatList
          data={personas}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => rowActions(item)}>
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.dim} numberOfLines={2}>{item.description}</Text>
                ) : item.style ? (
                  <Text style={styles.dim} numberOfLines={1}>{item.style}</Text>
                ) : null}
              </View>
              <ChevronRight color={colors.textFaint} size={18} />
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
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomColor: c.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    meta: { flex: 1, marginRight: 12 },
    title: { color: c.text, fontSize: 16 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
  });
}
