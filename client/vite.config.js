import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // Read PORT from the root .env so the dev proxy always points at the API.
  const env = loadEnv(mode, "..", "");
  const api = `http://localhost:${env.PORT || 5000}`;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": api,
        "/rss.xml": api,
        "/sitemap.xml": api,
      },
    },
  };
});
