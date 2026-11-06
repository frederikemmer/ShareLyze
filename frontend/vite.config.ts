import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  root: resolve(import.meta.dirname),
  plugins: [react()],
  server: {
    allowedHosts: JSON.parse(process.env.SHARELYZE_DEV_HOSTS || "[]") as string[],
    proxy: {
      "/api": `http://127.0.0.1:${process.env.BACKEND_PORT || "3000"}`,
      "/r/": `http://127.0.0.1:${process.env.BACKEND_PORT || "3000"}`,
      "^/[a-zA-Z0-9][a-zA-Z0-9-]{0,63}(?:\\?.*)?$": `http://127.0.0.1:${process.env.BACKEND_PORT || "3000"}`,
    },
  },
  build: { outDir: "../dist/frontend", emptyOutDir: true },
});
