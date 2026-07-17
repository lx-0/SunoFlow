import { Stack } from "expo-router";
import { SidebarToggle } from "@/components/Sidebar";
import { useTheme } from "@/theme/ThemeContext";

// One Stack per tab, instantiated once per group segment. Every section and
// detail screen lives in this shared group, so it can be pushed onto whichever
// tab's stack the user is currently in — Back always returns to where they
// actually came from, and iOS swipe-back works everywhere. Route files set
// their own titles via an inline <Stack.Screen>; declared here are only the
// five tab anchors (hamburger instead of a back button) and screens without
// inline options.
export const unstable_settings = {
  library: { anchor: "index" },
  playlists: { anchor: "playlists" },
  favorites: { anchor: "favorites" },
  history: { anchor: "history" },
  profile: { anchor: "profile" },
};

const HOMES = [
  { name: "index", title: "Library" },
  { name: "playlists", title: "Playlists" },
  { name: "favorites", title: "Favorites" },
  { name: "history", title: "History" },
  { name: "profile", title: "Profile" },
] as const;

const ANCHOR_BY_SEGMENT: Record<string, string> = {
  "(library)": "index",
  "(playlists)": "playlists",
  "(favorites)": "favorites",
  "(history)": "history",
  "(profile)": "profile",
};

export default function TabStackLayout({ segment }: { segment: string }) {
  const { colors } = useTheme();
  const anchor = ANCHOR_BY_SEGMENT[segment];
  // Declare this segment's anchor FIRST: react-navigation takes routeNames[0]
  // of the declared screens as the stack's initial route, and declared screens
  // are not re-sorted by the unstable_settings anchor. Without this, every tab
  // stack would root at Library when mounted without explicit screen params.
  const anchorHome = HOMES.find((h) => h.name === anchor);
  const orderedHomes = anchorHome ? [anchorHome, ...HOMES.filter((h) => h !== anchorHome)] : [...HOMES];
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      {orderedHomes.map((h) => (
        <Stack.Screen
          key={h.name}
          name={h.name}
          options={{
            title: h.title,
            ...(h.name === anchor ? { headerLeft: () => <SidebarToggle /> } : {}),
          }}
        />
      ))}
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
