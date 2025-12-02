// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Detect environment
const isProduction = process.env.NODE_ENV === 'production'
const backendUrl = isProduction 
  ? 'https://regal-pharma-backend.onrender.com'
  : 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  base: '/',
  
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: !isProduction, // false for local, true for production
        rewrite: (path) => path
      }
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
