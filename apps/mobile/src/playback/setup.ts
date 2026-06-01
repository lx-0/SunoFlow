import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  IOSCategory,
  IOSCategoryMode,
} from "react-native-track-player";

// One-time player setup. AVAudioSession `playback` category + the `audio`
// background mode (declared in app.json infoPlist) are what let audio survive a
// locked screen — the root-cause fix the PWA could not deliver. Capabilities
// drive which controls appear on the lock screen / Control Center.

let setupPromise: Promise<void> | null = null;

export function setupPlayer(): Promise<void> {
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    await TrackPlayer.setupPlayer({
      iosCategory: IOSCategory.Playback,
      iosCategoryMode: IOSCategoryMode.Default,
    });
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    });
  })();
  return setupPromise;
}
