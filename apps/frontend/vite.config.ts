import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev proxy targets the backend (NestJS) which mirrors the original app.py
// routes: /api/*, /logo, /favicon.* . All app fetches are same-origin
// relative paths so this proxy makes `pnpm dev` work end-to-end.
const BACKEND = 'http://localhost:8080';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/logo': { target: BACKEND, changeOrigin: true },
      '/favicon.ico': { target: BACKEND, changeOrigin: true },
      '/favicon.png': { target: BACKEND, changeOrigin: true },
    },
  },
});
