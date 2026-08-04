import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@payload-config": path.resolve(__dirname, "payload.config.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    pool: "forks",
    maxWorkers: 1,
  },
});
