module.exports = function (api) {
  api.cache(true);

  return {
    presets: [["babel-preset-expo"]],

    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],

          alias: {
            "@/assets": "./assets",
            "@": "./src",
            "tailwind.config": "./tailwind.config.js",
          },
        },
      ],
      "react-native-worklets/plugin",
    ],
  };
};
