import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [           // DNS-Rebinding 白名单
      'offerr.net',
      'www.offerr.net',
      'offerist.cn',
      'www.offerist.cn',
      '13.248.237.231',
      '166.117.151.221'
    ],
    hmr: {
      host: 'offerr.net',     // 浏览器看到的主机名（或 GA IP）
      clientPort: 80,         // 因为外层反代监听 80/443
      protocol: 'ws'
    }
  },
  build: { outDir: 'dist' }
});

