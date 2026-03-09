import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'editor': ['@uiw/react-codemirror', '@codemirror/lang-python', '@codemirror/theme-one-dark'],
          'charts': ['recharts'],
          'utils': ['axios', 'zustand', 'clsx', 'diff', 'react-hot-toast', 'lucide-react', 'react-swipeable'],
        },
      },
    },
  },
})
