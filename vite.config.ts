import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
  resolve: {
    alias: {
      'js-cookie': path.resolve(__dirname, 'node_modules/js-cookie/dist/js.cookie.mjs'),
      '@zxing/browser': path.resolve(__dirname, 'node_modules/@zxing/browser/esm/index.js'),
      '@zxing/library': path.resolve(__dirname, 'node_modules/@zxing/library/esm/index.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
})
