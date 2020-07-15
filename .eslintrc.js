module.exports = {
  root: true,
  extends: [
    "prettier",
  ],
  rules: {
    "prettier/prettier": ["error", {
      "singleQuote": true,
      "trailingComma": "es5",
      "bracketSpacing": true, // for some reason need to specify the default value
      "jsxBracketSameLine": false, // for some reason need to specify the default value
    }],
  },
  plugins: [
    "prettier",
  ],
};
