import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["coverage", "dist", "node_modules", "playwright-report", "test-results"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2024,
        ...globals.node,
      },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["tests/**/*.js", "e2e/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
