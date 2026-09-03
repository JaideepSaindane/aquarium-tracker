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
    "next-env.d.ts",
    // Standalone Node workbench (T-001/T-002), not part of the Next.js app.
    "tank-scan-harness/**",
    // Vendored third-party build output, served as-is — not our code.
    "public/sqlite/**",
    "drizzle/**",
    "src/db/migrations.generated.ts",
  ]),
]);

export default eslintConfig;
