import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],

  server: {
    // In development the SPA is served by Vite on :5173 while the API runs in
    // the compose stack behind Caddy on :80. Proxying keeps the app's fetch
    // paths identical in development and production, so no environment-
    // dependent base URL is needed anywhere in the source.
    proxy: {
      "/api": { target: "http://localhost", changeOrigin: true },
      "/ready": { target: "http://localhost", changeOrigin: true },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: true,
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
