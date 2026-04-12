import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  base: '/vmo-logs',
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist', // ← changed from 'build' to 'dist'
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
  },
  server: {
    port: 3000,
  },
});