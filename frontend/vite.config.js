// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 🔥 CRUCIAL FOR SPA ON RENDER
  base: '/',
  
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  
  // 🔥 CRUCIAL FOR PRODUCTION BUILD
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for smaller bundle
    rollupOptions: {
      output: {
        // Keep chunk names consistent
        manualChunks: undefined
      }
    }
  },
  
  // 🔥 IMPORTANT FOR SPA ROUTING
  server: {
    historyApiFallback: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  
  // 🔥 OPTIMIZE FOR RENDER
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
