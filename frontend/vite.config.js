// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  
  server: {
    port: 3000,
    host: true, // Listen on all addresses
    proxy: {
      '/api': {
        target: 'https://regal-pharma-backend.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy] ${req.method} ${req.url} -> ${options.target}${req.url}`);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Vite Proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
          });
          proxy.on('error', (err, req, res) => {
            console.error('[Vite Proxy Error]', err.message);
          });
        }
      }
    }
  },
  
  // Build configuration for Render
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  
  // Clear screen on restart
  clearScreen: false
})
