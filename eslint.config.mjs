import tseslint from "@typescript-eslint/eslint-plugin"
import tsparser from "@typescript-eslint/parser"
import prettier from "eslint-plugin-prettier"
import prettierConfig from "eslint-config-prettier"

export default [
  {
    ignores: ["dist/**", "bin/**", "**/*.js"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "error",
      "@typescript-eslint/explicit-function-return-type":
        "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-explicit-any": "off",
      curly: "error",
      "linebreak-style": ["error", "unix"],
      "no-console": [
        "error",
        {
          allow: ["warn", "error"],
        },
      ],
      quotes: [
        "error",
        "double",
        {
          avoidEscape: true,
        },
      ],
      "sort-vars": [
        "error",
        {
          ignoreCase: true,
        },
      ],
      strict: 0,
    },
  },
]
