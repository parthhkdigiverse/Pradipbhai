import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from the root .env file
  const rootDir = path.resolve(import.meta.dirname, '..')
  const env = loadEnv(mode, rootDir, '')
  const frontendPort = parseInt(env.FRONTEND_PORT || env.PORT || '5173', 10)

  return {
    plugins: [react(), tailwindcss()],
    envDir: rootDir,
    server: {
      port: frontendPort,
      host: true
    }
  }
})
