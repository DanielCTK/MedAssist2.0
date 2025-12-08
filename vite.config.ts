import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Experience #4: Polyfill process.env for libraries and consistency
      // Maps VITE_GEMINI_API_KEY to process.env.API_KEY if needed, or keeps standard access
      'process.env': {
        ...process.env,
        API_KEY: env.VITE_GEMINI_API_KEY,
        VITE_API_URL: env.VITE_API_URL,
        NODE_ENV: JSON.stringify(mode),
      },
      // Also ensure VITE_ variables are available globally if needed
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
    }
  };
});