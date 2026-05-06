import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: ["tests/e2e/**", "tests/accessibility/**", "node_modules/**"],
    coverage: {
      reporter: ["text", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}", "src/**/*.{js,jsx}"],
      exclude: [
        "app/root.tsx",
        "app/entry.server.tsx",
        "app/routes/**",
        "src/main.jsx",
      ],
    },
  },
});
