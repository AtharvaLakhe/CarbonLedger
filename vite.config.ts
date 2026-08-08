import { spawn } from 'node:child_process'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Boots the registry node alongside the dev server so `npm run dev` is the only command. */
function registryNode(): Plugin {
  return {
    name: 'registry-node',
    apply: 'serve',
    configureServer() {
      const child = spawn(process.execPath, ['server/index.mjs'], { stdio: 'inherit' })
      const kill = () => child.kill()
      process.on('exit', kill)
      process.on('SIGINT', () => { kill(); process.exit(0) })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), registryNode()],
  server: {
    port: 5199,
    strictPort: false,
    open: true,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true, ws: false },
    },
  },
})
