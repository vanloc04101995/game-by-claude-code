import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works on any static host and inside Capacitor.
  base: './',
  server: { host: true },
});
