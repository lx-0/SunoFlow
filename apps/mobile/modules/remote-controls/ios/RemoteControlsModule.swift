import ExpoModulesCore
import MediaPlayer

// expo-audio's lock-screen widget only supports play/pause/seek — no next/prev
// track. This module enables the MPRemoteCommandCenter next/previous track
// commands and forwards each press to JS, where our queue controller advances.
//
// `enable()` is idempotent and is re-called per track (after expo-audio sets up
// its own now-playing/command-center), to re-assert next/prev + hide the
// skip-interval (±s) buttons so iOS shows track-skip instead.
public class RemoteControlsModule: Module {
  private var targetsRegistered = false

  public func definition() -> ModuleDefinition {
    Name("RemoteControls")

    Events("onRemoteNext", "onRemotePrevious")

    Function("enable") {
      let center = MPRemoteCommandCenter.shared()

      center.nextTrackCommand.isEnabled = true
      center.previousTrackCommand.isEnabled = true
      // Hide ±seconds so the lock screen shows next/prev track instead.
      center.skipForwardCommand.isEnabled = false
      center.skipBackwardCommand.isEnabled = false

      if !self.targetsRegistered {
        self.targetsRegistered = true
        center.nextTrackCommand.addTarget { [weak self] _ in
          self?.sendEvent("onRemoteNext")
          return .success
        }
        center.previousTrackCommand.addTarget { [weak self] _ in
          self?.sendEvent("onRemotePrevious")
          return .success
        }
      }
    }
  }
}
