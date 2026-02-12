import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 9002,        // frontend port
    host: "0.0.0.0",
    allowedHosts: ['refexmi.pionedata.com'],  // allow this hostname
    proxy: {
      "/api": {
        target: "http://127.0.0.1:9001",     // backend port
        changeOrigin: true,
      },
    },
  },
});
