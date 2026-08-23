import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  {
    ignores: [".next/**", "dist/**", "out/**", "node_modules/**"],
  },
  {
    extends: [...next],
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);
