import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: 'apps/client', plugins: [react()], build: { outDir: '../../dist', emptyOutDir: true }, server: { host: '0.0.0.0', port: 5173, strictPort: true, proxy: { '/multiplayer': { target: 'http://127.0.0.1:2567', ws: true, rewrite: path => path.replace(/^\/multiplayer/, '') } } } });
