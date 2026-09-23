import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = typeof __dirname !== 'undefined' 
  ? __dirname 
  : path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from the root .env file
  const rootDir = path.resolve(currentDir, '..')
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
