import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/health': 'http://localhost:8855',
      '/dbs': 'http://localhost:8855',
      '/upload': 'http://localhost:8855',
      '/documents': 'http://localhost:8855',
      '/query': 'http://localhost:8855',
      '/settings': 'http://localhost:8855',
      '/stats': 'http://localhost:8855',
      '/visualize': 'http://localhost:8855',
    },
  },
  build: {
    outDir: 'dist',
  },
})