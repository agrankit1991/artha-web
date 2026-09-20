import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    // `@/` is shadcn's convention and what its generated components import
    // by. Declared here and in tsconfig so the bundler and the type checker
    // agree about it.
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },

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

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/test-setup.ts",
        "src/**/*.test.{ts,tsx}",
        // Fixtures and stubs for the tests, not code that ships.
        "src/test/**",
        // Vendored: shadcn components are copied in rather than installed,
        // and they are upstream's code, not ours. Testing a thin wrapper
        // over a Radix primitive measures the library. What we build *on*
        // them, in src/components outside this folder, is covered normally.
        "src/components/ui/**",
      ],

      // Thresholds sit at 95%: every module ships with tests that exercise its
      // failure paths, not just the happy one. The bar only ever goes up; lowering
      // it to make a build pass turns the gate into decoration.
      thresholds: {
        lines: 97,
        branches: 97,
        functions: 97,
        statements: 97,
      },
    },
  },
});
