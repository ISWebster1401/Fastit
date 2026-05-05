/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/setup.js',
    css: false,
    exclude: ['node_modules', 'node_modules 2', 'dist'],
  },
  server: {
    port: parseInt(process.env.FRONT_PORT ?? '5174'),
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACK_PORT ?? '8000'}`,
        changeOrigin: true,
      },
    },
  },
})
