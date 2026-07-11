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
      // 127.0.0.1 explícito (no "localhost"): si algún otro proceso local
      // (p.ej. un contenedor Docker de otro proyecto) escucha el mismo
      // puerto por IPv6, "localhost" puede resolver ahí y el proxy le
      // pega al servicio equivocado con un "socket hang up" confuso.
      '/api': {
        target: `http://127.0.0.1:${process.env.BACK_PORT ?? '8000'}`,
        changeOrigin: true,
      },
    },
  },
})
