import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'gh-pages' ? '/qrcode/' : '/',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['signalqr.onrender.com'],
  },
  plugins: [react(), tailwindcss()],
}));
