import { View, type StyleProp, type ViewStyle } from "react-native";
import { CONTENT_MAX, useLayout } from "@/theme/layout";

// Centered content column. On a phone this is a plain full-width View; on iPad it
// caps the width and centers, so text does not run 1300pt wide and forms do not
// stretch into unusable full-width fields.
//
// Wrap the CONTENT of a screen, not the screen itself — a background, header, or
// sticky bar should still span the full canvas.
export function ContentWidth({
  children,
  kind = "text",
  style,
}: {
  children: React.ReactNode;
  /** "text" for prose/forms/settings, "wide" for grids and dashboards. */
  kind?: keyof typeof CONTENT_MAX;
  style?: StyleProp<ViewStyle>;
}) {
  const { isWide } = useLayout();
  return (
    <View style={[{ width: "100%", flex: 1 }, isWide && { maxWidth: CONTENT_MAX[kind], alignSelf: "center" }, style]}>
      {children}
    </View>
  );
}

/**
 * contentContainerStyle for a scrolling list that should stay readable on iPad.
 * Lists cannot be wrapped in a centering View without losing virtualization, so
 * they cap the *content container* instead.
 */
export function useListContentStyle(kind: keyof typeof CONTENT_MAX = "text"): ViewStyle {
  const { isWide } = useLayout();
  return isWide ? { maxWidth: CONTENT_MAX[kind], width: "100%", alignSelf: "center" } : {};
}
