import { View } from "react-native";
import { Tabs } from "expo-router";
import { Library, ListMusic, Heart, Clock, Settings } from "lucide-react-native";
import { MiniPlayer } from "@/components/MiniPlayer";

// Browse-first tab shell (iOS-v1 scope: Browse + Play + Playlists). A persistent
// MiniPlayer floats above the tab bar so playback stays controllable everywhere.
// Generate/Edit are deferred to a fast-follow milestone.
export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: "#0b0b0f" },
          headerTintColor: "#fff",
          tabBarStyle: { backgroundColor: "#0b0b0f", borderTopColor: "#1c1c22" },
          tabBarActiveTintColor: "#fff",
          tabBarInactiveTintColor: "#6a6a72",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Library", tabBarIcon: ({ color, size }) => <Library color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="playlists"
          options={{ title: "Playlists", tabBarIcon: ({ color, size }) => <ListMusic color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="favorites"
          options={{ title: "Favorites", tabBarIcon: ({ color, size }) => <Heart color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: "History", tabBarIcon: ({ color, size }) => <Clock color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: "Settings", tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
