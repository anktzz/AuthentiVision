import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// dev-mode proxy to the FastAPI backend on :8000; unused in production, where FastAPI serves the built frontend directly
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/detect": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
