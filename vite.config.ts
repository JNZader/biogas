import path from 'path';
import { defineConfig, loadEnv } from 'vite';
// FIX: Import 'process' to provide correct Node.js type definitions and resolve the error on 'process.cwd()'.
import process from 'process';

export default defineConfig(({ mode }) => {
    // Carga las variables de entorno desde el archivo .env en la raíz del proyecto
    const env = loadEnv(mode, process.cwd(), '');
    return {
      define: {
        // Expone las variables de entorno de forma segura al código del cliente
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Define un alias para facilitar las importaciones desde la raíz del proyecto
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});