module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 worklets transform. MUST be last. Enables shared-value /
    // gesture animations (e.g. queue drag-reorder). Requires a native rebuild +
    // `expo start -c` to take effect.
    plugins: ["react-native-worklets/plugin"],
  };
};
