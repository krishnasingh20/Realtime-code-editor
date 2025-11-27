import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    strictPort: false,

    watch: {
      ignored: [
        "../backend/**",   // 👈 Ignore backend folder
        "../../backend/**",
        "**/backend/**",
        "**/*.env",        // 👈 Ignore all env files globally
        "!./.env",         // 👈 But ALLOW frontend .env inside frontend/
      ],
    },

    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },
});
