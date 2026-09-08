import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "dist-worker/**",
    "work/**",
    "runtime/**",
    "scratch/**",
    "test-results*/**",
    "docs/user-audit-evidence/**",
    "docs/redesign-screenshots/**",
    ".openai/**",
    ".serena/**",
    "meeting-analysis-*/**",
    "output/**",
    "tmp/**",
    "vite.config.ts",
    "scripts/generate-briefs.mjs",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
