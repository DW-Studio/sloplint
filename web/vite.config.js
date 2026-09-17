import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ command }) => ({
  // GitHub Pages 部署在 /sloplint/ 子路径下，build 时用子路径，本地开发用根路径
  base: command === 'build' ? '/sloplint/' : '/',
  resolve: {
    alias: {
      '@rules': fileURLToPath(new URL('../rules', import.meta.url)),
    },
  },
}));
