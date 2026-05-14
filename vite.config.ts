import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // 1. QUESTA RIGA È QUELLA CHE RISOLVE LO SCHERMO BIANCO
    base: './',

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    // --- AGGIUNTO QUESTO BLOCCO PER SBLOCCARE NGROK ---
    preview: {
      allowedHosts: true,
    },
    // --------------------------------------------------

    plugins: [react()],

    // 2. Ho migliorato la definizione delle variabili per evitare errori "process is not defined"
    define: {
      'process.env': {
        API_KEY: JSON.stringify(env.GEMINI_API_KEY),
        GEMINI_API_KEY: JSON.stringify(env.GEMINI_API_KEY)
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});