import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Respect Vercel Services binding SERVER_URL, falling back to local dev ports
  const serverTarget = process.env.SERVER_URL || env.SERVER_URL || 'http://localhost:5001';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: serverTarget,
          changeOrigin: true,
        },
        '/graphql': {
          target: serverTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: serverTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
