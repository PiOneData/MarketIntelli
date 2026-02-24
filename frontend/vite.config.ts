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
    hmr: {
      // When accessed via a reverse proxy, tell the HMR client the correct
      // external port so the WebSocket connection can be established.
      // The frontend is exposed on host port 9002 via docker-compose.
      clientPort: 9002,
    },
    proxy: {
      "/api": {
        target: "http://backend:8000",     // use Docker service name
        changeOrigin: true,
      },
    },
  },
});
