import { useVideoPlayer, VideoView } from "expo-video";
import type { StyleProp, ViewStyle } from "react-native";

// A song's music video rendered as a cover: muted (the song's audio plays via the
// expo-audio queue controller, so the video is visual-only), looping, autoplaying.
// Used in place of the static cover art when a song has a generated videoUrl.
export function VideoCover({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}
