import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Cast process to any to avoid TS error about missing cwd() method on Process type
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist', // Standard output directory for Vite
    },
    define: {
      // Polyfill process.env.API_KEY for the Gemini Service
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});