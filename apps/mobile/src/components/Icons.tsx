import { View } from "react-native";

// Flat, dependency-free transport icons drawn with Views (border-triangle trick
// for the play/skip wedges, plain rects for bars). No emoji glyphs, no icon font
// or react-native-svg — so they render correctly with a JS reload, no rebuild.

type IconProps = { color?: string; size?: number };

function TriRight({ color, size }: { color: string; size: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: size * 0.55,
        borderBottomWidth: size * 0.55,
        borderLeftWidth: size * 0.9,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: color,
      }}
    />
  );
}

function TriLeft({ color, size }: { color: string; size: number }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: size * 0.55,
        borderBottomWidth: size * 0.55,
        borderRightWidth: size * 0.9,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: color,
      }}
    />
  );
}

export function PlayIcon({ color = "#fff", size = 22 }: IconProps) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: size * 0.6,
        borderBottomWidth: size * 0.6,
        borderLeftWidth: size,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: color,
        marginLeft: size * 0.18, // optical centering inside a round button
      }}
    />
  );
}

export function PauseIcon({ color = "#fff", size = 22 }: IconProps) {
  const bar = {
    width: size * 0.32,
    height: size * 1.2,
    backgroundColor: color,
    borderRadius: 1,
  };
  return (
    <View style={{ flexDirection: "row", gap: size * 0.28 }}>
      <View style={bar} />
      <View style={bar} />
    </View>
  );
}

export function SkipNextIcon({ color = "#fff", size = 22 }: IconProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.06 }}>
      <TriRight color={color} size={size} />
      <View style={{ width: size * 0.2, height: size * 1.1, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

export function SkipPrevIcon({ color = "#fff", size = 22 }: IconProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.06 }}>
      <View style={{ width: size * 0.2, height: size * 1.1, backgroundColor: color, borderRadius: 1 }} />
      <TriLeft color={color} size={size} />
    </View>
  );
}
