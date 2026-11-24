import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/_api": { target: "http://127.0.0.1:3001", changeOrigin: false } },
  },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
});
