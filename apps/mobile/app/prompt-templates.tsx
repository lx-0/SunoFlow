import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchPromptTemplates, type PromptTemplate } from "@/api/prompt-templates";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Prompt Templates: browse built-in + saved prompts. These feed the Generate
// screen — tapping a row navigates to /generate with the template's prompt
// prefilled. Reloads on focus so templates saved elsewhere appear. Four states:
// loading / error / empty / data. Runtime is UNTESTED (headless env).
export default function PromptTemplatesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [templates, setTemplates] = useState<PromptTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setTemplates(null);
      setError(null);
      fetchPromptTemplates()
        .then(setTemplates)
        .catch((e: unknown) => {
          setError(
            e instanceof HttpError
              ? `Failed to load templates (HTTP ${e.status})`
              : "Network error",
          );
          console.error("[prompt-templates] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Prompt Templates" }} />
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>{error}</Text>
        </View>
      ) : !templates ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : templates.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.dim}>No templates yet.</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({ pathname: "/generate", params: { prompt: item.prompt } })
              }
            >
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.dim} numberOfLines={2}>
                  {item.description ?? item.prompt}
                </Text>
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
