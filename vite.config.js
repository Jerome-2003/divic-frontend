import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/divic-frontend/",
  build: { outDir: "dist" },
  server: {
    host: "0.0.0.0",
    port: process.env.PORT || 5173,
    allowedHosts: ["divic-frontend.onrender.com"],
  },
  preview: {
    host: "0.0.0.0",
    port: process.env.PORT || 4173,
    allowedHosts: ["divic-frontend.onrender.com"],
  },
});