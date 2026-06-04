import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { HttpError } from "@/api/client";
import { fetchStyleTemplates, type StyleTemplate } from "@/api/style-templates";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";

// Style Templates: browse the user's saved style presets. These feed the
// Generate screen — tapping a row navigates to /generate with the template's
// style (the `tags` string) prefilled. Reloads on focus so templates saved
// elsewhere appear. Four states: loading / error / empty / data. Runtime is
// UNTESTED (headless env).
export default function StyleTemplatesScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [templates, setTemplates] = useState<StyleTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setTemplates(null);
      setError(null);
      fetchStyleTemplates()
        .then(setTemplates)
        .catch((e: unknown) => {
          setError(
            e instanceof HttpError
              ? `Failed to load style templates (HTTP ${e.status})`
              : "Network error",
          );
          console.error("[style-templates] load failed", e);
        });
    }, []),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Style Templates" }} />
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
          <Text style={styles.dim}>No style templates yet. Save one from a song&apos;s style.</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({ pathname: "/generate", params: { style: item.tags } })
              }
            >
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.dim} numberOfLines={2}>
                  {item.tags}
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
