import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "next-env.d.ts"]),
  {
    // The original app code is loosely typed and routes in-page with pushState.
    // Tighten these as the files are rewritten.
    files: ["app/ui.tsx", "app/api/route.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@next/next/no-html-link-for-pages": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
]);
