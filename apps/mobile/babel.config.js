module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated/track-player gesture handling: keep the
    // reanimated plugin LAST if/when reanimated is used in screens.
    plugins: [],
  };
};
