import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  // Dev proxy manzili .env dagi VITE_API_BASE_URL dan olinadi —
  // lokal backend (http://127.0.0.1:8000) yoki prod API bo'lishi mumkin
  const proxyTarget = (env.VITE_API_BASE_URL || 'https://api.avtoyon.uz').replace(/\/$/, '')
  const proxySecure = proxyTarget.startsWith('https://')

  return {
  plugins: [react()],
  optimizeDeps: {
    // Lazy sahifalar ortidagi kutubxonalarni ham oldindan bundle qilamiz —
    // aks holda birinchi navigatsiyada Vite qayta optimizatsiya qilib sahifani reload qiladi
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-i18next',
      'i18next',
      'i18next-browser-languagedetector',
      'axios',
      'zustand',
      'js-cookie',
      'react-hot-toast',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      '@radix-ui/react-select',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-toast',
      'recharts',
      'jsbarcode',
      '@zxing/library',
      '@zxing/browser',
      'react-qr-barcode-scanner',
    ],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Vendor kodni alohida chunk'larga ajratamiz: brauzer keshini yaxshilaydi
        // va boshlang'ich chunk'ni kichraytiradi. Rolldown'da funksiya-ko'rinishdagi
        // manualChunks umumiy modullarni (react, clsx) guruhlarga DUBLIKAT qilib,
        // lazy chunk'larni entry'ga eager bog'lab qo'yadi — shuning uchun native
        // advancedChunks ishlatamiz: modul faqat birinchi mos guruhga tushadi.
        advancedChunks: {
          groups: [
            // Mayda umumiy modullar birinchi turadi — aks holda Rolldown ularni
            // recharts bog'liqligi sifatida 'charts' guruhiga qo'shib, charts'ni
            // eager qilib yuboradi (Button/i18n ham clsx/use-sync-external-store ishlatadi)
            { name: 'vendor-utils', test: /node_modules[\\/](clsx|react-is|use-sync-external-store|tiny-invariant)[\\/]/ },
            // use-sync-external-store va react-is ham shu yerda: ular eager kod
            // (zustand, react-i18next) va lazy kod (recharts) o'rtasida umumiy —
            // charts guruhiga tushib qolsa, charts eager yuklanib qoladi.
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler|use-sync-external-store|react-is)[\\/]/ },
            { name: 'scanner', test: /node_modules[\\/](@zxing|react-qr-barcode-scanner|react-webcam)[\\/]/ },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|decimal\.js-light|@reduxjs|redux|redux-thunk|react-redux|reselect|immer|internmap)[\\/]/ },
            { name: 'barcode', test: /node_modules[\\/]jsbarcode[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router[\\/]/ },
            { name: 'i18n', test: /node_modules[\\/](i18next|react-i18next|i18next-browser-languagedetector)[\\/]/ },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      'js-cookie': path.resolve(__dirname, 'node_modules/js-cookie/dist/js.cookie.mjs'),
      '@zxing/browser': path.resolve(__dirname, 'node_modules/@zxing/browser/esm/index.js'),
      '@zxing/library': path.resolve(__dirname, 'node_modules/@zxing/library/esm/index.js'),
      'react-qr-barcode-scanner': path.resolve(
        __dirname,
        'node_modules/react-qr-barcode-scanner/dist/index.js',
      ),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    warmup: {
      // Birinchi so'rovdan oldin asosiy modullarni transform qilib qo'yamiz
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/components/shared/MainLayout.tsx',
        './src/features/dashboard/DashboardPage.tsx',
        './src/features/auth/LoginPage.tsx',
      ],
    },
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxySecure,
      },
      '/media': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxySecure,
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  }
})
