import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    // Configuraciones adicionales para optimizar el bundle
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    // Configuración de assets para mejor caching
    assetsDir: 'assets',
    sourcemap: false,
    // Configurar el threshold para inline assets
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          // Chunk principal de vendor (se cachea bien)
          'vendor': ['react', 'react-dom', 'react-router-dom', 'axios'],
          // ECharts separado (solo supervisores)
          'echarts': ['echarts', 'echarts-for-react'],
          // Utilidades de fecha juntas
          'date-utils': ['date-fns', 'date-fns-tz', 'moment-timezone'],
          // Librerías de exportación (uso ocasional)
          'export-libs': ['html2canvas', 'jspdf', 'xlsx-js-style']
        },
        // Configurar tamaños mínimos para evitar chunks muy pequeños
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.jsx', '').replace('.js', '') : 'chunk';
          return `js/[name]-[hash].js`;
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
