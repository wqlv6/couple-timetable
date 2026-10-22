import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 使用相对路径 base，方便部署到任意子路径（GitHub Pages / Vercel 等）
export default defineConfig({
  plugins: [react()],
  base: './',
});
