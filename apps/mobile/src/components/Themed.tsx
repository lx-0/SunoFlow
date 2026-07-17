import { forwardRef } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { fonts } from "@/theme/theme";

// Geist-themed Text/TextInput. RN custom fonts bake the weight into the family
// name, so `fontWeight` alone renders the iOS system font. These wrappers map
// the style's fontWeight to the matching Geist family at render time and strip
// fontWeight (leftover weights would synthesize a faux-bold on static fonts).
// Screens keep writing plain `fontWeight: "600"` styles; import Text/TextInput
// from here instead of react-native and every string renders in Geist.
// Styles that set both a Geist family and a fontWeight get the weight variant
// of that family; an explicit weighted family without fontWeight passes
// through untouched.
//
// Caveats:
// - NESTING: every Themed Text sets an explicit fontFamily, which overrides
//   RN's nested-<Text> font inheritance. Inner <Text> children that should be
//   mono (or non-regular) must set their family explicitly.
// - ANDROID (latent, app is iOS-only today): secureTextEntry EditTexts reset
//   custom fontFamily; apply the known workaround before shipping Android.

const SANS: Record<string, string> = {
  "100": fonts.sans,
  "200": fonts.sans,
  "300": fonts.sans,
  "400": fonts.sans,
  normal: fonts.sans,
  "500": fonts.sansMedium,
  "600": fonts.sansSemibold,
  "700": fonts.sansBold,
  bold: fonts.sansBold,
  "800": fonts.sansExtrabold,
  "900": fonts.sansExtrabold,
};

const MONO: Record<string, string> = {
  "100": fonts.mono,
  "200": fonts.mono,
  "300": fonts.mono,
  "400": fonts.mono,
  normal: fonts.mono,
  "500": fonts.monoMedium,
  "600": fonts.monoSemibold,
  "700": fonts.monoSemibold,
  bold: fonts.monoSemibold,
  "800": fonts.monoSemibold,
  "900": fonts.monoSemibold,
};

function geistStyle(style: StyleProp<TextStyle>): TextStyle {
  const flat: TextStyle = StyleSheet.flatten(style) ?? {};
  // Only remap an explicit family when the style ALSO declares a fontWeight —
  // a weighted family like fonts.monoSemibold set per the theme.ts convention
  // (family only, no fontWeight) must pass through untouched, not be
  // downgraded to the 400 variant.
  const weight = flat.fontWeight != null ? String(flat.fontWeight) : undefined;
  let family = flat.fontFamily;
  if (!family) {
    family = SANS[weight ?? "400"] ?? fonts.sans;
  } else if (weight && family.startsWith("GeistMono")) {
    family = MONO[weight] ?? family;
  } else if (weight && family.startsWith("Geist")) {
    family = SANS[weight] ?? family;
  }
  // Non-Geist families (none in the app today) pass through untouched.
  return { ...flat, fontFamily: family, fontWeight: undefined };
}

export const Text = forwardRef<RNText, TextProps>(function Text({ style, ...props }, ref) {
  return <RNText ref={ref} {...props} style={geistStyle(style)} />;
});

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={geistStyle(style)} />;
});
