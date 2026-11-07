import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind IPv4 explicitly: on macOS "localhost" may resolve to ::1 only,
    // and the mise daemon readiness check probes 127.0.0.1.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});
