import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const __dirname = import.meta.dirname
const BACKEND_PORT = process.env.BACKEND_PORT || '8002'
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT || '5173', 10)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: FRONTEND_PORT,
    host: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${BACKEND_PORT}`,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
