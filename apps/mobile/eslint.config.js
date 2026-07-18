// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  { ignores: ["dist/*", ".expo/*", "ios/*", "android/*"] },
  {
    // React-Compiler-era rules (eslint-plugin-react-hooks v6+) flag long-standing
    // patterns in src/playback + hooks. Surfaced as warnings until refactored.
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
