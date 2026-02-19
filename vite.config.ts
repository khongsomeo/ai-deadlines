import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import yaml from "@modyfi/vite-plugin-yaml";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Dev server: proxy /api requests to API server on port 3001
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false, // Don't delete dist/ when building, so server files remain
  },
  define: {
    // Make environment variables available to the frontend
    // Usage: import.meta.env.VITE_API_URL
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    yaml({
      include: 'src/data/**/*.yml'
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
