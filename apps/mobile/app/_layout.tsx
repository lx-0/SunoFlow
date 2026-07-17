import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
} from "@expo-google-fonts/geist-mono";
import { Pressable } from "react-native";
import { X } from "lucide-react-native";
import { getApiKey } from "@/auth/session";
import { SidebarProvider, Sidebar } from "@/components/Sidebar";
import { PromptProvider } from "@/components/PromptSheet";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";
import { fonts } from "@/theme/theme";

// Root layout. ThemeProvider supplies colors app-wide (dark/light, persisted).
// Gates the app on a stored API key — no key → login.
export default function RootLayout() {
  // Geist Sans (chrome) + Geist Mono (user content). Gate first paint on load so
  // text doesn't flash in the system font; proceed anyway on error (system-font
  // fallback) rather than hanging the app.
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    Geist_800ExtraBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <ThemeProvider>
      <PromptProvider>
        <RootNav />
      </PromptProvider>
    </ThemeProvider>
  );
}

// Explicit close affordance for the player-contextual sheets (swipe-down also
// dismisses; the button makes the exit discoverable).
function SheetClose() {
  const { colors } = useTheme();
  return (
    <Pressable hitSlop={10} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
      <X color={colors.textDim} size={22} />
    </Pressable>
  );
}

// Root stack: the tab navigator (which owns the bottom tab bar + mini-player),
// login, and the player layer. The Now-Playing screen is a headerless native
// modal (swipe-down to dismiss); its contextual sheets (queue, lyrics,
// add-to-playlist) stack as further modals above it.
function RootNav() {
  const { colors, scheme } = useTheme();

  useEffect(() => {
    getApiKey()
      .then((key) => {
        if (!key) router.replace("/login");
      })
      .catch((e) => console.error("[auth] key check failed", e));
  }, []);

  return (
    <SidebarProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.sansSemibold },
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="queue" options={{ presentation: "modal", headerRight: () => <SheetClose /> }} />
        <Stack.Screen name="lyrics" options={{ presentation: "modal", headerRight: () => <SheetClose /> }} />
        <Stack.Screen name="add-to-playlist" options={{ presentation: "modal", headerRight: () => <SheetClose /> }} />
      </Stack>
      <Sidebar />
    </SidebarProvider>
  );
}
