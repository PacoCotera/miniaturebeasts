import { defineConfig } from "vite";

const base = process.env.CRITTER_BENCH_BASE ?? "/";
if (!["/", "/genome/"].includes(base)) throw new Error("CRITTER_BENCH_BASE must be / or /genome/");

export default defineConfig({
  base,
  esbuild: { jsx: "automatic" },
  build: { outDir: "dist", emptyOutDir: true },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4381",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (request) =>
            request.setHeader("origin", "http://127.0.0.1:4381"),
          );
        },
      },
    },
  },
});
