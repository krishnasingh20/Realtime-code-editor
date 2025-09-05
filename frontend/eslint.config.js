import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import json from "eslint-plugin-json";
import markdown from "eslint-plugin-markdown";

export default [
  js.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      json,
      markdown,
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "react/react-in-jsx-scope": "off", // Not needed in React 18+
      "react/prop-types": "off", // Optional for TypeScript projects
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      semi: ["error", "always"],
      quotes: ["error", "double"],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
