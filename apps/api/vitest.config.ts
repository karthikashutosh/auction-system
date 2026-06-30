import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    include: ["src/**/*.test.ts"],

    exclude: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],

    setupFiles: ["./test/setup.ts"],

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules/", "test/", "**/*.test.ts"],
    },
  },
});
