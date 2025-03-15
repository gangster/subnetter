// @ts-check
const globals = require("globals");

module.exports = {
  env: {
    node: true,
    jest: true
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "commonjs",
    project: "./tsconfig.eslint.json"
  },
  plugins: [
    "@typescript-eslint"
  ],
  rules: {
    "no-console": ["warn", { allow: ["info", "warn", "error"] }],
    "no-debugger": "warn",
    "no-duplicate-imports": "error",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/no-empty-function": "warn",
    "@typescript-eslint/ban-ts-comment": "warn"
  },
  overrides: [
    {
      files: ["**/*.test.ts"],
      rules: {
        "no-console": "off",
        "@typescript-eslint/no-explicit-any": "off"
      }
    },
    {
      files: ["packages/cli/**/*.ts"],
      rules: {
        "no-console": "off"
      }
    }
  ],
  ignorePatterns: [
    "dist/**",
    "coverage/**",
    "node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/*.d.ts"
  ]
};