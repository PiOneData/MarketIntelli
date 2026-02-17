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
    port: 3000,        // match Docker EXPOSE port
    host: "0.0.0.0",
    allowedHosts: ['refexmi.pionedata.com', 'localhost'],  // allow these hostnames
    proxy: {
      "/api": {
        target: "http://backend:8000",     // use Docker service name
        changeOrigin: true,
      },
    },
  },
});
