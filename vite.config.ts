import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@services': path.resolve(__dirname, './services')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
});
