import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure all assets use relative paths
  root: 'renderer',
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    outDir: '../renderer/dist',
    emptyOutDir: true,
    assetsDir: 'assets', // Keep assets in a known directory
    rollupOptions: {
      input: path.join(__dirname, 'renderer', 'index.html'),
      output: {
        // Ensure all assets use relative paths
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      port: 5173,
    },
    fs: {
      // Allow importing files from project root (outside of 'renderer' root)
      allow: [path.resolve(__dirname)],
    },
    watch: {
      usePolling: true,
      interval: 100
    },
  },
});
