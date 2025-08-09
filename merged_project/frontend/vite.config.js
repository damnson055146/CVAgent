// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // 确保端口正确
  },
  build: {
    outDir: 'dist', // 输出目录
  },
});
