import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'chart.js',
      'react-chartjs-2',
      'html5-qrcode'
    ],
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ui-vendor': ['lucide-react']
        }
      }
    },
    // Suppress warnings about server-only packages
    chunkSizeWarningLimit: 1000,
  },
  // Prevent Vite from trying to bundle server-only packages
  ssr: {
    noExternal: []
  },
  // Exclude server-only packages from client bundle
  resolve: {
    alias: {
      // These packages should only be used in Netlify functions
      'firebase-admin': 'empty-module',
      'twilio': 'empty-module',
      'openai': 'empty-module',
      'node-mailjet': 'empty-module'
    }
  },
  // Add proxy for Netlify functions with better error handling
  server: {
    port: 5173,
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err.message);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ 
                error: 'Netlify functions server not available. Make sure to run: npm run dev' 
              }));
            }
          });
        }
      },
    },
  },
});