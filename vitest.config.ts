import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
  resolve: {
    // Allow importing TypeScript sources using explicit ".js" extensions,
    // which is required by the Node16 module resolution used at build time.
    extensions: [".ts", ".js", ".json"],
  },
});
