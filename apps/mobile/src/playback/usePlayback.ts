import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, type PlaybackSnapshot } from "@/playback/audio";

// React binding for the playback controller's external store.
export function usePlayback(): PlaybackSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
