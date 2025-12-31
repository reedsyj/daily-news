import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.ADMIN_EMPLOYEE_ID': JSON.stringify(env.ADMIN_EMPLOYEE_ID),
        'process.env.ADMIN_USERNAME': JSON.stringify(env.ADMIN_USERNAME)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
