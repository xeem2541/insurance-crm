import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['react-bootstrap', 'bootstrap'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          export: ['jspdf', 'jspdf-autotable', 'xlsx'],
          calendar: ['moment', 'react-big-calendar'],
          motion: ['framer-motion', 'lucide-react']
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  }
})
