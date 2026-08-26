module.exports = function babel(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [require("babel-preset-expo/build/plugins/expo-router-plugin").expoRouterBabelPlugin]
  };
};
