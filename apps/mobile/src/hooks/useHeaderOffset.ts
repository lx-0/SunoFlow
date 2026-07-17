import { useSafeAreaInsets } from "react-native-safe-area-context";

// Standard iOS navigation-bar content height. expo-router 56 does not export
// useHeaderHeight (vendored react-navigation), so KeyboardAvoidingView
// offsets approximate the header as safe-area top + nav bar. Single source —
// correct here if the header setup ever changes.
const NAV_BAR_HEIGHT = 44;

/**
 * keyboardVerticalOffset for screens rendered under the native Stack header.
 * Screens without a header (login) should pass 0 instead.
 */
export function useHeaderOffset(): number {
  const insets = useSafeAreaInsets();
  return insets.top + NAV_BAR_HEIGHT;
}
