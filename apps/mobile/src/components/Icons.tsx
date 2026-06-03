import { Heart, ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react-native";

// Thin adapter over lucide-react-native — the SAME icon set the web app uses, so
// the native UI matches 1:1 (DRY). Transport glyphs are filled (fill=color) to
// read as solid buttons; Heart fills only when favorited. Needs react-native-svg
// (native) — lands with the next dev build.

type IconProps = { color?: string; size?: number };

export function PlayIcon({ color = "#fff", size = 22 }: IconProps) {
  return <Play color={color} fill={color} size={size} />;
}

export function PauseIcon({ color = "#fff", size = 22 }: IconProps) {
  return <Pause color={color} fill={color} size={size} />;
}

export function SkipNextIcon({ color = "#fff", size = 22 }: IconProps) {
  return <SkipForward color={color} fill={color} size={size} />;
}

export function SkipPrevIcon({ color = "#fff", size = 22 }: IconProps) {
  return <SkipBack color={color} fill={color} size={size} />;
}

export function ShuffleIcon({ color = "#fff", size = 22 }: IconProps) {
  return <Shuffle color={color} size={size} strokeWidth={2.5} />;
}

export function RepeatIcon({ color = "#fff", size = 22, one = false }: IconProps & { one?: boolean }) {
  const Glyph = one ? Repeat1 : Repeat;
  return <Glyph color={color} size={size} strokeWidth={2.5} />;
}

export function QueueIcon({ color = "#fff", size = 22 }: IconProps) {
  return <ListMusic color={color} size={size} strokeWidth={2} />;
}

export function HeartIcon({ color = "#fff", size = 22, filled = false }: IconProps & { filled?: boolean }) {
  return <Heart color={color} fill={filled ? color : "transparent"} size={size} strokeWidth={2} />;
}
