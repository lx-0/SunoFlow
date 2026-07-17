import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { View, Pressable, Animated, ScrollView, PanResponder, StyleSheet } from "react-native";
import { Text } from "@/components/Themed";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, type Href } from "expo-router";
import { useTheme } from "@/theme/ThemeContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { switchTo, isAtTabRoot } from "@/navigation";
import {
  Menu, Search, Plus, BookOpen, ListMusic, Heart, Clock, Layers, Globe, Sparkles, UserPlus, Wand2,
  LayoutGrid, Tag, Radio, Users, BarChart3, Bell, Settings, Lightbulb, TrendingUp, User,
  Drama, FileText, Palette, SlidersHorizontal, Combine, Upload, type LucideIcon,
} from "lucide-react-native";

// Custom slide-in sidebar (drawer) — mirrors the PWA's mobile nav (a translate-x
// overlay, not a nav-library drawer). Replaces the bottom tab bar so the growing
// feature set has room. Pure RN Animated (no reanimated/gesture-handler drawer),
// so it reloads without a native rebuild.

const WIDTH = 280;

// The five tab-root paths where the left-edge swipe opens the sidebar.
const TAB_ROOTS = new Set(["/", "/playlists", "/favorites", "/history", "/profile"]);

type Ctx = { open: boolean; openSidebar: () => void; closeSidebar: () => void };
const SidebarContext = createContext<Ctx>({ open: false, openSidebar: () => {}, closeSidebar: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, openSidebar: () => setOpen(true), closeSidebar: () => setOpen(false) }}>
      {children}
    </SidebarContext.Provider>
  );
}

/** Hamburger button for screen headers. */
export function SidebarToggle() {
  const { openSidebar } = useSidebar();
  const { colors } = useTheme();
  return (
    <Pressable hitSlop={12} onPress={openSidebar} style={styles.toggle}>
      <Menu color={colors.text} size={24} />
    </Pressable>
  );
}

type Item = { label: string; route: Href; Icon: LucideIcon };
type Section = { title?: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    items: [
      { label: "Search", route: "/search", Icon: Search },
      { label: "Generate", route: "/generate", Icon: Plus },
      { label: "Library", route: "/", Icon: BookOpen },
      { label: "Playlists", route: "/playlists", Icon: ListMusic },
      { label: "Favorites", route: "/favorites", Icon: Heart },
      { label: "History", route: "/history", Icon: Clock },
      { label: "Generations", route: "/generations", Icon: Layers },
    ],
  },
  {
    title: "Create",
    items: [
      { label: "Mashup", route: "/mashup", Icon: Combine },
      { label: "Upload", route: "/upload" as Href, Icon: Upload },
      { label: "Personas", route: "/personas", Icon: Drama },
      { label: "Prompt Templates", route: "/prompt-templates", Icon: FileText },
      { label: "Style Templates", route: "/style-templates", Icon: Palette },
      { label: "Presets", route: "/presets", Icon: SlidersHorizontal },
    ],
  },
  {
    title: "Discover",
    items: [
      { label: "Discover", route: "/discover", Icon: Globe },
      { label: "Inspire", route: "/inspire" as Href, Icon: Lightbulb },
      { label: "Insights", route: "/insights" as Href, Icon: TrendingUp },
      { label: "For You", route: "/recommendations", Icon: Sparkles },
      { label: "Radio", route: "/radio", Icon: Radio },
      { label: "Following", route: "/feed", Icon: UserPlus },
      { label: "Smart Playlists", route: "/smart-playlists", Icon: Wand2 },
      { label: "Collections", route: "/collections", Icon: LayoutGrid },
      { label: "Tags", route: "/tags", Icon: Tag },
    ],
  },
  {
    title: "You",
    items: [
      { label: "My Profile", route: "/profile" as Href, Icon: User },
      { label: "People You Follow", route: "/following-people", Icon: Users },
      { label: "Your Stats", route: "/stats", Icon: BarChart3 },
      { label: "Notifications", route: "/notifications", Icon: Bell },
      { label: "Settings", route: "/settings", Icon: Settings },
    ],
  },
];

export function Sidebar() {
  const { open, openSidebar, closeSidebar } = useSidebar();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  // Edge-swipe to open: a thin left strip claims the gesture only on a clear
  // rightward drag (taps + vertical scrolls pass through to the screen below).
  // Only offered on the five tab roots — on pushed screens the same edge
  // gesture is the native swipe-back, and the two must not fight. The
  // isAtTabRoot() check covers pushed COPIES of tab-root routes (e.g. a
  // profile pushed from a notification), whose pathname alone would collide.
  const atTabRoot = TAB_ROOTS.has(pathname) && isAtTabRoot();
  const edgePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => g.dx > 6 && Math.abs(g.dy) < 25,
      onPanResponderRelease: (_e, g) => {
        if (g.dx > 36) openSidebar();
      },
    }),
  ).current;

  useEffect(() => {
    if (open) setMounted(true);
    Animated.timing(anim, { toValue: open ? 1 : 0, duration: reduceMotion ? 0 : 220, useNativeDriver: true }).start(() => {
      if (!open) setMounted(false);
    });
  }, [open, anim, reduceMotion]);

  // When closed, only the left edge-swipe catcher is present (tab roots only).
  if (!mounted) {
    if (!atTabRoot) return null;
    return <View style={[styles.edge, { top: insets.top + 44 }]} {...edgePan.panHandlers} />;
  }

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-WIDTH, 0] });
  const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  function go(route: Href) {
    closeSidebar();
    switchTo(route, pathname);
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
      </Animated.View>

      <Animated.View style={[styles.panel, { backgroundColor: colors.surface, borderRightColor: colors.border, width: WIDTH, paddingTop: insets.top + 12, transform: [{ translateX }] }]}>
        <Text style={[styles.brand, { color: colors.text }]}>SunoFlow</Text>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {SECTIONS.map((section, si) => (
            <View key={si} style={styles.section}>
              {section.title ? <Text style={[styles.sectionTitle, { color: colors.textFaint }]}>{section.title}</Text> : null}
              {section.items.map((it) => (
                <Pressable key={it.label} style={styles.row} onPress={() => go(it.route)}>
                  <it.Icon color={colors.textDim} size={20} />
                  <Text style={[styles.label, { color: colors.text }]}>{it.label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  edge: { position: "absolute", left: 0, bottom: 0, width: 22 },
  backdrop: { backgroundColor: "#000" },
  // Color props (bg/border/text) are applied inline from the theme at each usage
  // site; these style objects intentionally carry no hardcoded colors.
  panel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  brand: { fontSize: 20, fontWeight: "800", paddingHorizontal: 12, marginBottom: 12 },
  scroll: { flex: 1 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 12, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  label: { fontSize: 16 },
});
