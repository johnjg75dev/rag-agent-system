import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/health': 'http://localhost:8000',
      '/dbs': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/documents': 'http://localhost:8000',
      '/query': 'http://localhost:8000',
      '/settings': 'http://localhost:8000',
      '/stats': 'http://localhost:8000',
      '/visualize': 'http://localhost:8000',
    },
  },
  build: {
    outDir: 'dist',
  },
})