
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    define: {
      // Explicitly define process.env.API_KEY to ensure it's replaced by the string value
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
      // Also provide the object for other usages
      'process.env': {
        ...process.env,
        API_KEY: env.VITE_GEMINI_API_KEY,
        VITE_API_URL: env.VITE_API_URL,
        NODE_ENV: JSON.stringify(mode),
      }
    }
  };
});