// Single source for the product's name and public web origin.
//
// Both are expected to change: the "Suno" in SunoFlow is another company's mark,
// so name and domain will move at some point. Nothing user-visible may hardcode
// either — import from here, or read APP_NAME/APP_URL through the env vars below.
//
// EXPO_PUBLIC_* values are inlined by Metro at bundle time, so a rename is a
// config change plus a rebuild, not a code change.
//
// Deliberately NOT parameterized: `ios.bundleIdentifier` in app.json. The bundle
// id is invisible to users but it IS the app's identity — changing it forces a
// delete-and-reinstall on every device (the App Store refuses to update across a
// different application-identifier) and cuts the TestFlight history. It stays
// app.sunoflow.mobile through any rename.

/** Product name as shown to users. Also the native app name via app.json `name`. */
export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? "SunoFlow";

/**
 * Public web origin. Doubles as the API base — the native app talks to the same
 * deployment the website runs on. Override per environment with
 * EXPO_PUBLIC_SUNOFLOW_BASE_URL (e.g. a LAN address during development).
 */
export const APP_URL = process.env.EXPO_PUBLIC_SUNOFLOW_BASE_URL ?? "https://sunoflow.app";
