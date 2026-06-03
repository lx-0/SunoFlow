import { requireNativeModule, type EventSubscription } from "expo-modules-core";

// Native module (iOS) wiring MPRemoteCommandCenter next/previous track commands
// to JS events. See ios/RemoteControlsModule.swift. Requires a native rebuild
// (expo prebuild + run:ios) — until then requireNativeModule throws, so we guard
// it and no-op rather than crashing the JS app.
interface RemoteControlsNative {
  enable(): void;
  addListener(name: string, cb: () => void): EventSubscription;
}

let native: RemoteControlsNative | null = null;
try {
  native = requireNativeModule<RemoteControlsNative>("RemoteControls");
} catch {
  native = null; // native module not built into this binary yet
}

export function enableRemoteControls(): void {
  native?.enable();
}

export function onRemoteNext(cb: () => void): EventSubscription | undefined {
  return native?.addListener("onRemoteNext", cb);
}

export function onRemotePrevious(cb: () => void): EventSubscription | undefined {
  return native?.addListener("onRemotePrevious", cb);
}
